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
  const d = new Date(startTime);
  if (Number.isNaN(d.getTime())) return "";
  // 한국 표준시 (KST = UTC + 9시간)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// 9. 러닝 거리와 대회 종목 거리 매칭 판별기
export function isDistanceMatchingRace(distMeters, raceDistancesStr = "") {
  const km = (Number(distMeters) || 0) / 1000;
  if (km <= 0) return false;
  const dStr = (raceDistancesStr || "").toLowerCase();

  // 하프 코스 (20.0km ~ 22.5km)
  if (km >= 20.0 && km <= 22.5) {
    if (dStr.includes("하프") || dStr.includes("half") || dStr.includes("21")) return true;
  }
  // 10K 코스 (9.5km ~ 11.2km)
  if (km >= 9.5 && km <= 11.2) {
    if (dStr.includes("10k") || dStr.includes("10km") || dStr.includes("10")) return true;
  }
  // 풀코스 (41.0km ~ 43.5km)
  if (km >= 41.0 && km <= 43.5) {
    if (dStr.includes("풀") || dStr.includes("full") || dStr.includes("42")) return true;
  }
  // 5K 코스 (4.6km ~ 5.6km)
  if (km >= 4.6 && km <= 5.6) {
    if (dStr.includes("5k") || dStr.includes("5km") || dStr.includes("5")) return true;
  }

  // 대회 종목 텍스트가 광범위하거나 특정되지 않은 경우에도 마라톤 표준 거리(하프/풀/10K)에 근접하면 일치로 판정
  return km >= 4.5 && (km >= 20.0 || km >= 9.5 || km >= 41.0);
}

// 10. 가민 러닝 활동과 '나의 마라톤(user_races)' 등록 일정 1:1 자동 매칭
export function findMatchedUserRace(activity, userRaces = []) {
  if (!activity || !Array.isArray(userRaces) || userRaces.length === 0) return null;

  // 1. 이미 user_race_id로 연결된 대회가 있으면 최우선 반환
  if (activity.user_race_id) {
    const directMatch = userRaces.find((r) => r.entryId === activity.user_race_id || r.id === activity.user_race_id);
    if (directMatch) return directMatch;
  }

  // 2. KST 날짜 일치 여부 확인
  const actDate = getActivityKstDate(activity.start_time);
  if (!actDate) return null;

  // 당일 대회가 있는지 검색
  const exactMatches = userRaces.filter((r) => r.dateIso === actDate);
  if (exactMatches.length > 0) {
    // 거리가 매칭되는 종목 우선 매칭
    const distMatch = exactMatches.find((r) => isDistanceMatchingRace(activity.distance_meters, r.distances));
    if (distMatch) return distMatch;
    // 당일 대회가 1건이면 종목 무관 매칭
    if (exactMatches.length === 1) return exactMatches[0];
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

// 13. 대회 카테고리 태그 반환 (10K / 하프 / 풀코스 / 5K / 대회)
export function getRaceCategory(activity, userRaces = []) {
  const km = (Number(activity?.distance_meters) || 0) / 1000;
  const name = (activity?.activity_name || "").toLowerCase();

  if (Array.isArray(userRaces) && userRaces.length > 0) {
    const matched = findMatchedUserRace(activity, userRaces);
    if (matched && matched.distances) {
      const d = matched.distances.toLowerCase();
      if (km >= 40.0 || d.includes("풀") || d.includes("full")) return "풀코스";
      if ((km >= 19.5 && km <= 23.0) || d.includes("하프") || d.includes("half")) return "하프";
      if ((km >= 9.0 && km <= 11.5) || d.includes("10k") || d.includes("10km")) return "10K";
      if ((km >= 4.5 && km <= 5.8) || d.includes("5k")) return "5K";
    }
  }

  if (km >= 41.0 || name.includes("풀코스") || name.includes("full")) return "풀코스";
  if ((km >= 20.0 && km <= 22.5) || name.includes("하프") || name.includes("half") || name.includes("21k")) return "하프";
  if ((km >= 9.5 && km <= 11.0) || name.includes("10k") || name.includes("10km")) return "10K";
  if ((km >= 4.7 && km <= 5.5) || name.includes("5k")) return "5K";
  return "대회";
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

