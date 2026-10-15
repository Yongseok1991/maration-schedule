import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../services/supabase";
import { calculateAerobicEF, calculatePaceConsistency, detectSplitType } from "../utils/performanceMath";

// 최초 연동 전 또는 데모용 현실적인 가민 10K 및 하프 러닝 샘플 데이터
const DEMO_ACTIVITIES = [
  {
    activity_id: "demo-garmin-10k-01",
    activity_name: "주말 한강 10K 템포런",
    activity_type: "running",
    start_time: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    distance_meters: 10000,
    duration_seconds: 3045, // 50분 45초
    avg_pace_seconds: 304, // 5:04/km
    avg_heart_rate: 154,
    max_heart_rate: 168,
    avg_cadence: 178,
    elevation_gain_meters: 24,
    calories: 680,
    vo2max: 51.5,
    aerobic_ef: 1.28,
    pace_consistency_score: 93,
    split_type: "negative"
  },
  {
    activity_id: "demo-garmin-lsd-21k",
    activity_name: "가을 대회 대비 21K 하프 LSD",
    activity_type: "running",
    start_time: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    distance_meters: 21100,
    duration_seconds: 6820, // 1시간 53분 40초
    avg_pace_seconds: 323, // 5:23/km
    avg_heart_rate: 148,
    max_heart_rate: 162,
    avg_cadence: 176,
    elevation_gain_meters: 65,
    calories: 1420,
    vo2max: 51.0,
    aerobic_ef: 1.25,
    pace_consistency_score: 89,
    split_type: "even"
  }
];

const DEMO_LAPS = {
  "demo-garmin-10k-01": [
    { lap_index: 1, distance_meters: 1000, duration_seconds: 315, pace_seconds: 315, avg_heart_rate: 142, max_heart_rate: 148, avg_cadence: 174 },
    { lap_index: 2, distance_meters: 1000, duration_seconds: 310, pace_seconds: 310, avg_heart_rate: 147, max_heart_rate: 152, avg_cadence: 176 },
    { lap_index: 3, distance_meters: 1000, duration_seconds: 308, pace_seconds: 308, avg_heart_rate: 150, max_heart_rate: 155, avg_cadence: 176 },
    { lap_index: 4, distance_meters: 1000, duration_seconds: 306, pace_seconds: 306, avg_heart_rate: 153, max_heart_rate: 157, avg_cadence: 178 },
    { lap_index: 5, distance_meters: 1000, duration_seconds: 305, pace_seconds: 305, avg_heart_rate: 154, max_heart_rate: 158, avg_cadence: 178 },
    { lap_index: 6, distance_meters: 1000, duration_seconds: 304, pace_seconds: 304, avg_heart_rate: 155, max_heart_rate: 160, avg_cadence: 178 },
    { lap_index: 7, distance_meters: 1000, duration_seconds: 302, pace_seconds: 302, avg_heart_rate: 156, max_heart_rate: 162, avg_cadence: 180 },
    { lap_index: 8, distance_meters: 1000, duration_seconds: 300, pace_seconds: 300, avg_heart_rate: 158, max_heart_rate: 164, avg_cadence: 180 },
    { lap_index: 9, distance_meters: 1000, duration_seconds: 298, pace_seconds: 298, avg_heart_rate: 162, max_heart_rate: 166, avg_cadence: 182 },
    { lap_index: 10, distance_meters: 1000, duration_seconds: 297, pace_seconds: 297, avg_heart_rate: 165, max_heart_rate: 168, avg_cadence: 184 }
  ],
  "demo-garmin-lsd-21k": Array.from({ length: 21 }, (_, i) => ({
    lap_index: i + 1,
    distance_meters: 1000,
    duration_seconds: 320 + Math.floor(Math.sin(i) * 5),
    pace_seconds: 320 + Math.floor(Math.sin(i) * 5),
    avg_heart_rate: 144 + Math.min(18, Math.floor(i * 0.8)),
    max_heart_rate: 150 + Math.min(18, Math.floor(i * 0.8)),
    avg_cadence: 176
  }))
};

export function usePerformance(user) {
  const [garminAuth, setGarminAuth] = useState(null);
  const [activities, setActivities] = useState(DEMO_ACTIVITIES);
  const [selectedActivityId, setSelectedActivityId] = useState(DEMO_ACTIVITIES[0].activity_id);
  const [lapsMap, setLapsMap] = useState(DEMO_LAPS);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 1. 가민 연동 상태 조회
  const loadGarminAuth = useCallback(async () => {
    if (!user || !supabase) return;
    try {
      const { data, error } = await supabase
        .from("user_garmin_auth")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setGarminAuth(data);
      }
    } catch (err) {
      console.warn("Failed to load garmin auth:", err);
    }
  }, [user]);

  // 2. 러닝 액티비티 목록 조회
  const loadActivities = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("performance_activities")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: false });

      if (!error && data && data.length > 0) {
        setActivities(data);
        setSelectedActivityId(data[0].activity_id);
      }
    } catch (err) {
      console.warn("Failed to load activities from Supabase:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 3. 선택한 액티비티의 1km 랩 목록 조회
  const loadLapsForActivity = useCallback(async (activityId) => {
    if (!activityId) return;
    if (lapsMap[activityId]) return; // 이미 캐싱된 경우 건너뜀

    if (!user || !supabase) return;
    try {
      const { data, error } = await supabase
        .from("performance_laps")
        .select("*")
        .eq("activity_id", activityId)
        .order("lap_index", { ascending: true });

      if (!error && data && data.length > 0) {
        setLapsMap((prev) => ({ ...prev, [activityId]: data }));
      }
    } catch (err) {
      console.warn("Failed to load laps for activity:", err);
    }
  }, [user, lapsMap]);

  useEffect(() => {
    if (user) {
      loadGarminAuth();
      loadActivities();
    }
  }, [user, loadGarminAuth, loadActivities]);

  useEffect(() => {
    if (selectedActivityId) {
      loadLapsForActivity(selectedActivityId);
    }
  }, [selectedActivityId, loadLapsForActivity]);

  // 4. 가민 계정 연동 저장
  const linkGarminAccount = async (email, password) => {
    if (!user) return { error: "로그인이 필요합니다." };
    setSyncing(true);
    try {
      // Supabase user_garmin_auth에 연동 상태 기록
      const now = new Date().toISOString();
      const payload = {
        user_id: user.id,
        garmin_email: email,
        sync_status: "success",
        last_sync_at: now
      };

      if (supabase) {
        await supabase.from("user_garmin_auth").upsert(payload, { onConflict: "user_id" });
      }

      setGarminAuth(payload);
      return { success: true };
    } catch (err) {
      console.error("Link garmin error:", err);
      return { error: err.message || "가민 연동 실패" };
    } finally {
      setSyncing(false);
    }
  };

  // 5. 가민 데이터 즉시 동기화 (수동 새로고침)
  const triggerManualSync = async () => {
    setSyncing(true);
    try {
      // 시뮬레이션 지연 후 최신 액티비티 갱신
      await new Promise((r) => setTimeout(r, 1200));
      await loadActivities();
      if (selectedActivityId) {
        await loadLapsForActivity(selectedActivityId);
      }
      return { success: true };
    } finally {
      setSyncing(false);
    }
  };

  // 현재 선택된 액티비티 및 랩 데이터
  const selectedActivity = useMemo(
    () => activities.find((a) => a.activity_id === selectedActivityId) || activities[0],
    [activities, selectedActivityId]
  );

  const selectedLaps = useMemo(
    () => lapsMap[selectedActivityId] || [],
    [lapsMap, selectedActivityId]
  );

  // 이번 달 총 주행 거리 및 통계 계산
  const monthlySummary = useMemo(() => {
    const totalDistMeters = activities.reduce((sum, a) => sum + (Number(a.distance_meters) || 0), 0);
    const totalSeconds = activities.reduce((sum, a) => sum + (Number(a.duration_seconds) || 0), 0);
    const avgHr = activities.filter((a) => a.avg_heart_rate).reduce((sum, a, _, arr) => sum + a.avg_heart_rate / arr.length, 0);
    const avgPace = totalDistMeters > 0 ? totalSeconds / (totalDistMeters / 1000) : 0;

    return {
      totalDistanceKm: (totalDistMeters / 1000).toFixed(1),
      totalRuns: activities.length,
      avgPaceSeconds: Math.round(avgPace),
      avgHeartRate: Math.round(avgHr) || 150
    };
  }, [activities]);

  return {
    garminAuth,
    activities,
    selectedActivity,
    selectedActivityId,
    setSelectedActivityId,
    selectedLaps,
    monthlySummary,
    loading,
    syncing,
    linkGarminAccount,
    triggerManualSync
  };
}
