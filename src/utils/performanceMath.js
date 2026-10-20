/**
 * RACEBOOK 스포츠 과학 퍼포먼스 분석 수학 알고리즘 모듈
 * (LLM 없이 100% 순수 통계 및 스포츠 생리학 공식 기반 실시간 분석)
 */

// 1. 초 -> 'M:SS/km' 페이스 포맷 변환
export function formatPace(secondsPerKm) {
  if (!secondsPerKm || Number.isNaN(secondsPerKm) || secondsPerKm <= 0) return "-:--/km";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

// 2. 초 -> 'HH:MM:SS' 또는 'MM:SS' 시간 변환
export function formatDuration(totalSeconds) {
  if (!totalSeconds || Number.isNaN(totalSeconds) || totalSeconds <= 0) return "00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 3. 유산소 심폐 효율 지수 (Efficiency Factor, EF)
// 속도(m/min) / 평균 심박수(bpm)
export function calculateAerobicEF(distanceMeters, durationSeconds, avgHeartRate) {
  if (!distanceMeters || !durationSeconds || !avgHeartRate || avgHeartRate <= 0) return null;
  const speedMetersPerMin = distanceMeters / (durationSeconds / 60);
  const ef = speedMetersPerMin / avgHeartRate;
  return Number(ef.toFixed(2));
}

// 4. 1km 랩 기반 페이스 일관성 점수 (100점 만점)
export function calculatePaceConsistency(laps = []) {
  if (!laps || laps.length < 2) return 85;
  const paces = laps.map((l) => l.pace_seconds).filter((p) => p && p > 0);
  if (paces.length < 2) return 85;

  const mean = paces.reduce((a, b) => a + b, 0) / paces.length;
  const variance = paces.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / paces.length;
  const stdDev = Math.sqrt(variance); // 페이스 표준편차 (초)

  // 표준편차가 3초 이내면 98점, 10초면 85점, 25초 이상이면 65점
  const score = Math.max(50, Math.min(100, Math.round(100 - stdDev * 1.5)));
  return { score, stdDev: Number(stdDev.toFixed(1)) };
}

// 5. 전반 vs 후반 스플릿 타입 판별
export function detectSplitType(laps = []) {
  if (!laps || laps.length < 2) return { type: "even", diffSeconds: 0 };
  const half = Math.floor(laps.length / 2);
  const firstHalf = laps.slice(0, half);
  const secondHalf = laps.slice(half);

  const avgFirst = firstHalf.reduce((s, l) => s + l.pace_seconds, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, l) => s + l.pace_seconds, 0) / secondHalf.length;

  const diff = avgSecond - avgFirst; // 양수: 후반이 느림(Positive), 음수: 후반이 빠름(Negative)

  if (diff < -3) {
    return { type: "negative", label: "네거티브 스플릿 (후반 가속형)", diffSeconds: Math.abs(Math.round(diff)) };
  }
  if (diff > 5) {
    return { type: "positive", label: "파지티브 스플릿 (초반 질주형)", diffSeconds: Math.round(diff) };
  }
  return { type: "even", label: "이븐 페이스 (안정적 속도 유지)", diffSeconds: Math.abs(Math.round(diff)) };
}

// 6. Pete Riegel 공식 기반 마라톤 예상 완주 시간 예측
// T2 = T1 * (D2 / D1)^1.06
export function predictRaceTimes(sampleDistanceMeters, sampleDurationSeconds) {
  if (!sampleDistanceMeters || !sampleDurationSeconds || sampleDistanceMeters < 3000) {
    return null;
  }

  const predictTime = (targetDistMeters) => {
    const predictedSec = sampleDurationSeconds * Math.pow(targetDistMeters / sampleDistanceMeters, 1.06);
    return formatDuration(predictedSec);
  };

  return {
    fiveK: predictTime(5000),
    tenK: predictTime(10000),
    half: predictTime(21097.5),
    full: predictTime(42195)
  };
}

// 7. 룰 기반 스마트 분석 리포트 자동 생성기 (LLM 대체 순수 팩트 리포트)
export function generateSmartReport(activity, laps = []) {
  if (!activity) return null;

  const consistency = calculatePaceConsistency(laps);
  const split = detectSplitType(laps);
  const distKm = (activity.distance_meters / 1000).toFixed(1);
  const avgPace = formatPace(activity.avg_pace_seconds);
  const avgHr = activity.avg_heart_rate ? `${activity.avg_heart_rate} bpm` : null;

  const reportItems = [];

  // 페이스 일관성 평가
  if (consistency.score >= 90) {
    reportItems.push({
      badge: "🎯 페이스 마스터",
      color: "emerald",
      text: `1km별 페이스 편차가 ±${consistency.stdDev}초로 페이스메이커 수준의 완벽한 일관성(점수: ${consistency.score}점)을 유지했습니다.`
    });
  } else if (consistency.score >= 78) {
    reportItems.push({
      badge: "⚖️ 안정적 페이스",
      color: "amber",
      text: `전체 구간에서 준수한 속도 배분(점수: ${consistency.score}점)을 보여주었으며 구간 편차는 약 ${consistency.stdDev}초였습니다.`
    });
  } else {
    reportItems.push({
      badge: "⚠️ 페이스 기복 주의",
      color: "rose",
      text: `구간별 페이스 편차(±${consistency.stdDev}초)가 다소 큽니다. 초반 오버페이스를 자제하고 일정한 페이스 유지를 권장합니다.`
    });
  }

  // 스플릿 분석 평가
  if (split.type === "negative") {
    reportItems.push({
      badge: "🔥 후반 가속 (Negative Split)",
      color: "emerald",
      text: `후반부 페이스가 전반부보다 평균 ${split.diffSeconds}초/km 더 빨랐습니다. 마라톤에 가장 이상적인 에너지 안배를 달성했습니다.`
    });
  } else if (split.type === "positive") {
    reportItems.push({
      badge: "📉 후반 처짐 (Positive Split)",
      color: "amber",
      text: `후반부 페이스가 전반부보다 ${split.diffSeconds}초/km 느려졌습니다. 체력 고갈을 막기 위해 초반 빌드업 전략을 추천합니다.`
    });
  } else {
    reportItems.push({
      badge: "📐 흔들림 없는 이븐 페이스",
      color: "sky",
      text: `전반과 후반의 페이스 차이가 거의 없는 균일한 달리기(이븐 페이스)로 에너지 소모를 최소화했습니다.`
    });
  }

  // 심폐 효율 평가
  if (activity.aerobic_ef) {
    reportItems.push({
      badge: "💓 심폐 유산소 효율",
      color: "indigo",
      text: `유산소 효율 지수(EF)는 ${activity.aerobic_ef}입니다. 심박수 대비 스피드 효율이 안정적인 유산소 구간에서 유지되었습니다.`
    });
  }

  // 마라톤 대회 예상 완주 시간 연계
  const predictions = predictRaceTimes(activity.distance_meters, activity.duration_seconds);

  return {
    title: `${activity.activity_name || "러닝"} 퍼포먼스 리포트`,
    distKm,
    avgPace,
    avgHr,
    consistencyScore: consistency.score,
    splitType: split.label,
    reportItems,
    predictions
  };
}

// 8. KST 기준 날짜(YYYY-MM-DD) 추출 헬퍼 (가민 start_time UTC -> 한국 시간)
export function getActivityKstDate(startTime) {
  if (!startTime) return "";

  if (typeof startTime === "string") {
    const trimmed = startTime.trim();
    if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      // 'Z', '+', 'GMT' 등이 붙은 UTC 시간은 KST(Asia/Seoul)로 변환
      if (trimmed.endsWith("Z") || trimmed.includes("+") || trimmed.includes("GMT")) {
        const d = new Date(trimmed);
        if (!Number.isNaN(d.getTime())) {
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }).format(d);
        }
      }
      // 타임존 없는 로컬 시간(예: '2026-04-18 07:32:24' 또는 '2026-04-18T07:32:24')은 이미 로컬 KST 날짜
      return trimmed.slice(0, 10);
    }
  }

  const d = new Date(startTime);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

// 8-1. KST 기준 시(0~23 hour) 추출 헬퍼 (오전 대회 vs 저녁 일반 조깅 구분용)
export function getActivityKstHour(startTime) {
  if (!startTime) return null;
  try {
    if (typeof startTime === "string") {
      const trimmed = startTime.trim();
      if (!trimmed.endsWith("Z") && !trimmed.includes("+") && !trimmed.includes("GMT")) {
        const timePart = trimmed.split(/[ T]/)[1];
        if (timePart) {
          const hour = parseInt(timePart.split(":")[0], 10);
          if (!Number.isNaN(hour)) return hour;
        }
      }
    }
    const d = new Date(startTime);
    if (!Number.isNaN(d.getTime())) {
      const hourStr = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Seoul",
        hour: "numeric",
        hourCycle: "h23"
      }).format(d);
      const h = parseInt(hourStr, 10);
      return Number.isNaN(h) ? null : h;
    }
  } catch (e) {
    return null;
  }
  return null;
}

// 9. 러닝 거리와 대회 종목 거리 매칭 판별기 (엄격한 코스 규격 적용)
export function isDistanceMatchingRace(distMeters, raceDistancesStr = "") {
  const km = (Number(distMeters) || 0) / 1000;
  if (km <= 0) return false;
  const dStr = (raceDistancesStr || "").toLowerCase();

  // 하프 코스 (19.5km ~ 23.5km)
  if (km >= 19.5 && km <= 23.5) {
    if (dStr.includes("하프") || dStr.includes("half") || dStr.includes("21")) return true;
  }
  // 10K 코스 (8.8km ~ 11.5km)
  if (km >= 8.8 && km <= 11.5) {
    if (dStr.includes("10k") || dStr.includes("10km") || dStr.includes("10")) return true;
  }
  // 풀코스 (40.0km ~ 44.0km)
  if (km >= 40.0 && km <= 44.0) {
    if (dStr.includes("풀") || dStr.includes("full") || dStr.includes("42")) return true;
  }
  // 5K 코스 (4.5km ~ 5.8km)
  if (km >= 4.5 && km <= 5.8) {
    if (dStr.includes("5k") || dStr.includes("5km") || dStr.includes("5")) return true;
  }
  // 3K 코스 (2.7km ~ 3.5km)
  if (km >= 2.7 && km <= 3.5) {
    if (dStr.includes("3k") || dStr.includes("3km") || dStr.includes("3")) return true;
  }

  // 대회 종목 텍스트가 비어 있는 경우에도 마라톤 표준 거리(하프/풀/10K)에 부합할 때만 허용
  if (!dStr) {
    return (km >= 40.0 && km <= 44.0) || (km >= 19.5 && km <= 23.5) || (km >= 8.8 && km <= 11.5);
  }

  return false;
}

// 10. 가민 러닝 활동과 '나의 마라톤(user_races)' 등록 일정 1:1 스마트 자동 매칭
export function findMatchedUserRace(activity, userRaces = []) {
  if (!activity || !Array.isArray(userRaces) || userRaces.length === 0) return null;

  const actDate = getActivityKstDate(activity.start_time);
  const actHour = getActivityKstHour(activity.start_time);
  const km = (Number(activity.distance_meters) || 0) / 1000;

  // 1. 이미 user_race_id로 연결된 대회가 있는 경우
  // 단, 사용자의 수동 강제 오버라이드가 아닌 경우, 활동 일자와 대회 일자가 현저히 다르면(주말 ±2일 초과) 오매칭 무시
  if (activity.user_race_id) {
    const directMatch = userRaces.find((r) => r.entryId === activity.user_race_id || r.id === activity.user_race_id);
    if (directMatch) {
      if (activity.manual_override === true) {
        return directMatch;
      }
      if (directMatch.dateIso && actDate) {
        const diffDays = Math.abs((new Date(actDate).getTime() - new Date(directMatch.dateIso).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 2) {
          return directMatch;
        }
      }
    }
  }

  if (!actDate) return null;

  // 2. KST 당일(exact) 일치 대회가 있는지 검색
  const exactMatches = userRaces.filter((r) => r.dateIso === actDate);

  if (exactMatches.length > 0) {
    // 1순위: 사용자가 '나의 마라톤'에서 직접 신청/선택한 종목(raceType)과 활동 거리가 정확히 부합하는 대회 (완주)
    // (예: 키움런 10k 신청 유저가 저녁에 뛴 5km 조깅은 10k raceType과 불일치하므로 오인 완주 매칭 차단)
    const raceTypeMatch = exactMatches.find((r) => {
      if (!r.raceType) return false;
      const rt = r.raceType.toLowerCase();
      if ((rt === "full" || rt.includes("풀")) && km >= 40.0) return true;
      if ((rt === "half" || rt.includes("하프")) && km >= 19.5 && km <= 23.5) return true;
      if ((rt === "10k" || rt.includes("10")) && km >= 8.8 && km <= 11.5) return true;
      if ((rt === "5k" || rt.includes("5")) && km >= 4.5 && km <= 5.8) return true;
      return false;
    });
    if (raceTypeMatch) return raceTypeMatch;

    // 2순위: raceType이 미지정된 대회에 한해 코스 거리(distances)와 엄격히 일치하는 활동 (완주)
    const distMatch = exactMatches.find((r) => !r.raceType && isDistanceMatchingRace(activity.distance_meters, r.distances));
    if (distMatch) return distMatch;

    // 3순위: 당일 대회 참가 중 미완주(DNF) 매칭
    // - 마라톤 대회는 보통 오전 시간대(05:00 ~ 13:59)에 진행됩니다.
    // - 저녁 조깅(예: 18:00, 19:22 등)이나 1~2km 수준의 단순 웜업은 DNF로 오인하지 않도록 방어합니다.
    const isMorningRaceTime = actHour === null || (actHour >= 5 && actHour < 14);

    if (isMorningRaceTime) {
      // 3-1: 신청 종목(raceType) 기준 DNF (목표 거리의 일정 수준 이상 달렸으나 완주선에 못 미친 경우)
      // - 풀코스(42.195km): 10km 이상 40km 미만 (예: 경주마라톤 풀코스 신청 후 21.21km 지점 DNF)
      // - 하프(21.0975km): 5km 이상 19.5km 미만 (예: 강남국제평화마라톤 하프 신청 후 12.52km 지점 DNF)
      // - 10K(10km): 3.5km 이상 8.8km 미만
      // - 5K(5km): 2.0km 이상 4.5km 미만
      const dnfRaceTypeMatch = exactMatches.find((r) => {
        if (!r.raceType) return false;
        const rt = r.raceType.toLowerCase();
        if ((rt === "full" || rt.includes("풀")) && km >= 10.0 && km < 40.0) return true;
        if ((rt === "half" || rt.includes("하프")) && km >= 5.0 && km < 19.5) return true;
        if ((rt === "10k" || rt.includes("10")) && km >= 3.5 && km < 8.8) return true;
        if ((rt === "5k" || rt.includes("5")) && km >= 2.0 && km < 4.5) return true;
        return false;
      });
      if (dnfRaceTypeMatch) return dnfRaceTypeMatch;

      // 3-2: raceType 미지정 대회 중 코스 텍스트(distances)에 코스가 명시되어 있고 DNF 거리인 경우
      const dnfDistMatch = exactMatches.find((r) => {
        if (r.raceType) return false;
        const dStr = (r.distances || "").toLowerCase();
        if ((dStr.includes("풀") || dStr.includes("full")) && km >= 10.0 && km < 40.0) return true;
        if ((dStr.includes("하프") || dStr.includes("half")) && km >= 5.0 && km < 19.5) return true;
        if ((dStr.includes("10k") || dStr.includes("10km")) && km >= 3.5 && km < 8.8) return true;
        if ((dStr.includes("5k") || dStr.includes("5km")) && km >= 2.0 && km < 4.5) return true;
        return false;
      });
      if (dnfDistMatch) return dnfDistMatch;
    }

    // 당일 대회가 있더라도, 러닝 거리가 신청 코스나 표준 대회 거리/DNF 조건에 맞지 않으면(워밍업, 조깅) 매칭하지 않음
    return null;
  }

  // 3. 당일 일치는 없지만, 대회 등록일과 토/일 주말 오차(±1일) 범위인 경우
  // (주의: 날짜가 다를 때는 가민 활동명이 단순 '러닝'인 경우 오매칭을 원천 차단하고, 대회 고유명이 부합할 때만 매칭)
  const actDateObj = new Date(actDate);
  if (!Number.isNaN(actDateObj.getTime())) {
    const nearbyMatches = userRaces.filter((r) => {
      if (!r.dateIso) return false;
      const rDateObj = new Date(r.dateIso);
      if (Number.isNaN(rDateObj.getTime())) return false;
      const diffDays = Math.abs((actDateObj.getTime() - rDateObj.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 1;
    });

    if (nearbyMatches.length > 0) {
      const actName = (activity.activity_name || "").toLowerCase().replace(/\s+/g, "");
      const isGenericActName = !actName || actName === "러닝" || actName === "running" || actName === "달리기";

      // 날짜가 다를 때는 가민 활동명이 단순 '러닝'인 경우 오매칭 원천 차단!
      if (!isGenericActName || activity.is_race === true || activity.event_type === "race") {
        const nearbyMatch = nearbyMatches.find((r) => {
          const rt = (r.raceType || "").toLowerCase();
          const distOk =
            (rt === "10k" && km >= 8.8 && km <= 11.5) ||
            (rt === "half" && km >= 19.5 && km <= 23.5) ||
            (rt === "full" && km >= 40.0) ||
            (!rt && isDistanceMatchingRace(activity.distance_meters, r.distances));

          const rName = (r.name || "").toLowerCase().replace(/\s+/g, "");
          const nameMatch =
            (actName && rName.includes(actName)) ||
            (actName && actName.includes(rName)) ||
            (rName.includes("겨울왕국") && actName.includes("겨울왕국")) ||
            (rName.includes("키움") && actName.includes("키움"));

          return nameMatch && distOk;
        });

        if (nearbyMatch) return nearbyMatch;
      }
    }
  }

  return null;
}

// 11. 대회(Race) 활동 판별 함수 (수동 지정 > 나의 마라톤 일정 매칭 > 가민 메타데이터 > 정밀 키워드)
export function isRaceActivity(activity, userRaces = []) {
  if (!activity) return false;

  // 1순위: 사용자가 명시적으로 일반 러닝으로 해제한 경우 (수동 오버라이드)
  if (activity.is_race === false && activity.manual_override === true) {
    return false;
  }

  // 2순위: 사용자가 직접 대회로 지정했거나 가민 메타데이터에서 race로 수신된 경우
  if (activity.is_race === true || activity.event_type === "race") {
    return true;
  }

  // 3순위: '나의 마라톤' 등록 일정과의 날짜 & 거리 1:1 자동 매칭 (핵심)
  if (Array.isArray(userRaces) && userRaces.length > 0) {
    const matched = findMatchedUserRace(activity, userRaces);
    if (matched) return true;
  }

  // 4순위: 명확하고 엄격한 고유 대회 키워드 패턴 (오탐 원인이던 'run ', '런(' 삭제)
  const rawName = activity.activity_name || "";
  const name = rawName.toLowerCase();

  const strictRaceKeywords = [
    "대회", "마라톤", "marathon", "race", "레이스",
    "풀코스", "하프마라톤", "10k마라톤", "21k마라톤",
    "jtbc", "동마", "춘마", "제마", "손기정", "송도마라톤"
  ];

  const hasStrictKeyword = strictRaceKeywords.some((k) => name.includes(k));
  if (hasStrictKeyword) {
    // 트레드밀, 실내 조깅 제외
    if (name.includes("트레드밀") || name.includes("treadmill") || name.includes("indoor")) {
      return false;
    }
    return true;
  }

  return false;
}

// 12. 활동 표시 타이틀 반환 (매칭된 대회명이 있으면 대회명 우선 표출)
export function getActivityDisplayName(activity, userRaces = []) {
  if (!activity) return "러닝";
  if (activity.race_name) return activity.race_name;

  if (Array.isArray(userRaces) && userRaces.length > 0) {
    const matched = findMatchedUserRace(activity, userRaces);
    if (matched && matched.name) return matched.name;
  }

  return activity.activity_name || "러닝";
}

// 13. 대회 목표 코스 및 완주 / DNF(미완주) 정밀 판정 함수
// - 사용자가 등록한 종목(raceType) 또는 대회/활동명의 코스 키워드(풀, 하프, 10k 등)를 기준으로 목표 거리를 산출합니다.
// - 실제 주행 거리가 오차범위(~1km)를 초과하여 부족한 경우(예: 하프 신청 후 12km 주행, 풀 신청 후 21km 주행 등) DNF(미완주)로 판정합니다.
export function getRaceCompletionInfo(activity, userRaces = []) {
  if (!activity) {
    return {
      targetCategory: "대회",
      targetKm: 0,
      minKm: 0,
      ranKm: 0,
      isCompleted: false,
      isDnf: false,
      statusLabel: "대회"
    };
  }

  const km = (Number(activity?.distance_meters) || 0) / 1000;
  const rawName = (activity?.activity_name || "").toLowerCase();
  const raceName = (activity?.race_name || "").toLowerCase();

  let targetCategory = null;
  let targetKm = 0;
  let minKm = 0;

  // 1순위: 사용자가 '나의 마라톤'에서 직접 신청/등록한 참가 종목(raceType) 최우선 반영!
  let matched = null;
  if (Array.isArray(userRaces) && userRaces.length > 0) {
    matched = findMatchedUserRace(activity, userRaces);
    if (matched?.raceType) {
      const rt = matched.raceType.toLowerCase();
      if (rt === "full" || rt.includes("풀")) {
        targetCategory = "풀코스"; targetKm = 42.195; minKm = 40.0;
      } else if (rt === "half" || rt.includes("하프")) {
        targetCategory = "하프"; targetKm = 21.0975; minKm = 19.5;
      } else if (rt === "10k" || rt.includes("10")) {
        targetCategory = "10K"; targetKm = 10.0; minKm = 8.8;
      } else if (rt === "5k" || rt.includes("5")) {
        targetCategory = "5K"; targetKm = 5.0; minKm = 4.5;
      }
    }
  }

  const combinedName = `${rawName} ${raceName} ${matched?.name || ""}`.toLowerCase();

  // 2순위: 활동명 또는 대회명에 명시된 종목 키워드 (예: '강남국제하프마라톤', '서울마라톤 풀코스')
  if (!targetCategory) {
    if (combinedName.includes("풀코스") || combinedName.includes("풀 마라톤") || combinedName.includes("full")) {
      targetCategory = "풀코스"; targetKm = 42.195; minKm = 40.0;
    } else if (combinedName.includes("하프") || combinedName.includes("half") || combinedName.includes("21k")) {
      targetCategory = "하프"; targetKm = 21.0975; minKm = 19.5;
    } else if (combinedName.includes("10k") || combinedName.includes("10km")) {
      targetCategory = "10K"; targetKm = 10.0; minKm = 8.8;
    } else if (combinedName.includes("5k") || combinedName.includes("5km")) {
      targetCategory = "5K"; targetKm = 5.0; minKm = 4.5;
    }
  }

  // 3순위: 매칭된 대회의 종목 텍스트가 단일 종목인 경우
  if (!targetCategory && matched?.distances) {
    const d = matched.distances.toLowerCase();
    if (!d.includes(",") && !d.includes("/") && !d.includes("·") && !d.includes(" 및 ")) {
      if (d.includes("풀") || d.includes("full")) {
        targetCategory = "풀코스"; targetKm = 42.195; minKm = 40.0;
      } else if (d.includes("하프") || d.includes("half")) {
        targetCategory = "하프"; targetKm = 21.0975; minKm = 19.5;
      } else if (d.includes("10k") || d.includes("10km")) {
        targetCategory = "10K"; targetKm = 10.0; minKm = 8.8;
      } else if (d.includes("5k") || d.includes("5km")) {
        targetCategory = "5K"; targetKm = 5.0; minKm = 4.5;
      }
    }
  }

  // 4순위: 목표 종목이 명시되지 않은 경우, 실제 주행 거리 기반으로 판정
  if (!targetCategory) {
    if (km >= 40.0) {
      targetCategory = "풀코스"; targetKm = 42.195; minKm = 40.0;
    } else if (km >= 19.5 && km <= 23.5) {
      targetCategory = "하프"; targetKm = 21.0975; minKm = 19.5;
    } else if (km >= 8.8 && km <= 11.5) {
      targetCategory = "10K"; targetKm = 10.0; minKm = 8.8;
    } else if (km >= 4.5 && km <= 5.8) {
      targetCategory = "5K"; targetKm = 5.0; minKm = 4.5;
    } else {
      targetCategory = "대회"; targetKm = km; minKm = km;
    }
  }

  // 완주 / DNF 여부 판정 (오차범위 1km 내외 반영)
  const isDnf = targetKm > 0 && minKm > 0 && km < minKm;
  const isCompleted = !isDnf;

  return {
    targetCategory,
    targetKm,
    minKm,
    ranKm: Number(km.toFixed(2)),
    isCompleted,
    isDnf,
    statusLabel: isDnf ? `${targetCategory} DNF` : `${targetCategory} 완주`
  };
}

// 14. 대회 카테고리 태그 반환 (10K / 하프 / 풀코스 / 5K / 대회)
export function getRaceCategory(activity, userRaces = []) {
  const info = getRaceCompletionInfo(activity, userRaces);
  return info.targetCategory;
}

// 10. 월간 전체 러닝 통합 스포츠 과학 리포트 생성기
export function generateMonthlyReport(monthLabel, monthActivities = []) {
  if (!monthActivities || monthActivities.length === 0) return null;

  const totalRuns = monthActivities.length;
  const totalDistMeters = monthActivities.reduce((s, a) => s + (Number(a.distance_meters) || 0), 0);
  const totalDurationSec = monthActivities.reduce((s, a) => s + (Number(a.duration_seconds) || 0), 0);
  const totalCalories = monthActivities.reduce((s, a) => s + (Number(a.calories) || 0), 0);

  const distKm = (totalDistMeters / 1000).toFixed(1);
  const avgPaceSec = totalDistMeters > 0 ? Math.round(totalDurationSec / (totalDistMeters / 1000)) : 0;
  const avgPace = formatPace(avgPaceSec);

  const hrList = monthActivities.filter((a) => a.avg_heart_rate);
  const avgHr = hrList.length > 0 ? Math.round(hrList.reduce((s, a) => s + a.avg_heart_rate, 0) / hrList.length) : null;

  // 월간 최장 롱런 활동
  const longestRun = [...monthActivities].sort((a, b) => (b.distance_meters || 0) - (a.distance_meters || 0))[0];
  const longestKm = longestRun ? (longestRun.distance_meters / 1000).toFixed(1) : 0;

  // 월간 최고 속도 활동 (3km 이상 중 최고 페이스)
  const qualifiedForFast = monthActivities.filter((a) => (a.distance_meters || 0) >= 3000 && a.avg_pace_seconds > 0);
  const fastestRun = qualifiedForFast.length > 0 ? [...qualifiedForFast].sort((a, b) => a.avg_pace_seconds - b.avg_pace_seconds)[0] : null;

  // 월간 평균 유산소 심폐 효율 지수
  const efList = monthActivities.filter((a) => a.aerobic_ef).map((a) => Number(a.aerobic_ef));
  const avgEf = efList.length > 0 ? Number((efList.reduce((s, e) => s + e, 0) / efList.length).toFixed(2)) : null;

  const reportItems = [];

  // 1. 월간 주행 마일리지 평가
  const kmNum = Number(distKm);
  if (kmNum >= 150) {
    reportItems.push({
      badge: "🏆 엘리트 마일리지 (150km+)",
      text: `월 누적 ${distKm}km (${totalRuns}회 러닝)를 달성하여 풀코스 마라톤 서브3~330을 위한 탄탄한 장거리 유산소 베이스를 완벽하게 구축했습니다.`
    });
  } else if (kmNum >= 80) {
    reportItems.push({
      badge: "💪 마라톤 완주 안정권 (80km+)",
      text: `월 누적 ${distKm}km (${totalRuns}회 러닝)로 하프 및 풀코스 완주에 필요한 유산소 지구력을 꾸준히 안정적으로 확보하고 있습니다.`
    });
  } else {
    reportItems.push({
      badge: "🌱 기초 체력 빌드업",
      text: `월 누적 ${distKm}km (${totalRuns}회 러닝)를 기록했습니다. 주 3회 이상의 규칙적인 러닝으로 마일리지를 점진적으로 늘려가는 것을 추천합니다.`
    });
  }

  // 2. 월간 최장 롱런(LSD) 평가
  if (longestRun && Number(longestKm) >= 20) {
    reportItems.push({
      badge: "🏅 20km+ 장거리 LSD 완수",
      text: `최장 ${longestKm}km 달리기('${longestRun.activity_name}')를 소화하여 대회 후반부 페이스 저하와 글리코겐 고갈을 이겨낼 지지대 훈련을 성공적으로 마쳤습니다.`
    });
  } else if (longestRun && Number(longestKm) >= 10) {
    reportItems.push({
      badge: "🏃 10km+ 지속주 훈련",
      text: `월간 최장 거리 ${longestKm}km를 달성했습니다. 하프/풀코스 대비를 위해 15km~20km 장거리 LSD 러닝을 서서히 도입해보세요.`
    });
  }

  // 3. 심폐 효율성 평가
  if (avgEf) {
    reportItems.push({
      badge: "💓 월간 심폐 유산소 효율 (EF)",
      text: `이번 달 평균 유산소 심폐 효율은 ${avgEf}입니다. 동일한 심박수 대비 스피드 효율이 안정적으로 유지되고 있습니다.`
    });
  }

  // 4. 대회 예상 완주 시간 (월간 최장 거리 또는 대표 기록 기준 Riegel 공식 적용)
  const sampleForPrediction = longestRun && longestRun.distance_meters >= 5000 ? longestRun : (fastestRun || monthActivities[0]);
  const predictions = sampleForPrediction ? predictRaceTimes(sampleForPrediction.distance_meters, sampleForPrediction.duration_seconds) : null;

  return {
    title: `${monthLabel} 종합 퍼포먼스 리포트`,
    distKm,
    totalRuns,
    avgPace,
    avgHr: avgHr ? `${avgHr} bpm` : null,
    totalDurationFormatted: formatDuration(totalDurationSec),
    totalCalories: totalCalories > 0 ? `${totalCalories.toLocaleString()} kcal` : null,
    longestKm,
    longestRunName: longestRun?.activity_name || null,
    fastestPace: fastestRun ? formatPace(fastestRun.avg_pace_seconds) : null,
    fastestRunName: fastestRun?.activity_name || null,
    reportItems,
    predictions,
    predictionBasis: sampleForPrediction ? `${sampleForPrediction.activity_name} (${(sampleForPrediction.distance_meters / 1000).toFixed(1)}km)` : null
  };
}

// 14. 1km 랩 배열을 N-km(기본 5km) 단위 블록으로 집계하여 구간별 평페/시간/심박수 계산
export function groupLapsByChunk(laps = [], chunkSizeKm = 5) {
  if (!Array.isArray(laps) || laps.length === 0) return [];

  const chunks = [];
  const totalLaps = laps.length;

  for (let i = 0; i < totalLaps; i += chunkSizeKm) {
    const chunkLaps = laps.slice(i, i + chunkSizeKm);
    const startKm = i + 1;
    const endKm = i + chunkLaps.length;

    // 구간 총 거리(m) 및 총 소요시간(s)
    const distMeters = chunkLaps.reduce((acc, l) => acc + (Number(l.distance_meters) || 1000), 0);
    const durationSeconds = chunkLaps.reduce((acc, l) => acc + (Number(l.duration_seconds) || 0), 0);

    // 거리 기반 정확한 가중 평균 페이스 (초/km)
    const distKm = distMeters / 1000;
    const avgPaceSeconds = distKm > 0 ? Math.round(durationSeconds / distKm) : 0;

    // 가중 평균 심박수
    const validHrLaps = chunkLaps.filter((l) => l.avg_heart_rate && l.avg_heart_rate > 0);
    let avgHr = null;
    if (validHrLaps.length > 0) {
      const totalHrDist = validHrLaps.reduce((acc, l) => acc + (l.avg_heart_rate * (Number(l.distance_meters) || 1000)), 0);
      const totalHrMeters = validHrLaps.reduce((acc, l) => acc + (Number(l.distance_meters) || 1000), 0);
      avgHr = Math.round(totalHrDist / totalHrMeters);
    }

    // 자투리 구간 라벨링 포맷
    const isPartial = chunkLaps.length < chunkSizeKm || (i + chunkSizeKm >= totalLaps && distKm % 1 !== 0);
    const label = startKm === endKm
      ? `${startKm}K`
      : `${startKm}~${endKm}${isPartial ? ` (${distKm.toFixed(1)}km)` : "K"}`;

    chunks.push({
      chunk_index: Math.floor(i / chunkSizeKm) + 1,
      label,
      start_km: startKm,
      end_km: endKm,
      distance_meters: distMeters,
      distance_km: Number(distKm.toFixed(2)),
      duration_seconds: durationSeconds,
      pace_seconds: avgPaceSeconds,
      avg_heart_rate: avgHr,
      lap_count: chunkLaps.length
    });
  }

  return chunks;
}

