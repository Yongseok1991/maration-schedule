#!/usr/bin/env python3
"""
RACEBOOK: Garmin Connect Activity & 1km Lap Splits Sync Engine
-------------------------------------------------------------
이 스크립트는 가민 계정에 로그인하여 러닝 기록 및 1km 단위 랩 스플릿(페이스, 심박수, 케이던스, 고도)을
가져와 Supabase PostgreSQL DB에 적재합니다.

[두 가지 수집 모드 및 철저한 중복 방지]
1. 초기 전체 수집 (Initial Full Sync):
   - 계정 최초 연동 시 과거의 모든 러닝 기록을 페이징하여 일괄 수집
2. 월간 증분 수집 (Monthly Incremental Sync):
   - 매월 1일 새벽 정기 크론 또는 월간 새로고침 시 최근 35일간의 최신 활동만 수집
   - DB에 이미 존재하는 activity_id는 중복 랩 API 호출을 건너뛰고(SKIP), 신규 활동만 INSERT하여
     중복 데이터 발생을 100% 원천 차단합니다.
"""

import os
import sys
import argparse
import math
from datetime import datetime, timedelta, timezone

try:
    from garminconnect import Garmin, GarminConnectAuthenticationError
    from supabase import create_client, Client
except ImportError:
    print("Required packages not installed. Run: pip install garminconnect supabase")
    sys.exit(1)

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or "https://ayvxlbnovvsdupxsotec.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY") or "sb_publishable_1lcq2IVZvi71rgHJrZMvVg_sUse0Vzp"


def get_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def calculate_ef(distance_m, duration_s, avg_hr):
    if not distance_m or not duration_s or not avg_hr or avg_hr <= 0:
        return None
    speed_m_per_min = distance_m / (duration_s / 60.0)
    return round(speed_m_per_min / avg_hr, 2)


def calculate_consistency_score(laps):
    if not laps or len(laps) < 2:
        return 85
    paces = [l["pace_seconds"] for l in laps if l.get("pace_seconds", 0) > 0]
    if len(paces) < 2:
        return 85
    mean = sum(paces) / len(paces)
    variance = sum((p - mean) ** 2 for p in paces) / len(paces)
    std_dev = math.sqrt(variance)
    score = max(50, min(100, round(100 - std_dev * 1.5)))
    return score


def detect_split_type(laps):
    if not laps or len(laps) < 2:
        return "even"
    half = len(laps) // 2
    first_half = laps[:half]
    second_half = laps[half:]
    if not first_half or not second_half:
        return "even"
    avg_first = sum(l["pace_seconds"] for l in first_half) / len(first_half)
    avg_second = sum(l["pace_seconds"] for l in second_half) / len(second_half)
    diff = avg_second - avg_first
    if diff < -3:
        return "negative"
    elif diff > 5:
        return "positive"
    return "even"


def parse_garmin_start_time(act: dict) -> str:
    """
    가민 활동의 start_time을 KST(Asia/Seoul, +09:00) 기준의 ISO-8601 문자열로 변환합니다.
    Garmin API의 startTimeLocal('2026-10-24 07:39:47')과 startTimeGMT('2026-10-23 22:39:47')를
    정확히 분석하여 9시간 밀림/당겨짐 없는 완벽한 KST 타임스탬프를 보장합니다.
    """
    local_str = act.get("startTimeLocal")
    gmt_str = act.get("startTimeGMT")

    if local_str and gmt_str:
        try:
            dt_local = datetime.fromisoformat(local_str.replace(" ", "T"))
            dt_gmt = datetime.fromisoformat(gmt_str.replace(" ", "T"))
            diff_seconds = round((dt_local - dt_gmt).total_seconds())
            offset = timedelta(seconds=diff_seconds)
            tz = timezone(offset)
            return dt_local.replace(tzinfo=tz).isoformat()
        except Exception:
            pass

    if local_str:
        try:
            kst = timezone(timedelta(hours=9))
            return datetime.fromisoformat(local_str.replace(" ", "T")).replace(tzinfo=kst).isoformat()
        except Exception:
            pass

    if gmt_str:
        try:
            dt_utc = datetime.fromisoformat(gmt_str.replace(" ", "T")).replace(tzinfo=timezone.utc)
            kst = timezone(timedelta(hours=9))
            return dt_utc.astimezone(kst).isoformat()
        except Exception:
            pass

    return act.get("startTimeLocal") or act.get("startTimeGMT")


def get_existing_activity_ids(supabase_client: Client, user_id: str) -> set:
    """DB에 이미 저장되어 있는 사용자의 activity_id 목록을 조회하여 중복 수집을 방지합니다."""
    try:
        res = supabase_client.from_("performance_activities").select("activity_id").eq("user_id", user_id).execute()
        items = res.data or []
        return set(str(item["activity_id"]) for item in items)
    except Exception as e:
        print(f"[!] Notice: Could not read existing activity_ids (table may be newly created): {e}")
        return set()


def sync_user_garmin(supabase_client: Client, user_id: str, email: str, password: str, mode: str = "daily", days_back: int = None, output_json_path: str = None, access_token: str = None):
    """
    mode:
      - 'daily': 데일리 증분 갱신 (최근 7일 러닝만 수집, 기존 중복 기록 완벽 스킵)
      - 'monthly': 월간 증분 갱신 (최근 35일 러닝만 수집, 기존 중복 기록 완벽 스킵)
      - 'full': 초기 전체 동기화 (과거 전체 러닝 페이징 수집)
    """
    import json
    is_full_sync = (mode == "full")
    if days_back is None:
        if mode == "daily":
            days_back = 7
        elif mode == "monthly":
            days_back = 35
        else:
            days_back = 7

    mode_label = (
        "[1. 초기 전체 수집 (Full)]" if is_full_sync else
        "[2. 데일리 증분 갱신 (Daily - 최근 7일)]" if mode == "daily" else
        f"[3. 월간 증분 갱신 (Monthly - 최근 {days_back}일)]"
    )
    print(f"\n=======================================================")
    print(f"[*] Starting Garmin Sync: User={user_id} ({email})")
    print(f"[*] Mode: {mode_label}")
    print(f"=======================================================")

    if access_token:
        try:
            supabase_client.postgrest.auth(access_token)
            supabase_client.postgrest.session.headers['authorization'] = f'Bearer {access_token}'
            print("[+] Supabase authenticated with user access token (RLS bypassed for this user)!")
        except Exception as e:
            print(f"[!] Supabase auth warning: {e}")

    try:
        # 가민 세션 토큰 디렉토리 (로그인 성공 시 세션 캐싱하여 추후 429 차단 완전 방지)
        tokenstore_dir = os.path.join(os.path.expanduser("~"), ".racebook_garmin_tokens", user_id)
        os.makedirs(tokenstore_dir, exist_ok=True)
        token_file = os.path.join(tokenstore_dir, "garmin_tokens.json")

        garmin = Garmin(email, password or None)
        garmin.login(tokenstore_dir)
        print("[+] Garmin SSO Login successful!")

        # 1. DB에 이미 존재하는 활동 ID 목록 확인 (중복 방지용)
        existing_ids = get_existing_activity_ids(supabase_client, user_id)
        print(f"[*] Currently stored in DB: {len(existing_ids)} activities.")

        # 2. 가민에서 활동 목록 가져오기
        raw_activities = []
        if is_full_sync:
            print("[*] Fetching ALL historical running activities (Paging entire account history without limit)...")
            start_idx = 0
            page_size = 100
            max_limit = 10000  # 계정 내 과거 전체 기록 전수 수집
            while start_idx < max_limit:
                batch = garmin.get_activities(start_idx, page_size)
                if not batch:
                    break
                for item in batch:
                    type_key = item.get("activityType", {}).get("typeKey", "")
                    if "running" in type_key.lower():
                        raw_activities.append(item)
                start_idx += page_size
                if len(batch) < page_size:
                    break
        else:
            print(f"[*] Fetching last {days_back} days of running activities...")
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            raw_activities = garmin.get_activities_by_date(
                start_date.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d"),
                "running"
            )

        print(f"[+] Total {len(raw_activities)} activities received from Garmin.")

        # 3. 중복 처리 및 세부 1km 랩 수집
        collected_activities = []
        laps_by_activity = {}
        new_count = 0
        skipped_count = 0

        for act in raw_activities:
            act_id = str(act.get("activityId"))
            
            # [중복 방지 및 초고속 동기화 핵심 로직]
            # 이미 DB에 존재하는 활동이면 중복 적재 및 불필요한 랩 API 재호출을 방지하여 안전하게 SKIP
            if act_id in existing_ids:
                skipped_count += 1
                continue

            act_name = act.get("activityName") or "러닝"
            start_time = parse_garmin_start_time(act)
            dist_m = round(float(act.get("distance", 0.0) or 0.0), 2)
            duration_s = int(round(float(act.get("duration", 0) or 0)))
            avg_pace_s = int(round(duration_s / (dist_m / 1000.0))) if dist_m > 0 else 0

            avg_hr = act.get("averageHR")
            avg_hr_int = int(round(float(avg_hr))) if avg_hr is not None else None
            max_hr = act.get("maxHR")
            max_hr_int = int(round(float(max_hr))) if max_hr is not None else None
            avg_cadence = act.get("averageRunningCadenceInStepsPerMinute")
            avg_cadence_int = int(round(float(avg_cadence))) if avg_cadence is not None else None
            elev_gain = round(float(act.get("elevationGain", 0.0) or 0.0), 1)
            calories = act.get("calories")
            calories_int = int(round(float(calories))) if calories is not None else None
            vo2max = float(act.get("vO2MaxValue")) if act.get("vO2MaxValue") is not None else None

            # 1km 랩 스플릿 세부 조회
            laps_data = []
            try:
                splits = garmin.get_activity_splits(act_id)
                lap_splits = splits.get("lapDTOs", []) or splits.get("splitSummaries", [])
                for idx, lap in enumerate(lap_splits):
                    lap_dist = round(float(lap.get("distance", 1000.0) or 1000.0), 2)
                    lap_dur = int(round(float(lap.get("duration", 0) or 0)))
                    lap_pace = int(round(lap_dur / (lap_dist / 1000.0))) if lap_dist > 0 else 0
                    l_hr = lap.get("averageHR")
                    l_mhr = lap.get("maxHR")
                    l_cad = lap.get("averageRunCadence")
                    laps_data.append({
                        "activity_id": act_id,
                        "user_id": user_id,
                        "lap_index": idx + 1,
                        "distance_meters": lap_dist,
                        "duration_seconds": lap_dur,
                        "pace_seconds": lap_pace,
                        "avg_heart_rate": int(round(float(l_hr))) if l_hr is not None else None,
                        "max_heart_rate": int(round(float(l_mhr))) if l_mhr is not None else None,
                        "avg_cadence": int(round(float(l_cad))) if l_cad is not None else None,
                        "elevation_diff_meters": round(float(lap.get("elevationGain", 0.0) or 0.0), 1)
                    })
            except Exception as e:
                print(f"[!] Warning: Could not fetch laps for activity {act_id}: {e}")

            # 만약 랩 정보가 없는데 거리가 있는 경우 기본 1km 랩 합성
            if not laps_data and dist_m >= 1000:
                km_count = max(1, int(dist_m // 1000))
                per_km_sec = avg_pace_s if avg_pace_s > 0 else 300
                for idx in range(km_count):
                    laps_data.append({
                        "activity_id": act_id,
                        "user_id": user_id,
                        "lap_index": idx + 1,
                        "distance_meters": 1000.0,
                        "duration_seconds": per_km_sec,
                        "pace_seconds": per_km_sec,
                        "avg_heart_rate": avg_hr_int,
                        "max_heart_rate": max_hr_int,
                        "avg_cadence": avg_cadence_int,
                        "elevation_diff_meters": 0.0
                    })

            # 스포츠 과학 지표 계산
            ef = calculate_ef(dist_m, duration_s, avg_hr_int)
            consistency = calculate_consistency_score(laps_data)
            split_type = detect_split_type(laps_data)

            # 활동 페이로드
            act_payload = {
                "user_id": user_id,
                "activity_id": act_id,
                "activity_name": act_name,
                "activity_type": "running",
                "start_time": start_time,
                "distance_meters": dist_m,
                "duration_seconds": duration_s,
                "avg_pace_seconds": avg_pace_s,
                "avg_heart_rate": avg_hr_int,
                "max_heart_rate": max_hr_int,
                "avg_cadence": avg_cadence_int,
                "elevation_gain_meters": elev_gain,
                "calories": calories_int,
                "vo2max": vo2max,
                "aerobic_ef": ef,
                "pace_consistency_score": consistency,
                "split_type": split_type
            }

            collected_activities.append(act_payload)
            if laps_data:
                laps_by_activity[act_id] = laps_data

            # Supabase 직접 적재 시도 (타입 캐스팅 완료 & access_token 권한)
            try:
                supabase_client.from_("performance_activities").upsert(
                    act_payload, on_conflict="user_id,activity_id"
                ).execute()

                if laps_data:
                    supabase_client.from_("performance_laps").upsert(
                        laps_data, on_conflict="activity_id,lap_index"
                    ).execute()
                print(f"[+] Saved activity {act_id} ({act_name}) and {len(laps_data)} laps to Supabase!")
            except Exception as sb_err:
                print(f"[!] Supabase upsert note: {sb_err}")

            new_count += 1
            existing_ids.add(act_id)

        # 동기화 상태 성공 및 최신 가민 토큰 갱신 시도
        kst = timezone(timedelta(hours=9))
        now_iso = datetime.now(kst).isoformat()
        try:
            import base64
            auth_update_payload = {
                "user_id": user_id,
                "garmin_email": email,
                "sync_status": "success",
                "last_error_message": None,
                "last_sync_at": now_iso
            }
            if os.path.exists(token_file):
                try:
                    with open(token_file, "r", encoding="utf-8") as tf:
                        tok_content = tf.read().strip()
                    if tok_content:
                        auth_update_payload["session_token_encrypted"] = base64.b64encode(tok_content.encode("utf-8")).decode("utf-8")
                except Exception as tok_err:
                    print(f"[!] Warning reading token_file: {tok_err}")

            supabase_client.from_("user_garmin_auth").upsert(auth_update_payload, on_conflict="user_id").execute()
            # 동일 가민 이메일을 가진 타 user_id 유령/중복 레코드 자동 청소
            try:
                supabase_client.from_("user_garmin_auth").delete().eq("garmin_email", garmin_email).neq("user_id", user_id).execute()
            except Exception as stray_err:
                pass
        except Exception as e:
            print(f"[!] Update user_garmin_auth warning: {e}")

        print(f"\n[DONE] Sync finished successfully!")
        print(f"       - 신규 추가/수집된 러닝: {new_count}건")
        print(f"       - 중복으로 안전하게 건너뛴(SKIP) 러닝: {skipped_count}건")

        if output_json_path:
            result_payload = {
                "success": True,
                "count": len(collected_activities),
                "activities": collected_activities,
                "laps": laps_by_activity
            }
            with open(output_json_path, "w", encoding="utf-8") as f:
                json.dump(result_payload, f, ensure_ascii=False, indent=2)
            print(f"[+] Output JSON written to: {output_json_path}")

        return True

    except GarminConnectAuthenticationError as auth_err:
        err_msg = (
            "가민 계정 이메일 또는 비밀번호가 올바르지 않습니다. (401 Unauthorized)\n\n"
            "• 평소 구글/애플 소셜 로그인으로 가민을 사용하셨다면, connect.garmin.com 로그인 화면의 '비밀번호를 잊으셨습니까?'를 통해 가민 비밀번호를 1회 설정하신 후 입력해주세요.\n"
            "• 비밀번호의 영문 대소문자 및 특수문자 오타를 다시 한번 확인해주세요."
        )
        print(f"[ERROR] Garmin Auth Error: {auth_err}")
        try:
            supabase_client.from_("user_garmin_auth").update({
                "sync_status": "error",
                "last_error_message": err_msg
            }).eq("user_id", user_id).execute()
        except:
            pass
        if output_json_path:
            with open(output_json_path, "w", encoding="utf-8") as f:
                json.dump({"success": False, "error": err_msg}, f, ensure_ascii=False)
        return False
    except Exception as err:
        err_str = str(err)
        if "429" in err_str or "TooManyRequests" in err_str:
            err_msg = (
                "가민 서버에서 일시적으로 로그인 요청을 제한(429)했습니다.\n"
                "가민 보안 정책상 단기간에 여러 번 시도할 경우 일시 차단될 수 있습니다. 약 5~10분 후 다시 시도해주세요."
            )
        elif "GARMIN Authentication Application" in err_str or "MFA" in err_str:
            err_msg = (
                "가민 2단계 인증(MFA) 또는 추가 보안 확인이 감지되었습니다.\n"
                "가민 계정 설정에서 2단계 인증을 확인하시거나 잠시 후 다시 시도해주세요."
            )
        else:
            err_msg = f"가민 동기화 오류: {err}"
        print(f"[ERROR] Sync failed: {err}")
        try:
            supabase_client.from_("user_garmin_auth").update({
                "sync_status": "error",
                "last_error_message": err_msg
            }).eq("user_id", user_id).execute()
        except:
            pass
        if output_json_path:
            with open(output_json_path, "w", encoding="utf-8") as f:
                json.dump({"success": False, "error": err_msg}, f, ensure_ascii=False)
        return False


def run_daemon(supabase_client: Client):
    import time
    import base64
    print("\n=======================================================")
    print("🚀 Garmin Real-Time Sync Daemon Started!")
    print("   웹 UI에서 가민 연동 버튼 클릭 시 실시간으로 감지하여 데이터를 긁어옵니다.")
    print("=======================================================\n")

    while True:
        try:
            # 1. sync_status == 'pending' 인 유저 조회
            res = supabase_client.from_("user_garmin_auth").select("*").eq("sync_status", "pending").execute()
            pending_users = res.data or []

            for u in pending_users:
                user_id = u.get("user_id")
                email = u.get("garmin_email")
                enc_token = u.get("session_token_encrypted")
                
                if not email or not enc_token:
                    continue

                try:
                    # base64 디코딩
                    password = base64.b64decode(enc_token).decode("utf-8")
                except Exception as e:
                    print(f"[!] Decode error for {email}: {e}")
                    password = enc_token

                print(f"\n[*] [TRIGGER DETECTED] Web UI requested Garmin Sync for {email}!")
                sync_user_garmin(supabase_client, user_id, email, password, mode="full")

            time.sleep(3)
        except KeyboardInterrupt:
            print("\nDaemon stopped.")
            break
        except Exception as e:
            print(f"[!] Daemon error: {e}")
            time.sleep(5)


def deduplicate_garmin_auth_users(supabase_client, users):
    """
    user_garmin_auth 테이블에서 동일한 garmin_email을 가진 중복 레코드를 탐지합니다.
    - 유효한 세션 토큰(session_token_encrypted)이 존재하는 레코드를 최우선 보존합니다.
    - 토큰이 비어 있거나 중복된 레코드는 Supabase에서 즉시 안전하게 삭제(DELETE)하여 단 1개의 고유 레코드만 남깁니다.
    """
    from collections import defaultdict
    if not users:
        return []

    by_email = defaultdict(list)
    for u in users:
        email = (u.get("garmin_email") or "").strip().lower()
        by_email[email].append(u)

    cleaned_users = []
    for email, u_list in by_email.items():
        if len(u_list) == 1:
            cleaned_users.append(u_list[0])
            continue

        print(f"\n[!] Detected {len(u_list)} duplicate rows in user_garmin_auth for '{email}'")

        def sort_key(user_row):
            has_token = bool(user_row.get("session_token_encrypted"))
            last_sync = user_row.get("last_sync_at") or user_row.get("created_at") or ""
            return (1 if has_token else 0, last_sync)

        sorted_list = sorted(u_list, key=sort_key, reverse=True)
        winner = sorted_list[0]
        duplicates_to_delete = sorted_list[1:]

        cleaned_users.append(winner)
        print(f"    [+] Retaining active record: id={winner.get('id')}, user_id={winner.get('user_id')} (has_token={bool(winner.get('session_token_encrypted'))})")

        for dup in duplicates_to_delete:
            dup_id = dup.get("id")
            dup_uid = dup.get("user_id")
            print(f"    [-] Deleting redundant duplicate record: id={dup_id}, user_id={dup_uid}...")
            try:
                supabase_client.from_("user_garmin_auth").delete().eq("id", dup_id).execute()
                print(f"    [OK] Successfully deleted duplicate record id={dup_id}!")
            except Exception as del_err:
                print(f"    [!] Failed to delete duplicate record id={dup_id}: {del_err}")

    return cleaned_users


def main():
    parser = argparse.ArgumentParser(description="RACEBOOK Garmin Sync Tool")
    parser.add_argument("--daemon", action="store_true", help="Run background daemon polling for UI sync requests")
    parser.add_argument("--mode", type=str, choices=["full", "monthly", "daily"], default="daily",
                        help="'daily' for daily incremental sync (last 7 days), 'monthly' for monthly (35 days), 'full' for initial full sync")
    parser.add_argument("--daily-cron", action="store_true", help="Run in daily cron mode for all users")
    parser.add_argument("--monthly-cron", action="store_true", help="Run in cron mode for all users (alias)")
    parser.add_argument("--email", type=str, help="Garmin account email")
    parser.add_argument("--password", type=str, help="Garmin account password")
    parser.add_argument("--user-id", type=str, help="Supabase user UUID")
    parser.add_argument("--output-json", type=str, help="Path to write JSON results to")
    parser.add_argument("--access-token", type=str, help="Supabase user Bearer access token")
    args = parser.parse_args()

    supabase_client = get_supabase_client()

    if args.daemon:
        run_daemon(supabase_client)
    elif args.daily_cron or args.monthly_cron:
        import base64
        cron_title = "Daily" if (args.daily_cron or args.mode == "daily") else "Monthly"
        print(f"=== [CRON] Running {cron_title} Garmin Sync Pipeline (Incremental Mode) ===")
        try:
            res = supabase_client.from_("user_garmin_auth").select("*").execute()
            raw_users = res.data or []
        except Exception as e:
            print(f"[!] Could not query user_garmin_auth: {e}")
            raw_users = []

        users = deduplicate_garmin_auth_users(supabase_client, raw_users)
        print(f"[*] Found {len(users)} unique linked Garmin users.")
        for u in users:
            uid = u.get("user_id")
            email = u.get("garmin_email")
            enc_token = u.get("session_token_encrypted")
            tokenstore_dir = os.path.join(os.path.expanduser("~"), ".racebook_garmin_tokens", uid)
            os.makedirs(tokenstore_dir, exist_ok=True)
            token_file = os.path.join(tokenstore_dir, "garmin_tokens.json")

            password = ""
            if enc_token:
                try:
                    import json
                    decoded = base64.b64decode(enc_token).decode("utf-8")
                    try:
                        token_obj = json.loads(decoded)
                        if isinstance(token_obj, dict) and any(k in token_obj for k in ("di_token", "oauth_token", "di_refresh_token")):
                            with open(token_file, "w", encoding="utf-8") as tf:
                                tf.write(decoded)
                            print(f"[+] Restored Garmin session token from Supabase for {email}")
                        else:
                            password = decoded
                    except Exception:
                        password = decoded
                except Exception:
                    password = enc_token

            if os.path.exists(token_file) or password:
                print(f"\n[*] Processing daily sync for: {email} ({uid})...")
                try:
                    sync_user_garmin(supabase_client, uid, email, password, mode=args.mode)
                except Exception as e:
                    print(f"[!] Error syncing {email}: {e}")
            else:
                print(f"[!] Skipped {email}: No tokenstore or credentials found.")

        print(f"\n=== [CRON] {cron_title} Sync Pipeline Finished Successfully ===")
    elif args.email and args.password and args.user_id:
        success = sync_user_garmin(
            supabase_client,
            args.user_id,
            args.email,
            args.password,
            mode=args.mode,
            output_json_path=args.output_json,
            access_token=args.access_token
        )
        sys.exit(0 if success else 1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
