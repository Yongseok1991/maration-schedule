import { useState, useRef } from "react";
import { formatPace, formatDuration, generateSmartReport } from "../../utils/performanceMath";
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
  const fileInputRef = useRef(null);

  // 선택된 액티비티에 대한 스마트 리포트 생성
  const smartReport = selectedActivity
    ? generateSmartReport(selectedActivity, selectedLaps)
    : null;

  // 1km 랩 차트용 페이스 최소/최대 계산 (차트 높이 정규화용)
  const maxPace = selectedLaps.length > 0 ? Math.max(...selectedLaps.map((l) => l.pace_seconds)) : 360;
  const minPace = selectedLaps.length > 0 ? Math.min(...selectedLaps.map((l) => l.pace_seconds)) : 280;
  const paceRange = Math.max(30, maxPace - minPace);

  // 가민 활동 파일(.json, .gpx 등) 또는 수동 임포트 처리
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        // JSON 형태인 경우
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
                ? `${garminAuth.garmin_email} 계정 등록됨 (매월 1일 새벽 04시 자동 수집)`
                : "가민 계정을 연동하면 1km 랩 페이스와 심박수가 자동으로 분석됩니다."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {garminAuth ? (
            <>
              <button
                onClick={triggerManualSync}
                disabled={syncing}
                className="rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span className={syncing ? "animate-spin" : ""}>🔄</span>
                <span>{syncing ? "동기화 중..." : "동기화 새로고침"}</span>
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

      {/* 2. 월간 핵심 지표 4대 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">이번 달 총 거리</p>
          <p className="text-xl font-black text-amber-400 tracking-tight">
            {monthlySummary.totalDistanceKm} <span className="text-xs font-bold text-zinc-300">km</span>
          </p>
          <p className="text-[10px] text-zinc-500">총 {monthlySummary.totalRuns}회 러닝</p>
        </div>

        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">월간 평균 페이스</p>
          <p className="text-xl font-black text-zinc-100 tracking-tight">
            {monthlySummary.avgPaceSeconds > 0 ? formatPace(monthlySummary.avgPaceSeconds) : "-:--/km"}
          </p>
          <p className="text-[10px] text-emerald-400">
            {monthlySummary.avgPaceSeconds > 0 ? "유산소 지속주" : "기록 대기 중"}
          </p>
        </div>

        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">평균 심박수</p>
          <p className="text-xl font-black text-rose-400 tracking-tight">
            {monthlySummary.avgHeartRate > 0 ? `${monthlySummary.avgHeartRate} bpm` : "- bpm"}
          </p>
          <p className="text-[10px] text-zinc-500">
            {monthlySummary.avgHeartRate > 0 ? "유산소 심박 영역" : "데이터 없음"}
          </p>
        </div>

        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">유산소 심폐 효율</p>
          <p className="text-xl font-black text-emerald-400 tracking-tight">
            {hasActivities ? monthlySummary.aerobicEfGrowth : "-"}
          </p>
          <p className="text-[10px] text-emerald-400/90">
            {hasActivities ? "동일 심박 대비 속도" : "동기화 대기 중"}
          </p>
        </div>
      </div>

      {/* 3. 데이터가 없을 때의 Empty State (정갈한 안내) */}
      {!hasActivities && (
        <div className="card-panel p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-2xl">
            📊
          </div>
          <h4 className="text-sm font-bold text-zinc-100">동기화된 러닝 기록이 아직 없습니다</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            {garminAuth
              ? `가민 계정(${garminAuth.garmin_email})이 등록되었습니다. 매월 1일 새벽 04시에 지난 1달간의 기록이 자동 수집되며, 수집 완료 시 1km 랩 분석 차트가 표시됩니다.`
              : "가민(Garmin Connect) 계정을 연동하거나 활동 데이터를 동기화하면 1km 구간별 페이스 스플릿과 심박수 분석이 시작됩니다."}
          </p>

          <div className="pt-2 flex items-center justify-center gap-2">
            {!garminAuth && (
              <button
                onClick={() => setIsGarminModalOpen(true)}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-bold text-zinc-950 transition shadow-sm"
              >
                가민 계정 연동하기
              </button>
            )}
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

      {/* 4. 최근 러닝 액티비티 선택 칩 */}
      {hasActivities && (
        <div className="card-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              러닝 액티비티 선택 ({activities.length}건)
            </h4>
            <span className="text-[11px] text-zinc-500">
              대회를 선택하면 1km 랩 스플릿이 표시됩니다
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {activities.map((act) => {
              const isSelected = act.activity_id === selectedActivityId;
              return (
                <button
                  key={act.activity_id}
                  onClick={() => setSelectedActivityId(act.activity_id)}
                  className={`px-3 py-2 rounded-xl border text-left shrink-0 transition ${
                    isSelected
                      ? "border-amber-400/80 bg-amber-400/15 text-zinc-100 shadow-md ring-1 ring-amber-400/30"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <p className="text-xs font-bold truncate max-w-[150px]">{act.activity_name}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {(act.distance_meters / 1000).toFixed(1)}km · {formatPace(act.avg_pace_seconds)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. 선택된 액티비티의 1km 랩 스플릿 시각화 차트 */}
      {hasActivities && selectedActivity && (
        <div className="card-panel p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-zinc-800/80">
            <div>
              <h3 className="text-base font-bold text-zinc-100">{selectedActivity.activity_name}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {new Date(selectedActivity.start_time).toLocaleDateString("ko-KR")} · 총 거리 {(selectedActivity.distance_meters / 1000).toFixed(2)}km · 소요 시간 {formatDuration(selectedActivity.duration_seconds)}
              </p>
            </div>
            <div className="flex items-center gap-2">
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

      {/* 6. 스마트 스포츠 과학 리포트 (규칙 엔진 자동 생성) */}
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
