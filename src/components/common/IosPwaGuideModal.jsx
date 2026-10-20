import React from "react";

export default function IosPwaGuideModal({ isOpen, onClose, isInAppBrowser = false }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-zinc-950 border border-amber-400/30 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-zinc-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-xl shrink-0">
              📱
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-100 tracking-tight flex items-center gap-1.5">
                <span>아이폰 마라톤 스마트 알림</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Apple(iOS) 정책에 따라 앱으로 홈 화면에 추가 후 이용 가능합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition"
            title="닫기"
          >
            ✕
          </button>
        </div>

        {/* 인앱 브라우저 경고 (카카오톡, 네이버, 인스타그램 등) */}
        {isInAppBrowser && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-rose-300">
              <span>⚠️</span>
              <span>현재 카카오톡/앱 내 브라우저입니다</span>
            </p>
            <p className="text-[11px] leading-relaxed text-rose-200/90">
              우측 하단의 <strong>더보기(⋯)</strong>를 누르고 <strong>'Safari(사파리)로 열기'</strong>를 먼저 선택한 후 아래 과정을 진행해주세요.
            </p>
          </div>
        )}

        {/* 3단계 가이드 리스트 */}
        <div className="space-y-3 text-xs">
          {/* 1단계 */}
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
            <span className="shrink-0 h-6 w-6 rounded-full bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center">
              1
            </span>
            <div className="flex-1 space-y-1">
              <p className="font-bold text-zinc-200">
                사파리 하단 중앙의 <span className="text-amber-400 font-extrabold">[공유 ⎋]</span> 버튼 터치
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                사파리 브라우저 화면 하단 메뉴바에 있는 네모 상자 위로 화살표 아이콘(공유 버튼)을 누릅니다.
              </p>
            </div>
          </div>

          {/* 2단계 */}
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
            <span className="shrink-0 h-6 w-6 rounded-full bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center">
              2
            </span>
            <div className="flex-1 space-y-1">
              <p className="font-bold text-zinc-200">
                메뉴에서 <span className="text-amber-400 font-extrabold">[홈 화면에 추가 ➕]</span> 선택
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                공유 메뉴를 아래로 스크롤하여 '홈 화면에 추가'를 누른 뒤, 우측 상단 <strong>[추가]</strong>를 터치합니다.
              </p>
            </div>
          </div>

          {/* 3단계 */}
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3">
            <span className="shrink-0 h-6 w-6 rounded-full bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center">
              3
            </span>
            <div className="flex-1 space-y-1">
              <p className="font-bold text-zinc-200">
                홈 화면의 <span className="text-amber-400 font-extrabold">‘RACEBOOK’ 앱</span>을 열고 알림 켜기
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                바탕화면에 생성된 앱 아이콘으로 접속하여 [알림 켜기]를 누르고, 시스템 팝업에서 <strong>[허용]</strong>을 누르면 완료됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 혜택 안내 */}
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-[11px] text-emerald-300 flex items-start gap-2 leading-relaxed">
          <span className="text-sm shrink-0">💡</span>
          <div>
            <strong>홈 화면에 추가하면:</strong> 화면이 꺼져 있어도 마라톤 접수 시작일과 D-Day(D-7, D-3, D-1) 알림이 애플워치 및 잠금화면에 네이티브 앱처럼 실시간으로 울립니다. (iOS 16.4 이상 지원)
          </div>
        </div>

        {/* 하단 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-amber-400 text-zinc-950 font-extrabold text-xs hover:bg-amber-300 transition shadow-md"
        >
          확인했습니다
        </button>
      </div>
    </div>
  );
}
