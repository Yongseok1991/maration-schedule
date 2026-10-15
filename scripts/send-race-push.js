import fs from "node:fs/promises";
import path from "node:path";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// 1. 환경변수 및 기본 설정
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ayvxlbnovvsdupxsotec.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_1lcq2IVZvi71rgHJrZMvVg_sUse0Vzp";

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BIQ5OZIg57Mx1C_OiXqVm0PwRS_xTTiJHPPHJrnsP0RzzvdBecxjE87XbgyDup3K6oCwuj0mPs5lnq_LFRzOiKI";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "VeiNl2OcGg6V5l_8tbQOdHZHgvp8Pif5y1mJGtnJep8";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:dobest0998@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. KST 오늘 날짜 구하기 (YYYY-MM-DD)
function getTodayKst() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

// 두 날짜(YYYY-MM-DD) 사이의 날짜 차이 (targetDate - fromDate)
function diffInDays(targetDateStr, fromDateStr) {
  const [y1, m1, d1] = targetDateStr.split("-").map(Number);
  const [y2, m2, d2] = fromDateStr.split("-").map(Number);
  const ut1 = Date.UTC(y1, m1 - 1, d1);
  const ut2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((ut1 - ut2) / (1000 * 60 * 60 * 24));
}

async function main() {
  const todayKst = getTodayKst();
  console.log(`==================================================`);
  console.log(`🔔 [RACEBOOK Push Engine] 실행 시작`);
  console.log(`📅 KST 기준 오늘 날짜: ${todayKst}`);
  console.log(`==================================================`);

  // 1. races.json 로드
  const racesFilePath = path.resolve("public/data/races.json");
  let raceMap = new Map();
  try {
    const rawRaces = await fs.readFile(racesFilePath, "utf8");
    const parsed = JSON.parse(rawRaces);
    const races = Array.isArray(parsed?.races) ? parsed.races : [];
    for (const r of races) {
      if (r.id) raceMap.set(String(r.id), r);
    }
    console.log(`[1] races.json 로드 완료: 총 ${raceMap.size}개 대회 인덱싱`);
  } catch (err) {
    console.error(`❌ races.json 로드 실패:`, err.message);
    process.exit(1);
  }

  // 2. Supabase에서 접수 완료(registered) 또는 준비중(training) 대회 일정 조회
  const { data: entries, error: entriesErr } = await supabase
    .from("user_races")
    .select("user_id, race_id, status, name, date_iso")
    .in("status", ["registered", "training"]);

  if (entriesErr) {
    console.error("❌ user_races 조회 실패:", entriesErr.message);
    process.exit(1);
  }

  console.log(`[2] 접수/준비중인 참가 일정: 총 ${entries?.length || 0}건 조회`);

  if (!entries || entries.length === 0) {
    console.log("알림 대상 일정이 없습니다. 종료합니다.");
    return;
  }

  // 3. 오늘 날짜 기준 D-7, D-3, D-1 대상자 판별
  const targets = [];
  for (const entry of entries) {
    const race = entry.race_id ? raceMap.get(String(entry.race_id)) : null;
    const raceDate = entry.date_iso || race?.date_iso;
    const raceName = entry.name || race?.name || "마라톤 대회";

    if (!raceDate || !/^\d{4}-\d{2}-\d{2}$/.test(raceDate)) continue;

    const daysLeft = diffInDays(raceDate, todayKst);

    let dDayType = null;
    let pushTitle = "";
    let pushBody = "";

    if (daysLeft === 7) {
      dDayType = "D-7";
      pushTitle = `🏃 [${raceName}] 일주일 전! (D-7)`;
      pushBody = `대회가 일주일 앞으로 다가왔습니다. 무리한 장거리보다는 가벼운 조깅과 영양 보충으로 컨디션을 조절하세요!`;
    } else if (daysLeft === 3) {
      dDayType = "D-3";
      pushTitle = `⚡ [${raceName}] 3일 전! (D-3)`;
      pushBody = `배번호, 러닝화, 에너지젤 등 필수 준비물을 점검하고 탄수화물 로딩을 서서히 시작하세요!`;
    } else if (daysLeft === 1) {
      dDayType = "D-1";
      pushTitle = `🔥 내일은 [${raceName}] 결전의 날! (D-1)`;
      pushBody = `출발 시간과 대회장 위치를 확인하고, 충분한 수면으로 최상의 컨디션을 만드세요. 완주를 응원합니다!`;
    }

    if (dDayType) {
      targets.push({
        userId: entry.user_id,
        raceId: String(entry.race_id),
        raceName,
        dDayType,
        daysLeft,
        pushTitle,
        pushBody
      });
    }
  }

  console.log(`[3] D-Day 조건 부합 알림 대상: 총 ${targets.length}건`);

  if (targets.length === 0) {
    console.log("오늘 발송할 D-7, D-3, D-1 대상 대회가 없습니다. 작업을 완료합니다.");
    return;
  }

  // 4. 발송 및 중복 체크
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const target of targets) {
    // 4-1. 중복 발송 여부 확인 (push_logs)
    const { data: existingLog } = await supabase
      .from("push_logs")
      .select("id")
      .eq("user_id", target.userId)
      .eq("race_id", target.raceId)
      .eq("d_day_type", target.dDayType)
      .maybeSingle();

    if (existingLog) {
      console.log(`  - [SKIP] 이미 발송됨: 유저(${target.userId.slice(0, 8)}) / 대회(${target.raceName}) / ${target.dDayType}`);
      skippedCount++;
      continue;
    }

    // 4-2. 해당 유저의 기기별 푸시 구독 토큰 조회
    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", target.userId);

    if (subErr || !subs || subs.length === 0) {
      console.log(`  - [SKIP] 푸시 구독 토큰 없음: 유저(${target.userId.slice(0, 8)})`);
      skippedCount++;
      continue;
    }

    const payload = JSON.stringify({
      title: target.pushTitle,
      body: target.pushBody,
      url: `./#mine`,
      raceId: target.raceId,
      tag: `race-${target.raceId}-${target.dDayType}`
    });

    let anySuccess = false;

    // 4-3. 각 기기로 푸시 발송
    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        anySuccess = true;
      } catch (pushErr) {
        // 410 Gone 또는 404 Not Found는 만료된 구독이므로 DB에서 자동 삭제
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          console.warn(`    ⚠️ 만료된 푸시 구독 토큰 자동 정리 (HTTP ${pushErr.statusCode})`);
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else {
          console.error(`    ❌ 푸시 발송 실패:`, pushErr.message);
        }
      }
    }

    // 4-4. 최소 1대 이상 발송 성공 시 중복 방지 로그 기록
    if (anySuccess) {
      await supabase.from("push_logs").insert({
        user_id: target.userId,
        race_id: target.raceId,
        d_day_type: target.dDayType
      });
      console.log(`  ✅ [발송 성공] ${target.dDayType} 푸시 전송 완료: ${target.raceName}`);
      sentCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`==================================================`);
  console.log(`📊 푸시 발송 결과 요약:`);
  console.log(`  - 성공: ${sentCount}건`);
  console.log(`  - 건너뜀 (이미 발송 또는 토큰 없음): ${skippedCount}건`);
  console.log(`  - 실패: ${failedCount}건`);
  console.log(`==================================================`);
}

main().catch((err) => {
  console.error("❌ 푸시 엔진 실행 중 예외 발생:", err);
  process.exit(1);
});
