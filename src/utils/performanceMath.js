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
