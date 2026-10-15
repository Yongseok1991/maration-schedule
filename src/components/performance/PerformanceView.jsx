import { useState, useRef, useMemo, useEffect } from "react";
import {
  formatPace,
  formatDuration,
  generateSmartReport,
  generateMonthlyReport,
  isRaceActivity,
  getRaceCategory
} from "../../utils/performanceMath";
import GarminAuthModal from "./GarminAuthModal";

export default function PerformanceView({ performanceState, onOpenAuth }) {
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
    triggerManualSync
  } = performanceState;

  const [isGarminModalOpen, setIsGarminModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(""); // 처음 진입 시 가장 최근 월로 자동 초기화
  const [filterRaceOnly, setFilterRaceOnly] = useState(false); // 사용자가 직접 제목을 수정한 대회 기록만 필터
  const [isListExpanded, setIsListExpanded] = useState(false); // 목록 5개 초과 시 접기/펼치기
  const [reportTab, setReportTab] = useState("activity"); // "activity" | "monthly"
  const fileInputRef = useRef(null);

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

      const isRace = isRaceActivity(act);
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
  }, [activities]);

  // 2. 처음 진입 시 가장 최근 월(latestMonthKey)로 자동 선택
  useEffect(() => {
    if (latestMonthKey && !selectedMonth) {
      setSelectedMonth(latestMonthKey);
    }
  }, [latestMonthKey, selectedMonth]);

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

    // 대회 기록만 보기 (사용자가 직접 제목을 수정한 대회명 필터)
    if (filterRaceOnly) {
      list = list.filter(isRaceActivity);
    }

    return list;
  }, [activities, selectedMonth, filterRaceOnly]);

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

  // 6. 선택된 기간/필터에 따른 핵심 지표 동적 계산
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
    const raceCount = filteredActivities.filter(isRaceActivity).length;

    let periodLabel = "전체 기간";
    if (selectedMonth !== "all" && selectedMonth) {
      const [y, m] = selectedMonth.split("-");
      periodLabel = `${y}년 ${parseInt(m, 10)}월`;
    }

    return {
      periodLabel,
      totalDistanceKm: (totalDistMeters / 1000).toFixed(1),
      totalRuns: filteredActivities.length,
      avgPaceSeconds: Math.round(avgPace),
      avgHeartRate: Math.round(avgHr),
      raceCount
    };
  }, [filteredActivities, selectedMonth]);

  // 7. 선택된 액티비티 스마트 리포트 및 월간 종합 리포트 생성
  const smartReport = selectedActivity
    ? generateSmartReport(selectedActivity, selectedLaps)
    : null;

  const monthlyReport = useMemo(() => {
    return generateMonthlyReport(periodSummary.periodLabel, filteredActivities);
  }, [periodSummary.periodLabel, filteredActivities]);

  // 1km 랩 차트용 페이스 최소/최대 계산
  const maxPace = selectedLaps.length > 0 ? Math.max(...selectedLaps.map((l) => l.pace_seconds)) : 360;
  const minPace = selectedLaps.length > 0 ? Math.min(...selectedLaps.map((l) => l.pace_seconds)) : 280;
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
          {/* 월별 셀렉트 박스 */}
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

          {/* 대회 기록만 선택 토글 탭 */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between sm:justify-start">
            <span className="text-xs font-medium text-zinc-400 shrink-0">구분:</span>
            <div className="grid grid-cols-2 sm:flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setFilterRaceOnly(false)}
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
                onClick={() => setFilterRaceOnly(true)}
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

      {/* 3. 선택된 월/대회 기준 핵심 지표 4대 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">
            {filterRaceOnly
              ? `${periodSummary.periodLabel} 대회 총 거리`
              : `${periodSummary.periodLabel} 총 거리`}
          </p>
          <p className="text-xl font-black text-amber-400 tracking-tight">
            {periodSummary.totalDistanceKm} <span className="text-xs font-bold text-zinc-300">km</span>
          </p>
          <p className="text-[10px] text-zinc-500">
            총 {periodSummary.totalRuns}회 {filterRaceOnly ? "대회 완주" : "러닝"}
            {periodSummary.raceCount > 0 && !filterRaceOnly && ` (대회 ${periodSummary.raceCount}건 포함)`}
          </p>
        </div>

        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">
            {filterRaceOnly ? "대회 평균 페이스" : "기간 평균 페이스"}
          </p>
          <p className="text-xl font-black text-zinc-100 tracking-tight">
            {periodSummary.avgPaceSeconds > 0 ? formatPace(periodSummary.avgPaceSeconds) : "-:--/km"}
          </p>
          <p className="text-[10px] text-emerald-400">
            {periodSummary.avgPaceSeconds > 0 ? (filterRaceOnly ? "대회 레이스 페이스" : "유산소 지속 페이스") : "기록 대기 중"}
          </p>
        </div>

        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">
            {filterRaceOnly ? "대회 평균 심박수" : "평균 심박수"}
          </p>
          <p className="text-xl font-black text-rose-400 tracking-tight">
            {periodSummary.avgHeartRate > 0 ? `${periodSummary.avgHeartRate} bpm` : "- bpm"}
          </p>
          <p className="text-[10px] text-zinc-500">
            {periodSummary.avgHeartRate > 0 ? (filterRaceOnly ? "레이스 역치 심박 구간" : "유산소 심박 영역") : "데이터 없음"}
          </p>
        </div>

        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">
            {filterRaceOnly ? "완주한 대회 수" : "유산소 심폐 효율"}
          </p>
          <p className="text-xl font-black text-emerald-400 tracking-tight">
            {filterRaceOnly ? `${periodSummary.raceCount}개 대회` : (hasActivities ? monthlySummary.aerobicEfGrowth : "-")}
          </p>
          <p className="text-[10px] text-emerald-400/90">
            {filterRaceOnly ? "공식 레이스 완주 완료" : (hasActivities ? "동일 심박 대비 속도 성장" : "동기화 대기 중")}
          </p>
        </div>
      </div>

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
                <div className="relative flex-1 sm:w-64">
                  <select
                    value={selectedActivityId || ""}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="w-full appearance-none rounded-xl bg-zinc-950 border border-zinc-700/80 px-2.5 py-1.5 pr-7 text-xs font-bold text-zinc-100 hover:border-amber-400/80 focus:border-amber-400 focus:outline-none transition cursor-pointer truncate"
                  >
                    {filteredActivities.map((act) => {
                      const isRace = isRaceActivity(act);
                      const d = act.start_time ? new Date(act.start_time) : null;
                      const dateStr = d ? `${d.getMonth() + 1}.${d.getDate()}` : "";
                      const distKm = (act.distance_meters / 1000).toFixed(1);
                      return (
                        <option key={act.activity_id} value={act.activity_id}>
                          {isRace ? "🏆 " : ""}{dateStr} · {act.activity_name} ({distKm}km · {formatPace(act.avg_pace_seconds)})
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
            <div className="space-y-1.5 pt-1">
              {displayedActivities.map((act) => {
                const isSelected = act.activity_id === selectedActivityId;
                const isRace = isRaceActivity(act);
                const raceTag = isRace ? getRaceCategory(act) : null;
                const d = act.start_time ? new Date(act.start_time) : null;
                const dateText = d ? d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }) : "";

                return (
                  <button
                    key={act.activity_id}
                    onClick={() => setSelectedActivityId(act.activity_id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-amber-400/90 bg-amber-400/10 text-zinc-100 shadow-md ring-1 ring-amber-400/30"
                        : isRace
                        ? "border-amber-500/30 bg-zinc-900/70 text-zinc-300 hover:border-amber-400/60 hover:bg-zinc-900"
                        : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono text-zinc-400 shrink-0 w-16">
                        {dateText}
                      </span>

                      {isRace && (
                        <span className="text-[10px] font-extrabold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded border border-amber-400/40 shrink-0">
                          🏆 {raceTag}
                        </span>
                      )}

                      <span className={`text-xs font-bold truncate ${isSelected ? "text-amber-300" : "text-zinc-200"}`}>
                        {act.activity_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                      <span className="font-bold text-zinc-100">
                        {(act.distance_meters / 1000).toFixed(2)} km
                      </span>
                      <span className="text-zinc-400 hidden sm:inline">
                        {formatPace(act.avg_pace_seconds)}
                      </span>
                      {act.avg_heart_rate && (
                        <span className="text-rose-400 text-[11px] hidden sm:inline">
                          {act.avg_heart_rate} bpm
                        </span>
                      )}
                      <span className={`text-xs ${isSelected ? "text-amber-400 font-bold" : "text-zinc-600"}`}>
                        {isSelected ? "선택됨 ✓" : "선택"}
                      </span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-zinc-100">{selectedActivity.activity_name}</h3>
                {isRaceActivity(selectedActivity) && (
                  <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[11px] font-extrabold text-amber-300 flex items-center gap-1">
                    <span>🏆</span>
                    <span>{getRaceCategory(selectedActivity)}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {new Date(selectedActivity.start_time).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })} · 총 거리 {(selectedActivity.distance_meters / 1000).toFixed(2)}km · 소요 시간 {formatDuration(selectedActivity.duration_seconds)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
                평균 {formatPace(selectedActivity.avg_pace_seconds)}
              </span>
              {selectedActivity.avg_heart_rate && (
                <span className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300">
                  {selectedActivity.avg_heart_rate} bpm
                </span>
              )}
            </div>
          </div>

          {/* 1km 랩 인터랙티브 바 차트 */}
          {selectedLaps.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                <span>📊 1km 구간별 페이스 & 심박수 스플릿</span>
                <span className="text-[11px] text-zinc-500">막대: 페이스 (낮을수록 빠름) · 뱃지: 심박</span>
              </div>

              <div className="space-y-1.5 pt-2">
                {selectedLaps.map((lap) => {
                  const pacePcnt = Math.max(20, Math.min(100, 100 - ((lap.pace_seconds - minPace) / paceRange) * 70));
                  const isFastest = lap.pace_seconds === minPace;

                  return (
                    <div key={lap.lap_index} className="flex items-center gap-2 text-xs font-mono">
                      <span className="w-8 font-bold text-zinc-400 shrink-0 text-right">
                        {lap.lap_index}K
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
                        <span className="absolute left-2.5 text-[11px] font-bold text-zinc-100 drop-shadow">
                          {formatPace(lap.pace_seconds)}
                        </span>
                      </div>

                      {lap.avg_heart_rate && (
                        <span className="w-16 rounded-md bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[10px] text-center font-bold text-rose-300 shrink-0">
                          {lap.avg_heart_rate} bpm
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 py-3 text-center">
              해당 활동의 1km 랩 스플릿 데이터가 없습니다.
            </p>
          )}
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
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5" title={monthlyReport.longestRunName}>
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

      {/* 가민 연동 모달 */}
      <GarminAuthModal
        isOpen={isGarminModalOpen}
        onClose={() => setIsGarminModalOpen(false)}
        onLinkSuccess={linkGarminAccount}
      />
    </div>
  );
}
