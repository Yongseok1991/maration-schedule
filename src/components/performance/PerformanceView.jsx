import { useState, useRef, useMemo, useEffect } from "react";
import {
  formatPace,
  formatDuration,
  generateSmartReport,
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
  const [selectedMonth, setSelectedMonth] = useState("all"); // 'all' 또는 'YYYY-MM'
  const [filterRaceOnly, setFilterRaceOnly] = useState(false); // 대회 기록만 필터링
  const fileInputRef = useRef(null);

  // 1. 전체 활동 중 대회 기록 총 개수 및 월별 통계 집계
  const { monthStatsList, totalRaceCount, totalAllKm } = useMemo(() => {
    if (!activities || activities.length === 0) {
      return { monthStatsList: [], totalRaceCount: 0, totalAllKm: 0 };
    }

    const monthMap = {};
    let raceCount = 0;
    let allMeters = 0;

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
      totalAllKm: allMeters / 1000
    };
  }, [activities]);

  // 2. 선택된 월 및 대회 필터가 적용된 활동 목록
  const filteredActivities = useMemo(() => {
    if (!activities || activities.length === 0) return [];

    let list = activities;

    // 월별 필터
    if (selectedMonth !== "all") {
      list = list.filter((act) => {
        if (!act.start_time) return false;
        const d = new Date(act.start_time);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === selectedMonth;
      });
    }

    // 대회 기록만 필터
    if (filterRaceOnly) {
      list = list.filter(isRaceActivity);
    }

    return list;
  }, [activities, selectedMonth, filterRaceOnly]);

  // 3. 필터 변경 시 선택된 액티비티가 필터 목록에 없으면 첫 번째 활동 자동 선택
  useEffect(() => {
    if (filteredActivities.length > 0) {
      const exists = filteredActivities.some((a) => a.activity_id === selectedActivityId);
      if (!exists) {
        setSelectedActivityId(filteredActivities[0].activity_id);
      }
    }
  }, [filteredActivities, selectedActivityId, setSelectedActivityId]);

  // 4. 선택된 기간/필터에 따른 동적 핵심 지표 계산
  const periodSummary = useMemo(() => {
    if (!filteredActivities || filteredActivities.length === 0) {
      return {
        title: selectedMonth === "all" ? "전체 기간 총 거리" : "선택 기간 총 거리",
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
    if (selectedMonth !== "all") {
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

  // 5. 선택된 액티비티에 대한 스마트 리포트 생성
  const smartReport = selectedActivity
    ? generateSmartReport(selectedActivity, selectedLaps)
    : null;

  // 1km 랩 차트용 페이스 최소/최대 계산 (차트 높이 정규화용)
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

  return (
    <div className="space-y-4 mt-3">
      {/* 1. 가민 연동 상태 배너 */}
      <div className="card-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-lg shrink-0">
            ⌚
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100">Garmin Connect 연동</h3>
              {garminAuth ? (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  계정 등록됨
                </span>
              ) : (
                <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  미연동
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {garminAuth
                ? `${garminAuth.garmin_email} 계정 등록됨 (총 ${activities.length}회 수집됨)`
                : "가민 계정을 연동하면 1km 랩 페이스와 심박수가 자동으로 분석됩니다."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {garminAuth ? (
            <>
              <button
                onClick={() => setIsGarminModalOpen(true)}
                className="rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition"
              >
                <span>⚡</span>
                <span>전체 데이터 가져오기</span>
              </button>
              <button
                onClick={triggerManualSync}
                disabled={syncing}
                className="rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span className={syncing ? "animate-spin" : ""}>🔄</span>
                <span>{syncing ? "새로고침 중..." : "새로고침"}</span>
              </button>
              <button
                onClick={unlinkGarminAccount}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-rose-500/10 hover:border-rose-500/30 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-rose-400 transition"
              >
                연동 해제
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsGarminModalOpen(true)}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-1.5 text-xs font-bold text-zinc-950 transition shadow-sm"
            >
              가민 계정 연동하기
            </button>
          )}
        </div>
      </div>

      {/* 2. 월별 거리 선택 select 박스 & 대회 기록 전용 필터 툴바 */}
      {hasActivities && (
        <div className="card-panel p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/80 border-zinc-800/90">
          {/* 월별 셀렉트 박스 */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <label htmlFor="month-select" className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 shrink-0">
              <span className="text-amber-400">📅</span>
              <span>월별 거리 조회:</span>
            </label>
            <div className="relative flex-1 max-w-sm">
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full appearance-none rounded-xl bg-zinc-950 border border-zinc-700/90 px-3 py-1.5 pr-8 text-xs font-semibold text-zinc-100 hover:border-amber-400/80 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition cursor-pointer shadow-inner"
              >
                <option value="all">
                  🌐 전체 기간 누적 (총 {totalAllKm.toFixed(1)}km · {activities.length}회{totalRaceCount > 0 ? ` · 🏆대회 ${totalRaceCount}건` : ""})
                </option>
                {monthStatsList.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} (총 {(m.distanceMeters / 1000).toFixed(1)}km · {m.count}회{m.raceCount > 0 ? ` · 🏆대회 ${m.raceCount}건` : ""})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>

          {/* 대회 기록만 선택 토글 탭 */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-zinc-400 shrink-0">기록 구분:</span>
            <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800">
              <button
                type="button"
                onClick={() => setFilterRaceOnly(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
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
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  filterRaceOnly
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-md font-extrabold"
                    : "text-amber-400/90 hover:text-amber-300"
                }`}
              >
                <span>🏆</span>
                <span>대회 기록만 ({totalRaceCount})</span>
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

      {/* 5. 러닝/대회 액티비티 선택 칩 리스트 */}
      {hasActivities && (
        <div className="card-panel p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${filterRaceOnly ? "bg-amber-400" : "bg-emerald-400"}`} />
              <span>
                {filterRaceOnly
                  ? `🏆 마라톤 대회 기록 선택 (${filteredActivities.length}건)`
                  : `러닝 액티비티 선택 (${filteredActivities.length}건 / 전체 ${activities.length}건)`}
              </span>
            </h4>
            <span className="text-[11px] text-zinc-500">
              {filterRaceOnly
                ? "대회를 클릭하면 1km 랩 스플릿과 레이스 분석이 표시됩니다"
                : "액티비티를 클릭하면 1km 랩 스플릿이 표시됩니다"}
            </span>
          </div>

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
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {filteredActivities.map((act) => {
                const isSelected = act.activity_id === selectedActivityId;
                const isRace = isRaceActivity(act);
                const raceTag = isRace ? getRaceCategory(act) : null;

                return (
                  <button
                    key={act.activity_id}
                    onClick={() => setSelectedActivityId(act.activity_id)}
                    className={`px-3 py-2 rounded-xl border text-left shrink-0 transition relative ${
                      isSelected
                        ? "border-amber-400 bg-amber-400/15 text-zinc-100 shadow-md ring-1 ring-amber-400/40"
                        : isRace
                        ? "border-amber-500/40 bg-zinc-900/80 text-zinc-300 hover:border-amber-400/70"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 max-w-[170px]">
                      {isRace && (
                        <span className="text-[10px] font-extrabold text-amber-300 bg-amber-400/20 px-1 py-0.2 rounded border border-amber-400/40 shrink-0">
                          🏆 {raceTag}
                        </span>
                      )}
                      <p className="text-xs font-bold truncate">{act.activity_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-1">
                      <span>{(act.distance_meters / 1000).toFixed(1)}km</span>
                      <span>·</span>
                      <span className="font-mono text-zinc-300">{formatPace(act.avg_pace_seconds)}</span>
                      {act.start_time && (
                        <>
                          <span>·</span>
                          <span className="text-zinc-500 text-[9px]">
                            {new Date(act.start_time).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
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

      {/* 7. 스마트 스포츠 과학 리포트 */}
      {hasActivities && smartReport && (
        <div className="card-panel p-4 space-y-3.5 border-amber-400/30 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>🤖</span>
              <span>스포츠 과학 퍼포먼스 리포트</span>
            </h4>
            <span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              일관성 점수 {smartReport.consistencyScore}점
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

          {/* 마라톤 대회 예상 완주 시간 (Pete Riegel 공식) */}
          {smartReport.predictions && (
            <div className="mt-3 pt-3 border-t border-zinc-800/80">
              <p className="text-xs font-bold text-zinc-200 mb-2 flex items-center gap-1.5">
                <span>🔮</span> 현재 페이스 기준 대회 예상 완주 시간 (Riegel Formula)
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

      {/* 가민 연동 모달 */}
      <GarminAuthModal
        isOpen={isGarminModalOpen}
        onClose={() => setIsGarminModalOpen(false)}
        onLinkSuccess={linkGarminAccount}
      />
    </div>
  );
}
