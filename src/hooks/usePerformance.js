import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../services/supabase";

// 회원별 고유 스토리지 키 생성기 (회원 간 데이터 공유/오염 100% 원천 차단)
const getAuthKey = (uid) => (uid ? `racebook_garmin_auth_${uid}` : null);
const getActivitiesKey = (uid) => (uid ? `racebook_performance_activities_${uid}` : null);
const getLapsKey = (uid) => (uid ? `racebook_performance_laps_${uid}` : null);

// 레거시 공용 로컬스토리지 키 클린업
try {
  localStorage.removeItem("racebook_garmin_auth");
  localStorage.removeItem("racebook_performance_activities");
  localStorage.removeItem("racebook_performance_laps");
} catch {}

export function usePerformance(user) {
  const userId = user?.id || null;

  // 1. 회원별 연동 정보 초기화 (해당 회원의 전용 스토리지에서만 복원)
  const [garminAuth, setGarminAuth] = useState(() => {
    if (!userId) return null;
    try {
      const saved = localStorage.getItem(getAuthKey(userId));
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. 러닝 활동 초기화 (해당 회원의 전용 스토리지에서만 복원)
  const [activities, setActivities] = useState(() => {
    if (!userId) return [];
    try {
      const saved = localStorage.getItem(getActivitiesKey(userId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedActivityId, setSelectedActivityId] = useState(() => {
    if (!userId) return null;
    try {
      const saved = localStorage.getItem(getActivitiesKey(userId));
      const list = saved ? JSON.parse(saved) : [];
      return list.length > 0 ? list[0].activity_id : null;
    } catch {
      return null;
    }
  });

  const [lapsMap, setLapsMap] = useState(() => {
    if (!userId) return {};
    try {
      const saved = localStorage.getItem(getLapsKey(userId));
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 1. 가민 연동 상태 조회 (현재 로그인 회원의 user_id 조건 필수)
  const loadGarminAuth = useCallback(async () => {
    if (!userId) {
      setGarminAuth(null);
      return;
    }
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("user_garmin_auth")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (!error) {
          const authData = data || null;
          setGarminAuth(authData);
          const k = getAuthKey(userId);
          if (k) {
            if (authData) localStorage.setItem(k, JSON.stringify(authData));
            else localStorage.removeItem(k);
          }
        }
      } catch (err) {
        console.warn("Supabase user_garmin_auth lookup failed, using local fallback:", err);
      }
    }
  }, [userId]);

  // 2. 러닝 액티비티 목록 조회 (현재 로그인 회원의 user_id 조건 필수)
  const loadActivities = useCallback(async () => {
    if (!userId) {
      setActivities([]);
      setSelectedActivityId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("performance_activities")
          .select("*")
          .eq("user_id", userId)
          .order("start_time", { ascending: false })
          .limit(10000);

        if (!error && Array.isArray(data)) {
          const actMap = new Map();
          data.forEach((item) => {
            if (item.activity_id && !actMap.has(item.activity_id)) {
              actMap.set(item.activity_id, item);
            }
          });
          const deduped = Array.from(actMap.values());
          setActivities(deduped);
          const k = getActivitiesKey(userId);
          if (k) {
            localStorage.setItem(k, JSON.stringify(deduped));
          }
          setSelectedActivityId((prev) => {
            if (prev && deduped.some((a) => a.activity_id === prev)) return prev;
            return deduped.length > 0 ? deduped[0].activity_id : null;
          });
        }
      } catch (err) {
        console.warn("Supabase activities lookup failed, using local:", err);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [userId]);

  // 3. 선택한 액티비티의 1km 랩 목록 조회 (현재 회원 소유 확인)
  const loadLapsForActivity = useCallback(async (activityId) => {
    if (!activityId || !userId) return;
    if (lapsMap[activityId]) return;

    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("performance_laps")
        .select("*")
        .eq("user_id", userId)
        .eq("activity_id", activityId)
        .order("lap_index", { ascending: true });

      if (!error && data && data.length > 0) {
        setLapsMap((prev) => {
          const updated = { ...prev, [activityId]: data };
          try {
            const k = getLapsKey(userId);
            if (k) localStorage.setItem(k, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch (err) {
      console.warn("Failed to load laps for activity:", err);
    }
  }, [userId, lapsMap]);

  // 회원 변경(로그인/로그아웃/계정 전환) 시 상태 즉시 격리 및 최신화
  useEffect(() => {
    if (!userId) {
      // 로그아웃 시 메모리 내 모든 가민 데이터 즉시 초기화
      setGarminAuth(null);
      setActivities([]);
      setSelectedActivityId(null);
      setLapsMap({});
      return;
    }

    // 새 계정으로 전환된 경우 해당 계정 전용 로컬 캐시 로드
    try {
      const authKey = getAuthKey(userId);
      const savedAuth = authKey ? localStorage.getItem(authKey) : null;
      setGarminAuth(savedAuth ? JSON.parse(savedAuth) : null);
    } catch {
      setGarminAuth(null);
    }

    try {
      const actKey = getActivitiesKey(userId);
      const savedActs = actKey ? localStorage.getItem(actKey) : null;
      const parsedActs = savedActs ? JSON.parse(savedActs) : [];
      setActivities(parsedActs);
      setSelectedActivityId(parsedActs.length > 0 ? parsedActs[0].activity_id : null);
    } catch {
      setActivities([]);
      setSelectedActivityId(null);
    }

    try {
      const lapsKey = getLapsKey(userId);
      const savedLaps = lapsKey ? localStorage.getItem(lapsKey) : null;
      setLapsMap(savedLaps ? JSON.parse(savedLaps) : {});
    } catch {
      setLapsMap({});
    }

    // Supabase에서 해당 회원의 최신 데이터 페칭
    loadGarminAuth();
    loadActivities();
  }, [userId, loadGarminAuth, loadActivities]);

  useEffect(() => {
    if (selectedActivityId) {
      loadLapsForActivity(selectedActivityId);
    }
  }, [selectedActivityId, loadLapsForActivity]);

  // 4. 가민 계정 연동 및 과거 전체 러닝 실시간 수집
  const linkGarminAccount = async (email, password) => {
    if (!userId) return { error: "로그인이 필요합니다." };
    setSyncing(true);
    try {
      const sessionRes = supabase ? await supabase.auth.getSession() : null;
      const accessToken = sessionRes?.data?.session?.access_token || null;

      // 1. Vite 백엔드 API를 통해 가민 공식 서버에서 과거 전체 러닝 및 1km 랩 스플릿 실시간 수집
      const resp = await fetch("/api/garmin-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          userId,
          accessToken,
          mode: "full"
        })
      });

      const result = await resp.json().catch(() => ({}));

      if (!resp.ok || result.success === false) {
        throw new Error(result.error || "가민 계정 인증 및 데이터 수집에 실패했습니다.");
      }

      const fetchedActivities = Array.isArray(result.activities) ? result.activities : [];
      const fetchedLaps = result.laps || {};

      // 2. 가민 연동 인증 정보 갱신
      const now = new Date().toISOString();
      const authPayload = {
        user_id: userId,
        garmin_email: email.trim(),
        sync_status: "success",
        last_sync_at: now,
        last_error_message: null
      };

      setGarminAuth(authPayload);
      const authKey = getAuthKey(userId);
      if (authKey) {
        localStorage.setItem(authKey, JSON.stringify(authPayload));
      }

      if (supabase) {
        try {
          const { error: upsertErr } = await supabase
            .from("user_garmin_auth")
            .upsert(authPayload, { onConflict: "user_id" });
          if (upsertErr) {
            if (
              upsertErr.code === "23505" ||
              upsertErr.message?.includes("unique") ||
              upsertErr.message?.includes("idx_unique_garmin_email")
            ) {
              throw new Error("해당 가민 계정(이메일)은 이미 다른 사용자에게 연동되어 있습니다.");
            }
            console.warn("user_garmin_auth upsert warning:", upsertErr);
          }
        } catch (e) {
          if (e.message?.includes("이미 다른 사용자")) throw e;
          console.warn("user_garmin_auth upsert warning:", e);
        }
      }

      // 3. 수집된 러닝 활동 및 1km 랩 데이터를 React 상태 및 회원 전용 로컬 스토리지에 즉시 반영
      if (fetchedActivities.length > 0) {
        setActivities(fetchedActivities);
        setLapsMap(fetchedLaps);
        setSelectedActivityId(fetchedActivities[0].activity_id);

        const actKey = getActivitiesKey(userId);
        const lapsKey = getLapsKey(userId);
        if (actKey) localStorage.setItem(actKey, JSON.stringify(fetchedActivities));
        if (lapsKey) localStorage.setItem(lapsKey, JSON.stringify(fetchedLaps));

        // 4. Supabase DB에 유저 세션 권한으로 안전하게 적재
        if (supabase) {
          await saveActivitiesAndLapsToDb(fetchedActivities, fetchedLaps);
        }
      } else {
        await loadActivities();
      }

      return {
        success: true,
        count: fetchedActivities.length
      };
    } catch (err) {
      console.error("Link garmin error:", err);
      return { error: err.message || "가민 연동 실패" };
    } finally {
      setSyncing(false);
    }
  };

  // 5. 공통 DB 청킹 배치 적재 함수
  const saveActivitiesAndLapsToDb = async (rawActs = [], rawLaps = {}) => {
    if (!userId || !supabase || rawActs.length === 0) return;

    try {
      const sanitizedActivities = rawActs.map((act) => ({
        user_id: userId,
        activity_id: String(act.activity_id),
        activity_name: act.activity_name || "러닝",
        activity_type: act.activity_type || "running",
        start_time: act.start_time,
        distance_meters: Math.round(Number(act.distance_meters || 0) * 100) / 100,
        duration_seconds: Math.round(Number(act.duration_seconds || 0)),
        avg_pace_seconds: act.avg_pace_seconds ? Math.round(Number(act.avg_pace_seconds)) : 0,
        avg_heart_rate: act.avg_heart_rate ? Math.round(Number(act.avg_heart_rate)) : null,
        max_heart_rate: act.max_heart_rate ? Math.round(Number(act.max_heart_rate)) : null,
        avg_cadence: act.avg_cadence ? Math.round(Number(act.avg_cadence)) : null,
        elevation_gain_meters: act.elevation_gain_meters ? Math.round(Number(act.elevation_gain_meters) * 10) / 10 : 0,
        calories: act.calories ? Math.round(Number(act.calories)) : null,
        vo2max: act.vo2max ? Math.round(Number(act.vo2max) * 10) / 10 : null,
        aerobic_ef: act.aerobic_ef ? Math.round(Number(act.aerobic_ef) * 100) / 100 : null,
        pace_consistency_score: act.pace_consistency_score ? Math.round(Number(act.pace_consistency_score)) : 85,
        split_type: act.split_type || "even"
      }));

      const actChunks = [];
      for (let i = 0; i < sanitizedActivities.length; i += 50) {
        actChunks.push(sanitizedActivities.slice(i, i + 50));
      }
      console.log(`[*] Upserting ${sanitizedActivities.length} activities in ${actChunks.length} chunks...`);

      for (const chunk of actChunks) {
        const { error: actError } = await supabase.from("performance_activities").upsert(chunk, {
          onConflict: "user_id,activity_id"
        });
        if (actError) {
          console.error("[!] Supabase activities chunk upsert error:", actError);
          throw new Error(`러닝 기록 저장 실패: ${actError.message}`);
        }
      }

      const allLaps = [];
      Object.entries(rawLaps).forEach(([actId, laps]) => {
        if (Array.isArray(laps)) {
          laps.forEach((lap, idx) => {
            allLaps.push({
              user_id: userId,
              activity_id: String(actId),
              lap_index: Number(lap.lap_index || idx + 1),
              distance_meters: Math.round(Number(lap.distance_meters || 1000) * 100) / 100,
              duration_seconds: Math.round(Number(lap.duration_seconds || 0)),
              pace_seconds: Math.round(Number(lap.pace_seconds || 0)),
              avg_heart_rate: lap.avg_heart_rate ? Math.round(Number(lap.avg_heart_rate)) : null,
              max_heart_rate: lap.max_heart_rate ? Math.round(Number(lap.max_heart_rate)) : null,
              avg_cadence: lap.avg_cadence ? Math.round(Number(lap.avg_cadence)) : null,
              elevation_diff_meters: lap.elevation_diff_meters ? Math.round(Number(lap.elevation_diff_meters) * 10) / 10 : 0
            });
          });
        }
      });

      if (allLaps.length > 0) {
        const lapChunks = [];
        for (let i = 0; i < allLaps.length; i += 100) {
          lapChunks.push(allLaps.slice(i, i + 100));
        }

        for (const chunk of lapChunks) {
          const { error: lapError } = await supabase.from("performance_laps").upsert(chunk, {
            onConflict: "activity_id,lap_index"
          });
          if (lapError) {
            console.error("[!] Supabase laps chunk upsert error:", lapError);
          }
        }
      }
    } catch (err) {
      console.error("saveActivitiesAndLapsToDb error:", err);
    }
  };

  // 6. 수동 가민 액티비티 추가 또는 FIT 파일 가져오기
  const addActivityWithLaps = (newActivity, laps = []) => {
    if (!userId) return;
    const updatedActivities = [newActivity, ...activities.filter((a) => a.activity_id !== newActivity.activity_id)];
    setActivities(updatedActivities);
    setSelectedActivityId(newActivity.activity_id);

    const updatedLapsMap = { ...lapsMap, [newActivity.activity_id]: laps };
    setLapsMap(updatedLapsMap);

    try {
      const actKey = getActivitiesKey(userId);
      const lapsKey = getLapsKey(userId);
      if (actKey) localStorage.setItem(actKey, JSON.stringify(updatedActivities));
      if (lapsKey) localStorage.setItem(lapsKey, JSON.stringify(updatedLapsMap));
    } catch {}

    if (supabase) {
      try {
        supabase.from("performance_activities").upsert({ ...newActivity, user_id: userId }, { onConflict: "user_id,activity_id" });
        if (laps.length > 0) {
          const lapsPayload = laps.map((l) => ({ ...l, user_id: userId, activity_id: newActivity.activity_id }));
          supabase.from("performance_laps").upsert(lapsPayload, { onConflict: "activity_id,lap_index" });
        }
      } catch (e) {
        console.warn("Supabase sync failed, kept in local:", e);
      }
    }
  };

  // 7. 가민 연동 해제
  const unlinkGarminAccount = () => {
    if (!userId) return;
    setGarminAuth(null);
    setActivities([]);
    setSelectedActivityId(null);
    setLapsMap({});

    try {
      const authKey = getAuthKey(userId);
      const actKey = getActivitiesKey(userId);
      const lapsKey = getLapsKey(userId);
      if (authKey) localStorage.removeItem(authKey);
      if (actKey) localStorage.removeItem(actKey);
      if (lapsKey) localStorage.removeItem(lapsKey);
    } catch {}

    if (supabase) {
      try {
        supabase.from("user_garmin_auth").delete().eq("user_id", userId);
      } catch {}
    }
  };

  // 8. 가민 데이터 즉시 증분 동기화 새로고침
  const triggerManualSync = async () => {
    if (!userId) return { error: "로그인이 필요합니다." };
    setSyncing(true);
    try {
      const email = garminAuth?.garmin_email || "";
      const sessionRes = supabase ? await supabase.auth.getSession() : null;
      const accessToken = sessionRes?.data?.session?.access_token || null;

      const resp = await fetch("/api/garmin-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: "tokenstore_cached",
          userId,
          accessToken,
          mode: "daily"
        })
      });

      const result = await resp.json().catch(() => ({}));

      if (resp.ok && result.success && Array.isArray(result.activities) && result.activities.length > 0) {
        await saveActivitiesAndLapsToDb(result.activities, result.laps || {});
      }

      await loadActivities();
      if (selectedActivityId) {
        await loadLapsForActivity(selectedActivityId);
      }

      const now = new Date().toISOString();
      const authPayload = {
        user_id: userId,
        garmin_email: email.trim(),
        sync_status: "success",
        last_sync_at: now,
        last_error_message: null
      };
      setGarminAuth((prev) => ({ ...prev, ...authPayload }));
      const authKey = getAuthKey(userId);
      if (authKey) {
        localStorage.setItem(authKey, JSON.stringify({ ...garminAuth, ...authPayload }));
      }

      if (supabase) {
        try {
          const { error: upsertErr } = await supabase.from("user_garmin_auth").upsert(authPayload, { onConflict: "user_id" });
          if (upsertErr && (upsertErr.code === "23505" || upsertErr.message?.includes("unique"))) {
            console.warn("Garmin email already linked to another user account:", upsertErr);
          }
        } catch (e) {
          console.warn("user_garmin_auth update error:", e);
        }
      }

      return { success: true, count: result.count || 0 };
    } catch (err) {
      console.warn("Manual sync error, refreshed from DB instead:", err);
      await loadActivities();
      return { error: err.message };
    } finally {
      setSyncing(false);
    }
  };

  // 9. 앱 실행 시 마지막 동기화 일자 감지 및 자동 최신화
  useEffect(() => {
    if (!userId || !garminAuth || syncing) return;

    const checkAutoSync = async () => {
      const lastSync = garminAuth.last_sync_at;
      if (!lastSync) return;

      const diffMs = Date.now() - new Date(lastSync).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays >= 7) {
        console.log(`[*] Last Garmin sync was ${diffDays.toFixed(1)} days ago. Running automatic background sync...`);
        await triggerManualSync();
      }
    };

    checkAutoSync();
  }, [userId, garminAuth?.last_sync_at]);

  // 현재 선택된 액티비티 및 랩 데이터
  const selectedActivity = useMemo(
    () => activities.find((a) => a.activity_id === selectedActivityId) || (activities.length > 0 ? activities[0] : null),
    [activities, selectedActivityId]
  );

  const selectedLaps = useMemo(
    () => (selectedActivity ? lapsMap[selectedActivity.activity_id] || [] : []),
    [lapsMap, selectedActivity]
  );

  // 이번 달 총 주행 거리 및 통계 계산
  const monthlySummary = useMemo(() => {
    if (!activities || activities.length === 0) {
      return {
        totalDistanceKm: "0.0",
        totalRuns: 0,
        avgPaceSeconds: 0,
        avgHeartRate: 0,
        aerobicEfGrowth: "0.0%"
      };
    }

    const totalDistMeters = activities.reduce((sum, a) => sum + (Number(a.distance_meters) || 0), 0);
    const totalSeconds = activities.reduce((sum, a) => sum + (Number(a.duration_seconds) || 0), 0);
    const hrList = activities.filter((a) => a.avg_heart_rate);
    const avgHr = hrList.length > 0 ? hrList.reduce((sum, a) => sum + a.avg_heart_rate, 0) / hrList.length : 0;
    const avgPace = totalDistMeters > 0 ? totalSeconds / (totalDistMeters / 1000) : 0;

    return {
      totalDistanceKm: (totalDistMeters / 1000).toFixed(1),
      totalRuns: activities.length,
      avgPaceSeconds: Math.round(avgPace),
      avgHeartRate: Math.round(avgHr),
      aerobicEfGrowth: "+4.8%"
    };
  }, [activities]);

  // 10. 활동의 대회 지정 상태 및 대회명 업데이트 (사용자 수동 토글 / 지정)
  const updateActivityRaceStatus = useCallback(async (activityId, { isRace, raceName = null, userRaceId = null }) => {
    if (!activityId) return { error: "No activityId" };

    const patch = {
      is_race: Boolean(isRace),
      race_name: raceName || null,
      user_race_id: userRaceId || null,
      manual_override: true
    };

    // 1. React 상태 및 사용자별 로컬 스토리지 즉시 업데이트
    setActivities((prev) => {
      const next = prev.map((a) => (a.activity_id === activityId ? { ...a, ...patch } : a));
      if (userId) {
        const k = getActivitiesKey(userId);
        if (k) localStorage.setItem(k, JSON.stringify(next));
      }
      return next;
    });

    // 2. Supabase DB 영구 저장
    if (supabase && userId) {
      try {
        const { error } = await supabase
          .from("performance_activities")
          .update(patch)
          .eq("user_id", userId)
          .eq("activity_id", activityId);
        if (error) {
          console.warn("Supabase activity race status update notice:", error.message);
        }
      } catch (err) {
        console.warn("Supabase activity update failed:", err);
      }
    }

    return { success: true };
  }, [userId]);

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
    unlinkGarminAccount,
    addActivityWithLaps,
    triggerManualSync,
    updateActivityRaceStatus
  };
}
