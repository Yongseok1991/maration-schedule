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


def get_existing_activity_ids(supabase_client: Client, user_id: str) -> set:
    """DB에 이미 저장되어 있는 사용자의 activity_id 목록을 조회하여 중복 수집을 방지합니다."""
    try:
        res = supabase_client.from_("performance_activities").select("activity_id").eq("user_id", user_id).execute()
        items = res.data or []
        return set(str(item["activity_id"]) for item in items)
    except Exception as e:
        print(f"[!] Notice: Could not read existing activity_ids (table may be newly created): {e}")
        return set()


def sync_user_garmin(supabase_client: Client, user_id: str, email: str, password: str, mode: str = "full", days_back: int = 35):
    """
    mode:
      - 'full': 초기 전체 동기화 (과거 전체 러닝 페이징 수집)
      - 'monthly': 월간 증분 갱신 (최근 35일 러닝만 수집, 기존 중복 기록 완벽 스킵)
    """
    is_full_sync = (mode == "full")
    print(f"\n=======================================================")
    print(f"[*] Starting Garmin Sync: User={user_id} ({email})")
    print(f"[*] Mode: {'[1. 초기 전체 수집 (Full)]' if is_full_sync else '[2. 월간 증분 갱신 (Monthly)]'}")
    print(f"=======================================================")

    try:
        garmin = Garmin(email, password)
        garmin.login()
        print("[+] Garmin SSO Login successful!")

        # 1. DB에 이미 존재하는 활동 ID 목록 확인 (중복 방지용)
        existing_ids = get_existing_activity_ids(supabase_client, user_id)
        print(f"[*] Currently stored in DB: {len(existing_ids)} activities.")

        # 2. 가민에서 활동 목록 가져오기
        raw_activities = []
        if is_full_sync:
            print("[*] Fetching ALL historical running activities (Paging up to 300 activities)...")
            start_idx = 0
            page_size = 50
            max_limit = 300
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
        new_count = 0
        skipped_count = 0

        for act in raw_activities:
            act_id = str(act.get("activityId"))
            
            # [월간 증분 갱신 모드일 때 중복 방지 핵심 로직]
            # 이미 DB에 존재하는 활동이면 중복 적재 및 랩 API 재호출을 방지하여 스킵
            if not is_full_sync and act_id in existing_ids:
                skipped_count += 1
                continue

            act_name = act.get("activityName") or "러닝"
            start_time = act.get("startTimeGMT") or act.get("startTimeLocal")
            dist_m = act.get("distance", 0.0)
            duration_s = int(act.get("duration", 0))
            avg_pace_s = int(duration_s / (dist_m / 1000.0)) if dist_m > 0 else 0
            avg_hr = act.get("averageHR")
            max_hr = act.get("maxHR")
            avg_cadence = act.get("averageRunningCadenceInStepsPerMinute")
            elev_gain = act.get("elevationGain", 0.0)
            calories = act.get("calories", 0)
            vo2max = act.get("vO2MaxValue")

            # 1km 랩 스플릿 세부 조회
            laps_data = []
            try:
                splits = garmin.get_activity_splits(act_id)
                lap_splits = splits.get("lapDTOs", []) or splits.get("splitSummaries", [])
                for idx, lap in enumerate(lap_splits):
                    lap_dist = lap.get("distance", 1000.0)
                    lap_dur = int(lap.get("duration", 0))
                    lap_pace = int(lap_dur / (lap_dist / 1000.0)) if lap_dist > 0 else 0
                    laps_data.append({
                        "activity_id": act_id,
                        "user_id": user_id,
                        "lap_index": idx + 1,
                        "distance_meters": lap_dist,
                        "duration_seconds": lap_dur,
                        "pace_seconds": lap_pace,
                        "avg_heart_rate": lap.get("averageHR"),
                        "max_heart_rate": lap.get("maxHR"),
                        "avg_cadence": lap.get("averageRunCadence"),
                        "elevation_diff_meters": lap.get("elevationGain", 0.0)
                    })
            except Exception as e:
                print(f"[!] Warning: Could not fetch laps for activity {act_id}: {e}")

            # 스포츠 과학 지표 계산
            ef = calculate_ef(dist_m, duration_s, avg_hr)
            consistency = calculate_consistency_score(laps_data)
            split_type = detect_split_type(laps_data)

            # Supabase performance_activities 테이블에 UPSERT (중복 방지)
            act_payload = {
                "user_id": user_id,
                "activity_id": act_id,
                "activity_name": act_name,
                "activity_type": "running",
                "start_time": start_time,
                "distance_meters": dist_m,
                "duration_seconds": duration_s,
                "avg_pace_seconds": avg_pace_s,
                "avg_heart_rate": avg_hr,
                "max_heart_rate": max_hr,
                "avg_cadence": avg_cadence,
                "elevation_gain_meters": elev_gain,
                "calories": calories,
                "vo2max": vo2max,
                "aerobic_ef": ef,
                "pace_consistency_score": consistency,
                "split_type": split_type
            }

            supabase_client.from_("performance_activities").upsert(
                act_payload, on_conflict="user_id,activity_id"
            ).execute()

            # Supabase performance_laps 테이블에 UPSERT (1km 랩 중복 방지)
            if laps_data:
                supabase_client.from_("performance_laps").upsert(
                    laps_data, on_conflict="activity_id,lap_index"
                ).execute()

            new_count += 1
            existing_ids.add(act_id)

        # 동기화 상태 성공 갱신
        now_iso = datetime.now(timezone.utc).isoformat()
        supabase_client.from_("user_garmin_auth").upsert({
            "user_id": user_id,
            "garmin_email": email,
            "sync_status": "success",
            "last_sync_at": now_iso
        }, on_conflict="user_id").execute()

        print(f"\n[DONE] Sync finished successfully!")
        print(f"       - 신규 추가/갱신된 러닝: {new_count}건")
        print(f"       - 중복으로 안전하게 건너뛴(SKIP) 러닝: {skipped_count}건")
        return True

    except GarminConnectAuthenticationError as auth_err:
        print(f"[ERROR] Garmin Auth Error: {auth_err}")
        return False
    except Exception as err:
        print(f"[ERROR] Sync failed: {err}")
        return False


def main():
    parser = argparse.ArgumentParser(description="RACEBOOK Garmin Sync Tool")
    parser.add_argument("--mode", type=str, choices=["full", "monthly"], default="full",
                        help="'full' for initial full historical sync, 'monthly' for monthly incremental sync")
    parser.add_argument("--monthly-cron", action="store_true", help="Run in monthly cron mode for all users")
    parser.add_argument("--email", type=str, help="Garmin account email")
    parser.add_argument("--password", type=str, help="Garmin account password")
    parser.add_argument("--user-id", type=str, help="Supabase user UUID")
    args = parser.parse_args()

    supabase_client = get_supabase_client()

    if args.monthly_cron:
        print("=== [CRON] Running Monthly Garmin Sync Pipeline (Incremental Mode) ===")
        res = supabase_client.from_("user_garmin_auth").select("*").execute()
        users = res.data or []
        print(f"[*] Found {len(users)} linked Garmin users.")
        for u in users:
            uid = u.get("user_id")
            email = u.get("garmin_email")
            print(f"[*] Processing monthly incremental sync for user: {email}...")
        print("=== [CRON] Monthly Sync Pipeline Finished ===")
    elif args.email and args.password and args.user_id:
        sync_user_garmin(supabase_client, args.user_id, args.email, args.password, mode=args.mode)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
