import { useState, useRef, useMemo, useEffect } from "react";
import {
  formatPace,
  formatDuration,
  generateSmartReport,
  generateMonthlyReport,
  isRaceActivity,
  getRaceCategory,
  getRaceCompletionInfo,
  getActivityDisplayName,
  findMatchedUserRace,
  groupLapsByChunk
} from "../../utils/performanceMath";
import GarminAuthModal from "./GarminAuthModal";

export default function PerformanceView({
  performanceState,
  onOpenAuth,
  userRaces = [],
  onSyncResultToUserRace
}) {
  const {
    garminAuth,
    activities,
    selectedActivity,
    selectedActivityId,
    setSelectedActivityId,
    selectedLaps,
    monthlySummary,
    syncing,
    linkGarminAccount,
    unlinkGarminAccount,
    addActivityWithLaps,
    triggerManualSync,
    updateActivityRaceStatus
  } = performanceState;

  const [isGarminModalOpen, setIsGarminModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(""); // 처음 진입 시 가장 최근 월로 자동 초기화
  const [filterRaceOnly, setFilterRaceOnly] = useState(false); // 사용자가 직접 제목을 수정한 대회 기록만 필터
  const [isListExpanded, setIsListExpanded] = useState(false); // 목록 5개 초과 시 접기/펼치기
  const [reportTab, setReportTab] = useState("activity"); // "activity" | "monthly"
  const [splitChunkMode, setSplitChunkMode] = useState("1k"); // "1k" | "5k"
  const [selectedRaceCategory, setSelectedRaceCategory] = useState("all"); // "all" | "풀코스" | "하프" | "10K" | "5K"
  const [isRaceAssignModalOpen, setIsRaceAssignModalOpen] = useState(false);
  const [selectedRaceEntryId, setSelectedRaceEntryId] = useState("");
  const [customRaceNameInput, setCustomRaceNameInput] = useState("");
  const [shouldAutoSyncResult, setShouldAutoSyncResult] = useState(true);
  const [syncFeedback, setSyncFeedback] = useState("");
  const fileInputRef = useRef(null);
  const prevMonthRef = useRef(""); // 대회만 필터 선택 전 조회 중이던 월 기억

  // 대회 지정 및 완주 기록 동기화 저장 핸들러
  const handleSaveRaceAssignment = async () => {
    if (!selectedActivity) return;

    let finalName = customRaceNameInput.trim();
    let finalUserRaceId = selectedRaceEntryId || null;

    if (finalUserRaceId) {
      const match = userRaces.find((r) => String(r.entryId || r.id) === String(finalUserRaceId));
      if (match && !finalName) {
        finalName = match.name;
      }
    }

    if (!finalName) {
      finalName = selectedActivity.activity_name || "마라톤 대회";
    }

    if (updateActivityRaceStatus) {
      await updateActivityRaceStatus(selectedActivity.activity_id, {
        isRace: true,
        raceName: finalName,
        userRaceId: finalUserRaceId
      });
    }

    if (finalUserRaceId && onSyncResultToUserRace && shouldAutoSyncResult) {
      const res = await onSyncResultToUserRace(finalUserRaceId, selectedActivity);
      if (res?.success) {
        setSyncFeedback(`'${finalName}'에 완주 기록(${formatDuration(selectedActivity.duration_seconds)})이 성공적으로 동기화되었습니다!`);
        setTimeout(() => setSyncFeedback(""), 4000);
      }
    } else {
      setSyncFeedback(`'${finalName}' 대회로 지정되었습니다.`);
      setTimeout(() => setSyncFeedback(""), 4000);
    }

    setIsRaceAssignModalOpen(false);
  };

  // 1. 전체 활동의 월별 통계 목록 및 대회 기록 총 개수 집계
  const { monthStatsList, totalRaceCount, totalAllKm, latestMonthKey } = useMemo(() => {
    if (!activities || activities.length === 0) {
      return { monthStatsList: [], totalRaceCount: 0, totalAllKm: 0, latestMonthKey: "" };
    }

    const monthMap = {};
    let raceCount = 0;
    let allMeters = 0;
    let firstMonthKey = "";

    activities.forEach((act) => {
      const dist = Number(act.distance_meters) || 0;
      allMeters += dist;

      const isRace = isRaceActivity(act, userRaces);
      if (isRace) raceCount += 1;

      if (!act.start_time) return;
      const d = new Date(act.start_time);
      if (Number.isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;

      if (!firstMonthKey) {
        firstMonthKey = key;
      }

      if (!monthMap[key]) {
        monthMap[key] = {
          key,
          label: `${year}년 ${d.getMonth() + 1}월`,
          count: 0,
          distanceMeters: 0,
          raceCount: 0
        };
      }
      monthMap[key].count += 1;
      monthMap[key].distanceMeters += dist;
      if (isRace) {
        monthMap[key].raceCount += 1;
      }
    });

    const sortedMonths = Object.values(monthMap).sort((a, b) => b.key.localeCompare(a.key));
    return {
      monthStatsList: sortedMonths,
      totalRaceCount: raceCount,
      totalAllKm: allMeters / 1000,
      latestMonthKey: sortedMonths.length > 0 ? sortedMonths[0].key : firstMonthKey
    };
  }, [activities, userRaces]);

  // 2. 처음 진입 시 가장 최근 월(latestMonthKey)로 자동 선택
  useEffect(() => {
    if (latestMonthKey && !selectedMonth) {
      setSelectedMonth(latestMonthKey);
    }
  }, [latestMonthKey, selectedMonth]);

  // 전체 대회 활동 목록 및 등록된 대회 종목 목록
  const allRaceActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter((act) => isRaceActivity(act, userRaces));
  }, [activities, userRaces]);

  const raceCategoryList = useMemo(() => {
    const set = new Set();
    let hasDnf = false;
    allRaceActivities.forEach((act) => {
      const info = getRaceCompletionInfo(act, userRaces);
      set.add(info.targetCategory);
      if (info.isDnf) hasDnf = true;
    });
    const list = Array.from(set);
    if (hasDnf) {
      list.push("DNF (미완주)");
    }
    return list;
  }, [allRaceActivities, userRaces]);

  // 3. 선택된 월 및 대회 필터가 적용된 활동 목록
  const filteredActivities = useMemo(() => {
    if (!activities || activities.length === 0) return [];

    let list = activities;

    // 월별 필터 (대회 전용 모드가 아니거나, 월별 대회 조회를 위해 적용)
    if (selectedMonth && selectedMonth !== "all") {
      list = list.filter((act) => {
        if (!act.start_time) return false;
        const d = new Date(act.start_time);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === selectedMonth;
      });
    }

    // 대회 기록만 보기 (종목 필터 포함)
    if (filterRaceOnly) {
      list = list.filter((act) => isRaceActivity(act, userRaces));
      if (selectedRaceCategory !== "all") {
        if (selectedRaceCategory === "DNF (미완주)") {
          list = list.filter((act) => getRaceCompletionInfo(act, userRaces).isDnf);
        } else {
          list = list.filter((act) => getRaceCompletionInfo(act, userRaces).targetCategory === selectedRaceCategory);
        }
      }
    }

    return list;
  }, [activities, selectedMonth, filterRaceOnly, selectedRaceCategory, userRaces]);

  // 4. 필터 변경 시 선택된 액티비티가 현재 목록에 없으면 첫 번째 활동 자동 선택
  useEffect(() => {
    if (filteredActivities.length > 0) {
      const exists = filteredActivities.some((a) => a.activity_id === selectedActivityId);
      if (!exists) {
        setSelectedActivityId(filteredActivities[0].activity_id);
      }
    }
  }, [filteredActivities, selectedActivityId, setSelectedActivityId]);

  // 5. 이전 / 다음 활동 네비게이션
  const currentActivityIndex = filteredActivities.findIndex((a) => a.activity_id === selectedActivityId);
  const hasPrev = currentActivityIndex > 0;
  const hasNext = currentActivityIndex >= 0 && currentActivityIndex < filteredActivities.length - 1;

  const handlePrevActivity = () => {
    if (hasPrev) {
      setSelectedActivityId(filteredActivities[currentActivityIndex - 1].activity_id);
    }
  };

  const handleNextActivity = () => {
    if (hasNext) {
      setSelectedActivityId(filteredActivities[currentActivityIndex + 1].activity_id);
    }
  };

  // 6. 선택된 기간/필터에 따른 핵심 지표 동적 계산 (총거리 및 소요시간 집계)
  const periodSummary = useMemo(() => {
    if (!filteredActivities || filteredActivities.length === 0) {
      let label = "선택 기간";
      if (selectedMonth === "all") label = "전체 기간";
      else if (selectedMonth) {
        const [y, m] = selectedMonth.split("-");
        label = `${y}년 ${parseInt(m, 10)}월`;
      }

      return {
        periodLabel: label,
        totalDistanceKm: "0.0",
        totalSeconds: 0,
        totalDurationFormatted: "0시간 0분",
        totalRuns: 0,
        avgPaceSeconds: 0,
        avgHeartRate: 0,
        raceCount: 0
      };
    }

    const totalDistMeters = filteredActivities.reduce((sum, a) => sum + (Number(a.distance_meters) || 0), 0);
    const totalSeconds = filteredActivities.reduce((sum, a) => sum + (Number(a.duration_seconds) || 0), 0);
    const hrList = filteredActivities.filter((a) => a.avg_heart_rate);
    const avgHr = hrList.length > 0 ? hrList.reduce((sum, a) => sum + a.avg_heart_rate, 0) / hrList.length : 0;
    const avgPace = totalDistMeters > 0 ? totalSeconds / (totalDistMeters / 1000) : 0;
    const raceCount = filteredActivities.filter((a) => isRaceActivity(a, userRaces)).length;

    let periodLabel = "전체 기간";
    if (selectedMonth !== "all" && selectedMonth) {
      const [y, m] = selectedMonth.split("-");
      periodLabel = `${y}년 ${parseInt(m, 10)}월`;
    }

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.floor((totalSeconds % 3600) / 60);
    const totalDurationFormatted = totalHours > 0 ? `${totalHours}시간 ${totalMins}분` : `${totalMins}분`;

    return {
      periodLabel,
      totalDistanceKm: (totalDistMeters / 1000).toFixed(1),
      totalSeconds,
      totalDurationFormatted,
      totalRuns: filteredActivities.length,
      avgPaceSeconds: Math.round(avgPace),
      avgHeartRate: Math.round(avgHr),
      raceCount
    };
  }, [filteredActivities, selectedMonth, userRaces]);

  // 6-2. '대회만' 모드 전용 레이스 통계 (총거리 합산 대신 완주 횟수, 최고 기록(PB), 최고 페이스, 최장 코스 산출)
  const raceStats = useMemo(() => {
    if (!filteredActivities || filteredActivities.length === 0) {
      return {
        totalFinishes: 0,
        dnfCount: 0,
        categorySummaryStr: "완주 기록 없음",
        bestTimeFormatted: "-:--:--",
        bestRaceName: "",
        bestRaceCategory: "",
        bestPaceFormatted: "-:--",
        bestPaceRaceName: "",
        longestCategory: "-",
        longestDistanceKm: "0.0",
        avgHr: 0
      };
    }

    // 완주한 대회와 DNF(미완주) 대회 정밀 분리
    const completedRaces = filteredActivities.filter((act) => {
      return getRaceCompletionInfo(act, userRaces).isCompleted;
    });
    const dnfRaces = filteredActivities.filter((act) => {
      return getRaceCompletionInfo(act, userRaces).isDnf;
    });

    const totalFinishes = completedRaces.length;
    const dnfCount = dnfRaces.length;

    // 종목별 공식 완주 횟수 집계 (풀코스, 하프, 10K, 5K 등)
    const catMap = {};
    completedRaces.forEach((act) => {
      const cat = getRaceCategory(act, userRaces);
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    let categorySummaryStr = Object.entries(catMap)
      .map(([cat, count]) => `${cat} ${count}회`)
      .join(" · ");

    if (dnfCount > 0) {
      categorySummaryStr = categorySummaryStr
        ? `${categorySummaryStr} (DNF ${dnfCount}건 제외)`
        : `DNF ${dnfCount}건 (공식 완주 없음)`;
    }

    // 1. 최고 페이스 대회 (공식 완주 대회 대상, 완주 기록이 없으면 전체 중 선별)
    const paceCandidates = completedRaces.length > 0 ? completedRaces : filteredActivities;
    const sortedByPace = [...paceCandidates]
      .filter((a) => a.avg_pace_seconds > 0)
      .sort((a, b) => a.avg_pace_seconds - b.avg_pace_seconds);
    const bestPaceAct = sortedByPace[0] || paceCandidates[0];

    // 2. 최장 거리 대회 (공식 완주 대회 기준)
    const sortedByDist = [...completedRaces].sort(
      (a, b) => (b.distance_meters || 0) - (a.distance_meters || 0)
    );
    const longestAct = sortedByDist[0];
    const longestCategory = longestAct ? getRaceCategory(longestAct, userRaces) : (dnfCount > 0 ? "DNF (미완주)" : "-");
    const longestDistanceKm = longestAct ? (longestAct.distance_meters / 1000).toFixed(1) : "0.0";

    // 3. 대표 최고 기록 (PB): 완주한 최장 코스 중 가장 빠른 기록!
    // (DNF인 12km 강남국제하프마라톤 같은 미완주 활동은 PB에 절대 등록되지 않음)
    let bestRaceInLongest = null;
    if (longestAct) {
      const sameCategoryRaces = completedRaces.filter(
        (a) => getRaceCategory(a, userRaces) === longestCategory && a.duration_seconds > 0
      );
      bestRaceInLongest = sameCategoryRaces.sort((a, b) => a.duration_seconds - b.duration_seconds)[0] || longestAct;
    }

    const hrList = filteredActivities.filter((a) => a.avg_heart_rate);
    const avgHr = hrList.length > 0 ? Math.round(hrList.reduce((s, a) => s + a.avg_heart_rate, 0) / hrList.length) : 0;

    return {
      totalFinishes,
      dnfCount,
      categorySummaryStr: categorySummaryStr || (totalFinishes > 0 ? `${totalFinishes}회 완주` : "완주 기록 없음"),
      bestTimeFormatted: bestRaceInLongest ? formatDuration(bestRaceInLongest.duration_seconds) : "-:--:--",
      bestRaceName: bestRaceInLongest ? getActivityDisplayName(bestRaceInLongest, userRaces) : (dnfCount > 0 ? "공식 완주 기록 없음 (DNF)" : "기록 대기 중"),
      bestRaceCategory: bestRaceInLongest ? getRaceCategory(bestRaceInLongest, userRaces) : "-",
      bestPaceFormatted: bestPaceAct ? formatPace(bestPaceAct.avg_pace_seconds).replace("/km", "") : "-:--",
      bestPaceRaceName: bestPaceAct ? getActivityDisplayName(bestPaceAct, userRaces) : "",
      longestCategory,
      longestDistanceKm,
      avgHr
    };
  }, [filteredActivities, userRaces]);

  // 7. 선택된 액티비티 스마트 리포트 및 월간 종합 리포트 생성
  const smartReport = selectedActivity
    ? generateSmartReport(selectedActivity, selectedLaps)
    : null;

  const monthlyReport = useMemo(() => {
    return generateMonthlyReport(periodSummary.periodLabel, filteredActivities);
  }, [periodSummary.periodLabel, filteredActivities]);

  // 5km 구간 집계 및 활성 스플릿 데이터 계산
  const fiveKmChunks = useMemo(() => {
    return groupLapsByChunk(selectedLaps, 5);
  }, [selectedLaps]);

  const is5kAvailable = (selectedActivity?.distance_meters || 0) >= 4500 || selectedLaps.length >= 5;
  const activeSplits = splitChunkMode === "5k" && fiveKmChunks.length > 0 ? fiveKmChunks : selectedLaps;

  // 랩/스플릿 차트용 페이스 최소/최대 계산
  const maxPace = activeSplits.length > 0 ? Math.max(...activeSplits.map((l) => l.pace_seconds)) : 360;
  const minPace = activeSplits.length > 0 ? Math.min(...activeSplits.map((l) => l.pace_seconds)) : 280;
  const paceRange = Math.max(30, maxPace - minPace);

  // 수동 JSON/FIT 임포트
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (file.name.endsWith(".json")) {
          const json = JSON.parse(text);
          if (json.activity && Array.isArray(json.laps)) {
            addActivityWithLaps(json.activity, json.laps);
            alert("가민 러닝 데이터와 1km 랩 스플릿을 성공적으로 불러왔습니다!");
            return;
          }
        }
        alert("가민 활동 JSON 또는 FIT 지원 파일 형식을 확인해주세요.");
      } catch (err) {
        alert("파일을 파싱하는 중 오류가 발생했습니다: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const hasActivities = activities && activities.length > 0;

  // 세로 리스트에서 표시할 활동 (기본 5개 또는 전체)
  const displayedActivities = isListExpanded
    ? filteredActivities
    : filteredActivities.slice(0, 5);

  return (
    <div className="space-y-4 mt-3">
      {/* 1. 가민 연동 상태 배너 */}
      <div className="card-panel p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-lg shrink-0 mt-0.5 sm:mt-0">
            ⌚
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-zinc-100 shrink-0">Garmin Connect 연동</h3>
              {garminAuth ? (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                  계정 등록됨
                </span>
              ) : (
                <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-400 shrink-0">
                  미연동
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 truncate">
              {garminAuth
                ? `${garminAuth.garmin_email} (총 ${activities.length}회 수집됨)`
                : "가민 계정을 연동하면 1km 랩 페이스와 심박수가 자동으로 분석됩니다."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-zinc-800/60 sm:border-t-0">
          {garminAuth ? (
            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsGarminModalOpen(true)}
                className="rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1.5 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1 transition truncate"
              >
                <span>⚡</span>
                <span className="hidden xs:inline sm:inline">전체 가져오기</span>
                <span className="xs:hidden sm:hidden">가져오기</span>
              </button>
              <button
                type="button"
                onClick={triggerManualSync}
                disabled={syncing}
                className="rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700/80 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1 transition disabled:opacity-50 truncate"
              >
                <span className={syncing ? "animate-spin" : ""}>🔄</span>
                <span>{syncing ? "동기화..." : "새로고침"}</span>
              </button>
              <button
                type="button"
                onClick={unlinkGarminAccount}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-rose-500/10 hover:border-rose-500/30 px-2 py-1.5 text-xs font-medium text-zinc-400 hover:text-rose-400 transition text-center truncate"
              >
                연동 해제
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsGarminModalOpen(true)}
              className="w-full sm:w-auto rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-bold text-zinc-950 transition shadow-sm text-center"
            >
              가민 계정 연동하기
            </button>
          )}
        </div>
      </div>

      {/* 2. 월별 거리 조회 select 박스 & 대회 기록 전용 필터 툴바 */}
      {hasActivities && (
        <div className="card-panel p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 bg-zinc-900/80 border-zinc-800/90 min-w-0">
          {filterRaceOnly ? (
            /* 🏆 대회 모드일 때: 종목별 필터 셀렉트 박스 (월별 거리 합산 노출 차단) */
            <div className="flex items-center gap-2 w-full md:max-w-md min-w-0">
              <label htmlFor="race-category-select" className="text-xs font-bold text-zinc-300 flex items-center gap-1 shrink-0">
                <span className="text-amber-400">🏆</span>
                <span className="whitespace-nowrap">대회 종목:</span>
              </label>
              <div className="relative flex-1 min-w-0">
                <select
                  id="race-category-select"
                  value={selectedRaceCategory}
                  onChange={(e) => setSelectedRaceCategory(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-zinc-950 border border-amber-400/50 px-2.5 py-1.5 pr-7 text-xs font-semibold text-amber-300 hover:border-amber-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition cursor-pointer shadow-inner truncate"
                >
                  <option value="all">
                    🏁 전체 종목 ({allRaceActivities.filter((a) => getRaceCompletionInfo(a, userRaces).isCompleted).length}건 완주{allRaceActivities.some((a) => getRaceCompletionInfo(a, userRaces).isDnf) ? ` · DNF ${allRaceActivities.filter((a) => getRaceCompletionInfo(a, userRaces).isDnf).length}건` : ""})
                  </option>
                  {raceCategoryList.map((cat) => {
                    const isDnfCat = cat === "DNF (미완주)";
                    const count = isDnfCat
                      ? allRaceActivities.filter((a) => getRaceCompletionInfo(a, userRaces).isDnf).length
                      : allRaceActivities.filter((a) => {
                          const info = getRaceCompletionInfo(a, userRaces);
                          return info.targetCategory === cat && info.isCompleted;
                        }).length;
                    return (
                      <option key={cat} value={cat}>
                        {isDnfCat ? `⚠️ ${cat} (${count}건)` : `${cat} 코스 (${count}건 완주)`}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400 text-[10px]">
                  ▼
                </div>
              </div>
            </div>
          ) : (
            /* 🏃 일반 러닝 모드일 때: 월별 누적 마일리지 셀렉트 박스 */
            <div className="flex items-center gap-2 w-full md:max-w-md min-w-0">
              <label htmlFor="month-select" className="text-xs font-bold text-zinc-300 flex items-center gap-1 shrink-0">
                <span className="text-amber-400">📅</span>
                <span className="whitespace-nowrap">월별 거리:</span>
              </label>
              <div className="relative flex-1 min-w-0">
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-zinc-950 border border-zinc-700/90 px-2.5 py-1.5 pr-7 text-xs font-semibold text-zinc-100 hover:border-amber-400/80 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition cursor-pointer shadow-inner truncate"
                >
                  {monthStatsList.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} ({(m.distanceMeters / 1000).toFixed(1)}km · {m.count}회{m.raceCount > 0 ? ` · 🏆대회 ${m.raceCount}` : ""})
                    </option>
                  ))}
                  <option value="all">
                    🌐 전체 기간 누적 ({totalAllKm.toFixed(1)}km · {activities.length}회{totalRaceCount > 0 ? ` · 🏆대회 ${totalRaceCount}` : ""})
                  </option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400 text-[10px]">
                  ▼
                </div>
              </div>
            </div>
          )}

          {/* 대회 기록만 선택 토글 탭 */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between sm:justify-start">
            <span className="text-xs font-medium text-zinc-400 shrink-0">구분:</span>
            <div className="grid grid-cols-2 sm:flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => {
                  setFilterRaceOnly(false);
                  if (prevMonthRef.current) {
                    setSelectedMonth(prevMonthRef.current);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold text-center transition truncate ${
                  !filterRaceOnly
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                전체 활동
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!filterRaceOnly) {
                    prevMonthRef.current = selectedMonth;
                    setSelectedMonth("all"); // 대회만을 클릭하면 월별 검색조건을 해제하고 대회 전체 표출
                    setFilterRaceOnly(true);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition truncate ${
                  filterRaceOnly
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-md font-extrabold"
                    : "text-amber-400/90 hover:text-amber-300"
                }`}
              >
                <span>🏆</span>
                <span>대회만 ({totalRaceCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 핵심 지표 4대 카드 (대회만 모드 시 총거리 합산 대신 완주 횟수, PB, 최고 페이스, 최장 코스 표출) */}
      {filterRaceOnly && raceStats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* 1. 대회 완주 횟수 (총거리 합산 대체) */}
          <div className="card-panel p-3.5 sm:p-4 space-y-2 border-amber-400/40 bg-zinc-900/95 flex flex-col justify-between min-h-[115px] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-wider text-amber-300 uppercase">
                대회 완주 (FINISHES)
              </p>
              <span className="text-sm">🏆</span>
            </div>
            <div className="flex items-baseline flex-wrap gap-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight font-mono">
                {raceStats.totalFinishes}
              </span>
              <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-0.5">회 완주</span>
              {raceStats.dnfCount > 0 && (
                <span className="ml-1 text-[10px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/35 px-1.5 py-0.5 rounded">
                  DNF {raceStats.dnfCount}건
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 line-clamp-2 break-words leading-tight" title={raceStats.categorySummaryStr}>
              {raceStats.categorySummaryStr}
            </p>
          </div>

          {/* 2. 대회 최고 기록 (PB) (총 소요시간 합산 대체) */}
          <div className="card-panel p-3.5 sm:p-4 space-y-2 border-zinc-700/80 bg-zinc-900/90 flex flex-col justify-between min-h-[115px] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                대회 최고 기록 (PB)
              </p>
              <span className="text-sm">⏱️</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                {raceStats.bestTimeFormatted}
              </span>
            </div>
            <p className="text-[10px] text-zinc-300 font-mono line-clamp-2 break-words leading-tight" title={`${raceStats.bestRaceName} (${raceStats.bestRaceCategory})`}>
              {raceStats.bestRaceName ? `${raceStats.bestRaceName} (${raceStats.bestRaceCategory})` : "기록 대기 중"}
            </p>
          </div>

          {/* 3. 대회 최고 페이스 */}
          <div className="card-panel p-3.5 sm:p-4 space-y-2 border-zinc-700/80 bg-zinc-900/90 flex flex-col justify-between min-h-[115px] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                대회 최고 페이스
              </p>
              <span className="text-sm">⚡</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight font-mono">
                {raceStats.bestPaceFormatted}
              </span>
              <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-1">/km</span>
            </div>
            <p className="text-[10px] text-emerald-400 line-clamp-2 break-words leading-tight" title={raceStats.bestPaceRaceName}>
              {raceStats.bestPaceRaceName || "레이스 최고 속도"}
            </p>
          </div>

          {/* 4. 최장 완주 코스 */}
          <div className="card-panel p-3.5 sm:p-4 space-y-2 border-zinc-700/80 bg-zinc-900/90 flex flex-col justify-between min-h-[115px] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                최장 완주 코스
              </p>
              <span className="text-sm">🏅</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight font-mono">
                {raceStats.longestCategory}
              </span>
              {raceStats.longestDistanceKm !== "0.0" && (
                <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-1">({raceStats.longestDistanceKm}km)</span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 line-clamp-2 break-words leading-tight">
              {raceStats.avgHr ? `대회 평균 심박 ${raceStats.avgHr} bpm` : "공식 코스 완주"}
            </p>
          </div>
        </div>
      ) : (
        /* 🏃 '전체 활동' 모드: 기간/월별 총거리 및 마일리지 집계 카드 */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* 1. 총 거리 */}
          <div className="card-panel p-3.5 sm:p-4 space-y-2 border-zinc-700/80 bg-zinc-900/90 flex flex-col justify-between min-h-[110px] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                {periodSummary.periodLabel} 총 거리
              </p>
              <span className="text-sm">🏃</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight font-mono">
                {periodSummary.totalDistanceKm}
              </span>
              <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-1">km</span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate">
              총 {periodSummary.totalRuns}회 러닝
              {periodSummary.raceCount > 0 && ` (대회 ${periodSummary.raceCount}건)`}
            </p>
          </div>

          {/* 2. 총 소요 시간 */}
          <div className="card-panel p-3.5 sm:p-4 space-y-2 border-zinc-700/80 bg-zinc-900/90 flex flex-col justify-between min-h-[110px] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                기간 총 소요 시간
              </p>
              <span className="text-sm">⏱️</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                {periodSummary.totalDurationFormatted}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono truncate">
              {formatDuration(periodSummary.totalSeconds)} 완주 누적
            </p>
          </div>

          {/* 3. 평균 페이스 */}
          <div className="card-panel p-3.5 sm:p-4 space-y-2 border-zinc-700/80 bg-zinc-900/90 flex flex-col justify-between min-h-[110px] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                기간 평균 페이스
              </p>
              <span className="text-sm">⚡</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight font-mono">
                {periodSummary.avgPaceSeconds > 0 ? formatPace(periodSummary.avgPaceSeconds).replace("/km", "") : "-:--"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-1">/km</span>
            </div>
            <p className="text-[10px] text-emerald-400 truncate">
              {periodSummary.avgPaceSeconds > 0 ? "유산소 지속 페이스" : "기록 대기 중"}
            </p>
          </div>

          {/* 4. 평균 심박수 & 효율 */}
          <div className="card-panel p-3.5 sm:p-4 space-y-2 border-zinc-700/80 bg-zinc-900/90 flex flex-col justify-between min-h-[110px] shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                평균 심박수
              </p>
              <span className="text-sm">❤️</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight font-mono">
                {periodSummary.avgHeartRate > 0 ? periodSummary.avgHeartRate : "-"}
              </span>
              {periodSummary.avgHeartRate > 0 && <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-1">bpm</span>}
            </div>
            <p className="text-[10px] text-emerald-400/90 truncate">
              {hasActivities ? `심폐효율 ${monthlySummary.aerobicEfGrowth}` : "데이터 없음"}
            </p>
          </div>
        </div>
      )}

      {/* 4. 데이터가 없을 때의 Empty State */}
      {!hasActivities && (
        <div className="card-panel p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-2xl">
            📊
          </div>
          <h4 className="text-sm font-bold text-zinc-100">동기화된 러닝 기록이 아직 없습니다</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            {garminAuth
              ? `가민 계정(${garminAuth.garmin_email})이 등록되었습니다. 아래 버튼을 눌러 과거 러닝 및 1km 랩 스플릿 데이터를 지금 즉시 가져오세요.`
              : "가민(Garmin Connect) 계정을 연동하면 과거 전체 러닝 기록과 1km 구간별 페이스 스플릿, 심박수가 실시간으로 수집 및 정밀 분석됩니다."}
          </p>

          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setIsGarminModalOpen(true)}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-bold text-zinc-950 transition shadow-sm flex items-center gap-1.5"
            >
              <span>⌚</span>
              <span>{garminAuth ? "가민 러닝 데이터 지금 전체 가져오기" : "가민 계정 연동 및 데이터 가져오기"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.fit,.gpx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* 5. 사용성 극대화: 가로 스크롤 제거 & 빠른 선택 바 + 세로 카드 목록 */}
      {hasActivities && (
        <div className="card-panel p-4 space-y-3">
          {/* 5-1. 빠른 선택 드롭다운 & 이전/다음 네비게이션 컨트롤 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-800/70">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${filterRaceOnly ? "bg-amber-400" : "bg-emerald-400"}`} />
              <h4 className="text-xs font-bold text-zinc-200">
                {filterRaceOnly
                  ? `🏆 마라톤 대회 기록 (${filteredActivities.length}건)`
                  : `러닝 기록 (${filteredActivities.length}건 / 전체 ${activities.length}건)`}
              </h4>
            </div>

            {filteredActivities.length > 0 && (
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {/* 이전 활동 버튼 */}
                <button
                  type="button"
                  onClick={handlePrevActivity}
                  disabled={!hasPrev}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-xs font-semibold text-zinc-300 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
                  title="이전 기록"
                >
                  ◀ 이전
                </button>

                {/* 현재 활동 선택 드롭다운 (가로 스크롤 완전 대체) */}
                <div className="relative flex-1 sm:w-80 md:w-96">
                  <select
                    value={selectedActivityId || ""}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="w-full appearance-none rounded-xl bg-zinc-950 border border-zinc-700/80 px-2.5 py-1.5 pr-7 text-xs font-bold text-zinc-100 hover:border-amber-400/80 focus:border-amber-400 focus:outline-none transition cursor-pointer truncate"
                    title={selectedActivity ? getActivityDisplayName(selectedActivity, userRaces) : "활동 선택"}
                  >
                    {filteredActivities.map((act) => {
                      const isRace = isRaceActivity(act, userRaces);
                      const compInfo = isRace ? getRaceCompletionInfo(act, userRaces) : null;
                      const isDnf = compInfo?.isDnf;
                      const displayName = getActivityDisplayName(act, userRaces);
                      const d = act.start_time ? new Date(act.start_time) : null;
                      const dateStr = d ? `${d.getMonth() + 1}.${d.getDate()}` : "";
                      const distKm = (act.distance_meters / 1000).toFixed(1);
                      return (
                        <option key={act.activity_id} value={act.activity_id}>
                          {isRace ? (isDnf ? "⚠️ [DNF] " : "🏆 ") : ""}{dateStr} · {displayName} ({distKm}km · {formatPace(act.avg_pace_seconds)})
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400 text-[10px]">
                    ▼
                  </div>
                </div>

                {/* 다음 활동 버튼 */}
                <button
                  type="button"
                  onClick={handleNextActivity}
                  disabled={!hasNext}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-xs font-semibold text-zinc-300 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
                  title="다음 기록"
                >
                  다음 ▶
                </button>
              </div>
            )}
          </div>

          {/* 5-2. 세로 카드 리스트 (가로 스크롤 대신 한눈에 클릭 가능한 깔끔한 행 나열) */}
          {filteredActivities.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-950/40 rounded-xl border border-zinc-800/80">
              {filterRaceOnly
                ? `선택하신 기간(${periodSummary.periodLabel})에는 참가한 대회 기록이 없습니다.`
                : "선택하신 기간의 러닝 기록이 없습니다."}
              <button
                type="button"
                onClick={() => { setSelectedMonth("all"); setFilterRaceOnly(false); }}
                className="block mx-auto mt-2 text-amber-400 hover:underline font-bold"
              >
                전체 기간 러닝 모두 보기
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {displayedActivities.map((act) => {
                const isSelected = act.activity_id === selectedActivityId;
                const isRace = isRaceActivity(act, userRaces);
                const compInfo = isRace ? getRaceCompletionInfo(act, userRaces) : null;
                const isDnf = compInfo?.isDnf;
                const raceTag = isRace ? compInfo.targetCategory : null;
                const displayName = getActivityDisplayName(act, userRaces);
                const d = act.start_time ? new Date(act.start_time) : null;
                const dateText = d ? d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }) : "";

                return (
                  <button
                    key={act.activity_id}
                    onClick={() => setSelectedActivityId(act.activity_id)}
                    className={`w-full p-3 rounded-xl border text-left transition flex flex-col gap-2 ${
                      isSelected
                        ? "border-amber-400/90 bg-amber-400/10 text-zinc-100 shadow-md ring-1 ring-amber-400/30"
                        : isRace
                        ? isDnf
                          ? "border-rose-500/40 bg-zinc-900/80 text-zinc-300 hover:border-rose-400 hover:bg-zinc-900"
                          : "border-amber-500/30 bg-zinc-900/70 text-zinc-300 hover:border-amber-400/60 hover:bg-zinc-900"
                        : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {/* 1행: 날짜 + 대회 태그 + 대회/활동명 (너비 제약 없이 온전히 표출되어 잘림 현상 원천 방지) */}
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 flex-1">
                        <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                          {dateText}
                        </span>

                        {isRace && (
                          isDnf ? (
                            <span className="text-[10px] font-extrabold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/40 shrink-0 flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{raceTag} DNF</span>
                              <span className="text-[9px] font-mono text-rose-400">({compInfo.ranKm}km)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded border border-amber-400/40 shrink-0">
                              🏆 {raceTag}
                            </span>
                          )
                        )}

                        <span className={`text-xs sm:text-sm font-bold break-words leading-snug ${isSelected ? "text-amber-300 font-extrabold" : "text-zinc-100"}`}>
                          {displayName}
                        </span>
                      </div>

                      <span className={`text-[11px] shrink-0 font-medium ${isSelected ? "text-amber-400 font-bold" : "text-zinc-500"}`}>
                        {isSelected ? "선택됨 ✓" : "선택"}
                      </span>
                    </div>

                    {/* 2행: 핵심 수치 뱃지 (거리, 시간, 평균 페이스, 심박수) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs font-mono pt-0.5">
                      {/* 총 거리 강조 (DNF면 로즈 뱃지, 완주면 앰버 골드 뱃지) */}
                      <span className={`font-black text-xs px-2 py-0.5 rounded-md tracking-tight shrink-0 shadow-sm ${
                        isDnf
                          ? "text-rose-400 bg-rose-500/15 border border-rose-500/35"
                          : "text-amber-400 bg-amber-400/15 border border-amber-400/30"
                      }`}>
                        {(act.distance_meters / 1000).toFixed(2)} km
                      </span>

                      {/* 소요 시간 강조 (플래티넘 실버 뱃지) */}
                      <span className="font-bold text-xs text-zinc-100 bg-zinc-800/90 border border-zinc-700 px-2 py-0.5 rounded-md shrink-0 shadow-sm">
                        {formatDuration(act.duration_seconds)}
                      </span>

                      {/* 평균 페이스 */}
                      <span className="text-zinc-300 bg-zinc-800/60 border border-zinc-700/60 px-2 py-0.5 rounded-md shrink-0">
                        {formatPace(act.avg_pace_seconds)}/km
                      </span>

                      {/* 평균 심박 */}
                      {act.avg_heart_rate && (
                        <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                          ❤️ {act.avg_heart_rate} bpm
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* 활동이 5개 초과일 때 더보기 / 접기 버튼 */}
              {filteredActivities.length > 5 && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setIsListExpanded(!isListExpanded)}
                    className="text-xs font-semibold text-zinc-400 hover:text-amber-400 transition inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700"
                  >
                    {isListExpanded
                      ? `▲ 접기 (최근 5개만 보기)`
                      : `▼ 목록 전체 보기 (+${filteredActivities.length - 5}건 더보기)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. 선택된 액티비티의 1km 랩 스플릿 시각화 차트 */}
      {hasActivities && selectedActivity && (
        <div className="card-panel p-4 space-y-4">
          {(() => {
            const isCurrentSelectedRace = isRaceActivity(selectedActivity, userRaces);
            const currentCompInfo = isCurrentSelectedRace ? getRaceCompletionInfo(selectedActivity, userRaces) : null;
            const isCurrentSelectedDnf = currentCompInfo?.isDnf;
            const currentRaceCategory = currentCompInfo?.targetCategory || getRaceCategory(selectedActivity, userRaces);
            const currentDisplayName = getActivityDisplayName(selectedActivity, userRaces);
            const matchedUserRace = findMatchedUserRace(selectedActivity, userRaces);

            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-zinc-800/80">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-zinc-100 break-words leading-snug">{currentDisplayName}</h3>
                      {isCurrentSelectedRace ? (
                        isCurrentSelectedDnf ? (
                          <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-300 flex items-center gap-1 shrink-0">
                            <span>⚠️</span>
                            <span>{currentRaceCategory} DNF (미완주)</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-300 flex items-center gap-1 shrink-0">
                            <span>🏆</span>
                            <span>{currentRaceCategory} 완주</span>
                          </span>
                        )
                      ) : (
                        <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 shrink-0">
                          🏃 일반 러닝
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 break-words">
                      {new Date(selectedActivity.start_time).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })} 러닝 기록
                      {matchedUserRace && (
                        <span className="ml-2 text-amber-300 font-medium break-words">
                          · 나의 마라톤 '{matchedUserRace.name}' 매칭됨
                        </span>
                      )}
                    </p>
                  </div>

                  {/* 대회 태깅 & 나의 마라톤 동기화 컨트롤 버튼 영역 */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    {isCurrentSelectedRace ? (
                      <>
                        {/* 나의 마라톤 동기화 버튼 */}
                        {onSyncResultToUserRace && (
                          <button
                            type="button"
                            onClick={async () => {
                              const targetRace = matchedUserRace;
                              if (!targetRace) {
                                setSelectedRaceEntryId(selectedActivity.user_race_id || "");
                                setCustomRaceNameInput(selectedActivity.race_name || selectedActivity.activity_name || "");
                                setIsRaceAssignModalOpen(true);
                                return;
                              }
                              if (isCurrentSelectedDnf) {
                                const confirmSync = window.confirm(
                                  `이 활동은 목표 코스 미완주(DNF) 기록(${(selectedActivity.distance_meters / 1000).toFixed(1)}km)입니다.\n그래도 '${targetRace.name}'에 기록을 동기화하시겠습니까?`
                                );
                                if (!confirmSync) return;
                              }
                              const res = await onSyncResultToUserRace(targetRace.entryId || targetRace.id, selectedActivity);
                              if (res?.success) {
                                setSyncFeedback(`'${targetRace.name}'에 기록(${formatDuration(selectedActivity.duration_seconds)})이 성공적으로 동기화되었습니다!`);
                                setTimeout(() => setSyncFeedback(""), 4000);
                              }
                            }}
                            className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 transition shadow-sm active:scale-95 ${
                              isCurrentSelectedDnf
                                ? "border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300"
                                : "border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300"
                            }`}
                            title="나의 마라톤 탭에 완주 기록과 시간을 자동으로 반영합니다"
                          >
                            <span>{isCurrentSelectedDnf ? "⚠️" : "🏅"}</span>
                            <span>{isCurrentSelectedDnf ? "DNF 기록 동기화" : "완주 기록 동기화"}</span>
                          </button>
                        )}

                        {/* 일반 러닝으로 변경 버튼 */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm("이 활동을 일반 러닝으로 변경하시겠습니까? (대회 목록에서 제외됩니다)")) {
                              if (updateActivityRaceStatus) {
                                await updateActivityRaceStatus(selectedActivity.activity_id, {
                                  isRace: false,
                                  raceName: null,
                                  userRaceId: null
                                });
                              }
                            }
                          }}
                          className="rounded-xl border border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-700/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-rose-300 transition"
                          title="대회 지정을 해제하고 일반 러닝으로 전환합니다"
                        >
                          ✕ 일반 러닝으로 변경
                        </button>
                      </>
                    ) : (
                      /* 대회로 지정 버튼 */
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRaceEntryId(matchedUserRace?.entryId || matchedUserRace?.id || "");
                          setCustomRaceNameInput(matchedUserRace?.name || "");
                          setIsRaceAssignModalOpen(true);
                        }}
                        className="rounded-xl border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 px-3 py-1.5 text-xs font-bold text-amber-300 flex items-center gap-1.5 transition shadow-sm active:scale-95"
                      >
                        <span>🏆</span>
                        <span>대회로 지정</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* DNF(미완주) 감지 시 명확한 스포츠 알림 배너 */}
                {isCurrentSelectedRace && isCurrentSelectedDnf && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5">
                    <span className="text-base shrink-0">⚠️</span>
                    <div className="space-y-0.5">
                      <p className="font-bold text-rose-200">
                        {currentCompInfo.targetCategory} 코스 미완주 (DNF - Did Not Finish)
                      </p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        신청/목표 종목({currentCompInfo.targetCategory} {currentCompInfo.targetKm}km) 대비 실제 주행 거리({currentCompInfo.ranKm}km)가 부족하여 DNF로 자동 판정되었습니다.
                        마라톤 공식 규정에 따라 대회 완주 횟수 및 최고 기록(PB) 집계에서 자동으로 제외되었습니다.
                      </p>
                    </div>
                  </div>
                )}

                {/* 동기화 성공 알림 피드백 */}
                {syncFeedback && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center justify-between">
                    <span>✓ {syncFeedback}</span>
                    <button type="button" onClick={() => setSyncFeedback("")} className="text-zinc-400 hover:text-zinc-200 text-xs">✕</button>
                  </div>
                )}

                {/* 활동 핵심 지표 4대 카드: 폰트, 크기, 높이, 유닛 완벽 통일 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {/* 1. 총 거리 */}
                  <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-3.5 sm:p-4 space-y-2 flex flex-col justify-between min-h-[110px] shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                        총 거리 (DISTANCE)
                      </p>
                      <span className="text-sm">🏃</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight font-mono">
                        {(selectedActivity.distance_meters / 1000).toFixed(2)}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-1">km</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {selectedLaps.length}개 1km 랩 구간 완료{fiveKmChunks.length > 0 ? ` (${fiveKmChunks.length}개 5km 블록)` : ""}
                    </p>
                  </div>

                  {/* 2. 소요 시간 */}
                  <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-3.5 sm:p-4 space-y-2 flex flex-col justify-between min-h-[110px] shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                        소요 시간 (TIME)
                      </p>
                      <span className="text-sm">⏱️</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                        {formatDuration(selectedActivity.duration_seconds)}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono truncate">
                      {Math.floor(selectedActivity.duration_seconds / 60)}분 {selectedActivity.duration_seconds % 60}초 완주
                    </p>
                  </div>

                  {/* 3. 평균 페이스 */}
                  <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-3.5 sm:p-4 space-y-2 flex flex-col justify-between min-h-[110px] shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                        평균 페이스 (PACE)
                      </p>
                      <span className="text-sm">⚡</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight font-mono">
                        {formatPace(selectedActivity.avg_pace_seconds).replace("/km", "")}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-1">/km</span>
                    </div>
                    <p className="text-[10px] text-emerald-400 truncate">
                      1km당 평균 소요 시간
                    </p>
                  </div>

                  {/* 4. 평균 심박수 */}
                  <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-3.5 sm:p-4 space-y-2 flex flex-col justify-between min-h-[110px] shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                        평균 심박수 (HEART RATE)
                      </p>
                      <span className="text-sm">❤️</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight font-mono">
                        {selectedActivity.avg_heart_rate || "-"}
                      </span>
                      {selectedActivity.avg_heart_rate && <span className="text-xs sm:text-sm font-bold text-zinc-400 ml-1">bpm</span>}
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate">
                      최고 심박 {selectedActivity.max_heart_rate || "-"} bpm
                    </p>
                  </div>
                </div>

                {/* 1km & 5km 랩 인터랙티브 바 차트 */}
                {activeSplits.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span>📊 구간별 페이스 & 심박수 스플릿</span>
                        {/* 1km vs 5km 토글 버튼 */}
                        <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setSplitChunkMode("1k")}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                              splitChunkMode === "1k"
                                ? "bg-amber-400 text-zinc-950 shadow-sm"
                                : "text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            1km 단위
                          </button>
                          <button
                            type="button"
                            onClick={() => setSplitChunkMode("5k")}
                            disabled={!is5kAvailable}
                            title={!is5kAvailable ? "5km 이상 러닝에서 지원됩니다." : "5km 블록별 평균 페이스 비교"}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                              splitChunkMode === "5k"
                                ? "bg-amber-400 text-zinc-950 shadow-sm"
                                : is5kAvailable
                                ? "text-zinc-400 hover:text-zinc-200"
                                : "text-zinc-600 cursor-not-allowed opacity-50"
                            }`}
                          >
                            5km 단위 {fiveKmChunks.length > 0 ? `(${fiveKmChunks.length}구간)` : ""}
                          </button>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {splitChunkMode === "5k" ? "5km 가중 평균 페이스 · 소요시간" : "막대: 페이스 (낮을수록 빠름) · 뱃지: 심박"}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      {activeSplits.map((item, idx) => {
                        const pacePcnt = Math.max(20, Math.min(100, 100 - ((item.pace_seconds - minPace) / paceRange) * 70));
                        const isFastest = item.pace_seconds === minPace;
                        const label = splitChunkMode === "5k" ? item.label : `${item.lap_index}K`;

                        return (
                          <div key={item.chunk_index || item.lap_index || idx} className="flex items-center gap-2 text-xs font-mono">
                            <span className={`font-bold text-zinc-400 shrink-0 text-right ${splitChunkMode === "5k" ? "w-28 text-[11px]" : "w-8"}`}>
                              {label}
                            </span>

                            <div className="flex-1 h-7 rounded-lg bg-zinc-900/90 border border-zinc-800/80 p-0.5 flex items-center relative overflow-hidden">
                              <div
                                style={{ width: `${pacePcnt}%` }}
                                className={`h-full rounded-md transition-all ${
                                  isFastest
                                    ? "bg-gradient-to-r from-amber-500 to-amber-300"
                                    : "bg-gradient-to-r from-emerald-600/70 to-emerald-400/80"
                                }`}
                              />
                              <div className="absolute left-2.5 flex items-center gap-2">
                                <span className="text-[11px] font-bold text-zinc-100 drop-shadow">
                                  {formatPace(item.pace_seconds)}
                                </span>
                                {splitChunkMode === "5k" && item.duration_seconds && (
                                  <span className="text-[10px] text-zinc-300 drop-shadow font-normal hidden xs:inline">
                                    ({formatDuration(item.duration_seconds)})
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.avg_heart_rate && (
                              <span className="w-16 rounded-md bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[10px] text-center font-bold text-rose-300 shrink-0">
                                {item.avg_heart_rate} bpm
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 py-3 text-center">
                    해당 활동의 랩 스플릿 데이터가 없습니다.
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* 7. 스마트 스포츠 과학 리포트 (개별 러닝 ↔ 월간 종합 리포트 토글 지원) */}
      {hasActivities && (smartReport || monthlyReport) && (
        <div className="card-panel p-4 space-y-3.5 border-amber-400/30 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-800">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>🤖</span>
              <span>스포츠 과학 퍼포먼스 리포트</span>
            </h4>

            {/* 리포트 뷰 토글 탭 */}
            <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 shrink-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setReportTab("activity")}
                disabled={!smartReport}
                className={`px-2.5 py-1 rounded-lg transition ${
                  reportTab === "activity"
                    ? "bg-amber-400 text-zinc-950 font-bold shadow"
                    : "text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                }`}
              >
                🏃 선택 러닝 분석
              </button>
              <button
                type="button"
                onClick={() => setReportTab("monthly")}
                disabled={!monthlyReport}
                className={`px-2.5 py-1 rounded-lg transition ${
                  reportTab === "monthly"
                    ? "bg-amber-400 text-zinc-950 font-bold shadow"
                    : "text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                }`}
              >
                📅 {periodSummary.periodLabel} 종합 분석
              </button>
            </div>
          </div>

          {/* 7-1. [선택 활동 분석] 모드 */}
          {reportTab === "activity" && smartReport && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/40 px-3 py-1.5 rounded-lg border border-zinc-850">
                <span className="font-semibold text-zinc-300">
                  분석 대상: {smartReport.title}
                </span>
                <span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                  페이스 일관성 {smartReport.consistencyScore}점
                </span>
              </div>

              <div className="space-y-2.5">
                {smartReport.reportItems.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1">
                    <span className="inline-block text-xs font-bold text-amber-300">
                      {item.badge}
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* 대회 예상 완주 시간 (Pete Riegel 공식) */}
              {smartReport.predictions && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80">
                  <p className="text-xs font-bold text-zinc-200 mb-2 flex items-center gap-1.5">
                    <span>🔮</span> 이 러닝 페이스 기준 대회 예상 완주 시간 (Pete Riegel 공식)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="rounded-xl bg-zinc-850/60 border border-zinc-800 p-2">
                      <p className="text-[10px] text-zinc-400 font-medium">5K 예상</p>
                      <p className="text-xs font-bold text-zinc-100 font-mono mt-0.5">{smartReport.predictions.fiveK}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-850/60 border border-zinc-800 p-2">
                      <p className="text-[10px] text-zinc-400 font-medium">10K 예상</p>
                      <p className="text-xs font-bold text-zinc-100 font-mono mt-0.5">{smartReport.predictions.tenK}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-850/60 border border-zinc-800 p-2">
                      <p className="text-[10px] text-zinc-400 font-medium">하프 (21.1K)</p>
                      <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">{smartReport.predictions.half}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-850/60 border border-zinc-800 p-2">
                      <p className="text-[10px] text-zinc-400 font-medium">풀코스 (42.2K)</p>
                      <p className="text-xs font-bold text-amber-400 font-mono mt-0.5">{smartReport.predictions.full}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7-2. [월간 종합 분석] 모드 */}
          {reportTab === "monthly" && monthlyReport && (
            <div className="space-y-3">
              {/* 월간 핵심 요약 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-2.5">
                  <p className="text-[10px] text-zinc-400 font-medium">월 누적 거리</p>
                  <p className="text-sm font-extrabold text-amber-400 font-mono mt-0.5">
                    {monthlyReport.distKm} <span className="text-xs font-normal">km</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">총 {monthlyReport.totalRuns}회 러닝</p>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-2.5">
                  <p className="text-[10px] text-zinc-400 font-medium">월 평균 페이스</p>
                  <p className="text-sm font-extrabold text-zinc-100 font-mono mt-0.5">
                    {monthlyReport.avgPace}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">총 {monthlyReport.totalDurationFormatted}</p>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-2.5">
                  <p className="text-[10px] text-zinc-400 font-medium">월간 최장 거리 (LSD)</p>
                  <p className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">
                    {monthlyReport.longestKm} <span className="text-xs font-normal">km</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 break-words leading-tight mt-0.5" title={monthlyReport.longestRunName}>
                    {monthlyReport.longestRunName || "-"}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-2.5">
                  <p className="text-[10px] text-zinc-400 font-medium">월 평균 심박수</p>
                  <p className="text-sm font-extrabold text-rose-400 font-mono mt-0.5">
                    {monthlyReport.avgHr || "-"}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{monthlyReport.totalCalories || "-"}</p>
                </div>
              </div>

              {/* 월간 진단 리포트 항목 */}
              <div className="space-y-2.5">
                {monthlyReport.reportItems.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-1">
                    <span className="inline-block text-xs font-bold text-amber-300">
                      {item.badge}
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* 월간 최장주/대표 기록 기준 대회 예상 완주 시간 */}
              {monthlyReport.predictions && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <p className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <span>🔮</span> {periodSummary.periodLabel} 대표 기록 기준 마라톤 대회 예상 완주 시간
                    </p>
                    {monthlyReport.predictionBasis && (
                      <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded truncate max-w-[240px]" title={monthlyReport.predictionBasis}>
                        기준: {monthlyReport.predictionBasis}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="rounded-xl bg-zinc-850/60 border border-zinc-800 p-2">
                      <p className="text-[10px] text-zinc-400 font-medium">5K 예상</p>
                      <p className="text-xs font-bold text-zinc-100 font-mono mt-0.5">{monthlyReport.predictions.fiveK}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-850/60 border border-zinc-800 p-2">
                      <p className="text-[10px] text-zinc-400 font-medium">10K 예상</p>
                      <p className="text-xs font-bold text-zinc-100 font-mono mt-0.5">{monthlyReport.predictions.tenK}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-850/60 border border-zinc-800 p-2">
                      <p className="text-[10px] text-zinc-400 font-medium">하프 (21.1K)</p>
                      <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">{monthlyReport.predictions.half}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-850/60 border border-zinc-800 p-2">
                      <p className="text-[10px] text-zinc-400 font-medium">풀코스 (42.2K)</p>
                      <p className="text-xs font-bold text-amber-400 font-mono mt-0.5">{monthlyReport.predictions.full}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🏆 대회 지정 및 완주 기록 동기화 모달 */}
      {isRaceAssignModalOpen && selectedActivity && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setIsRaceAssignModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-900 p-5 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setIsRaceAssignModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800 transition"
            >
              ✕
            </button>

            {/* 헤더 */}
            <div>
              <h3 className="text-base font-black text-zinc-100 flex items-center gap-2">
                <span className="text-amber-400">🏆</span>
                <span>마라톤 대회로 지정하기</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                가민 러닝 기록을 참가한 마라톤 대회로 등록하고 완주 기록을 연동합니다.
              </p>
            </div>

            {/* 대상 러닝 활동 요약 카드 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-400">
                <span>활동 일시</span>
                <span className="text-zinc-200 font-bold">
                  {new Date(selectedActivity.start_time).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>주행 거리 / 소요 시간</span>
                <span className="text-amber-400 font-bold">
                  {(selectedActivity.distance_meters / 1000).toFixed(2)} km · {formatDuration(selectedActivity.duration_seconds)}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 gap-2">
                <span className="shrink-0">가민 원본 제목</span>
                <span className="text-zinc-300 truncate max-w-[260px] text-right" title={selectedActivity.activity_name || "러닝"}>
                  {selectedActivity.activity_name || "러닝"}
                </span>
              </div>
            </div>

            {/* 1. 나의 마라톤 등록 대회와 연결 (우선 추천) */}
            <div className="space-y-1.5">
              <label htmlFor="user-race-select" className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>1. '나의 마라톤' 등록 일정에서 선택 (추천)</span>
                {userRaces.length > 0 && (
                  <span className="text-[10px] text-amber-400 font-normal">등록된 대회 {userRaces.length}건</span>
                )}
              </label>
              <select
                id="user-race-select"
                value={selectedRaceEntryId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedRaceEntryId(val);
                  if (val) {
                    const match = userRaces.find((r) => String(r.entryId || r.id) === String(val));
                    if (match) {
                      setCustomRaceNameInput(match.name);
                    }
                  }
                }}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-amber-400 focus:border-amber-400 focus:outline-none transition cursor-pointer"
              >
                <option value="">-- 직접 새 대회명 입력하기 --</option>
                {userRaces.map((r) => (
                  <option key={r.entryId || r.id} value={r.entryId || r.id}>
                    {r.name} ({r.dateIso || r.date_display} · {r.distances || "종목 미지정"})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. 표시할 대회명 입력 */}
            <div className="space-y-1.5">
              <label htmlFor="custom-race-name-input" className="text-xs font-bold text-zinc-300">
                2. 표시할 대회명 입력
              </label>
              <input
                id="custom-race-name-input"
                type="text"
                value={customRaceNameInput}
                onChange={(e) => setCustomRaceNameInput(e.target.value)}
                placeholder="예: 2026 손기정 평화마라톤"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-100 placeholder-zinc-500 hover:border-amber-400 focus:border-amber-400 focus:outline-none transition"
              />
            </div>

            {/* 3. 완주 기록 자동 동기화 체크박스 */}
            {selectedRaceEntryId && onSyncResultToUserRace && (
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shouldAutoSyncResult}
                  onChange={(e) => setShouldAutoSyncResult(e.target.checked)}
                  className="rounded accent-amber-400"
                />
                <div className="text-xs text-amber-300">
                  <span className="font-bold">'나의 마라톤'에 완주 기록 자동 반영</span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    완주 시간({formatDuration(selectedActivity.duration_seconds)}) 및 페이스를 '나의 마라톤' 결과란에 자동 저장합니다.
                  </p>
                </div>
              </label>
            )}

            {/* 버튼 영역 */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsRaceAssignModalOpen(false)}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 py-2.5 text-xs font-semibold text-zinc-300 transition text-center"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveRaceAssignment}
                className="flex-1 rounded-xl bg-amber-400 hover:bg-amber-300 py-2.5 text-xs font-bold text-zinc-950 transition shadow text-center"
              >
                🏆 대회로 저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 가민 연동 모달 */}
      <GarminAuthModal
        isOpen={isGarminModalOpen}
        onClose={() => setIsGarminModalOpen(false)}
        onLinkSuccess={linkGarminAccount}
      />
    </div>
  );
}
