import { useState } from "react";
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
    triggerManualSync
  } = performanceState;

  const [isGarminModalOpen, setIsGarminModalOpen] = useState(false);

  // 선택된 액티비티에 대한 스마트 리포트 생성
  const smartReport = selectedActivity
    ? generateSmartReport(selectedActivity, selectedLaps)
    : null;

  // 1km 랩 차트용 페이스 최소/최대 계산 (차트 높이 정규화용)
  const maxPace = Math.max(...(selectedLaps.map((l) => l.pace_seconds) || [360]));
  const minPace = Math.min(...(selectedLaps.map((l) => l.pace_seconds) || [280]));
  const paceRange = Math.max(30, maxPace - minPace);

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
                  연동 완료
                </span>
              ) : (
                <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  데모 모드
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {garminAuth
                ? `${garminAuth.garmin_email} 계정과 동기화 중 (매월 1일 새벽 자동 수집)`
                : "가민 계정을 연동하면 1km 랩 페이스와 심박수가 자동으로 동기화됩니다."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {garminAuth ? (
            <button
              onClick={triggerManualSync}
              disabled={syncing}
              className="rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <span className={syncing ? "animate-spin" : ""}>🔄</span>
              <span>{syncing ? "동기화 중..." : "최신 기록 가져오기"}</span>
            </button>
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
          <p className="text-[10px] text-zinc-500">총 {monthlySummary.totalRuns}회 러닝 완료</p>
        </div>

        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">월간 평균 페이스</p>
          <p className="text-xl font-black text-zinc-100 tracking-tight">
            {formatPace(monthlySummary.avgPaceSeconds)}
          </p>
          <p className="text-[10px] text-emerald-400">유산소 지속주 중심</p>
        </div>

        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">평균 심박수</p>
          <p className="text-xl font-black text-rose-400 tracking-tight">
            {monthlySummary.avgHeartRate} <span className="text-xs font-bold text-zinc-400">bpm</span>
          </p>
          <p className="text-[10px] text-zinc-500">Zone 2-3 유산소 영역</p>
        </div>

        <div className="card-panel p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-zinc-400">유산소 심폐 효율</p>
          <p className="text-xl font-black text-emerald-400 tracking-tight">
            +4.8% <span className="text-xs font-bold text-emerald-300">↑</span>
          </p>
          <p className="text-[10px] text-emerald-400/90">동일 심박 대비 속도 증가</p>
        </div>
      </div>

      {/* 3. 최근 러닝 액티비티 선택 칩 */}
      <div className="card-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            최근 러닝 액티비티 선택
          </h4>
          <span className="text-[11px] text-zinc-500">
            선택한 대회의 1km 랩 스플릿을 분석합니다
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

      {/* 4. 선택된 액티비티의 1km 랩 스플릿 시각화 차트 */}
      {selectedActivity && (
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
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
              <span>📊 1km 구간별 페이스 & 심박수 스플릿</span>
              <span className="text-[11px] text-zinc-500">막대: 페이스 (낮을수록 빠름) · 뱃지: 심박</span>
            </div>

            <div className="space-y-1.5 pt-2">
              {selectedLaps.map((lap) => {
                // 페이스 바 너비 계산 (빠른 페이스일수록 밝은 에메랄드/앰버)
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
        </div>
      )}

      {/* 5. 스마트 스포츠 과학 리포트 (규칙 엔진 자동 생성) */}
      {smartReport && (
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
