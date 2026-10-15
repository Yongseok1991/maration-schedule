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

// 8. 대회(Race) 활동 판별 함수 (사용자가 직접 제목을 수정한 대회 기록만 필터링)
export function isRaceActivity(activity) {
  if (!activity) return false;
  if (activity.is_race === true || activity.event_type === "race") return true;

  const rawName = activity.activity_name || "";
  const name = rawName.toLowerCase();

  // 사용자가 대회명으로 직접 수정한 키워드 패턴 (마라톤, 하프, 레이스, 10km, 21k, 대회명 등)
  const customRaceKeywords = [
    "대회", "마라톤", "marathon", "race", "레이스",
    "half", "하프", "풀코스",
    "10k", "21k", "42k",
    "jtbc", "동마", "춘마", "제마",
    "런(", "run (", "run(", "run "
  ];

  const hasRaceKeyword = customRaceKeywords.some((k) => name.includes(k));
  if (hasRaceKeyword) {
    // 혹시 '트레드밀'이나 '실내'가 섞여있으면 제외
    if (name.includes("트레드밀") || name.includes("treadmill") || name.includes("indoor")) {
      return false;
    }
    return true;
  }

  return false;
}

// 9. 대회 카테고리 태그 반환 (10K / 하프 / 풀코스 / 대회)
export function getRaceCategory(activity) {
  const km = (Number(activity?.distance_meters) || 0) / 1000;
  const name = (activity?.activity_name || "").toLowerCase();

  if (km >= 41.5 || name.includes("풀코스") || name.includes("full")) return "풀코스";
  if ((km >= 20.5 && km <= 22.0) || name.includes("하프") || name.includes("half") || name.includes("21k")) return "하프";
  if ((km >= 9.5 && km <= 10.8) || name.includes("10k") || name.includes("10km")) return "10K";
  if ((km >= 4.8 && km <= 5.5) || name.includes("5k")) return "5K";
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

