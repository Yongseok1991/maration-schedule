import { useState } from "react";

export default function GarminAuthModal({ isOpen, onClose, onLinkSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessInfo(null);
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error("가민 계정 이메일과 비밀번호를 모두 입력해주세요.");
      }

      const res = await onLinkSuccess(email.trim(), password.trim());
      if (res?.error) {
        throw new Error(res.error);
      }

      // 수집 완료 피드백 표시 후 1.5초 뒤 모달 닫기
      setSuccessInfo({ count: res?.count ?? 0 });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || "가민 연동 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-900/95 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!loading && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 h-7 w-7 rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        )}

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⌚</span>
          <h3 className="text-xl font-bold tracking-tight text-zinc-100">Garmin Connect 연동</h3>
        </div>

        <p className="mb-4 text-xs text-zinc-400 leading-relaxed">
          가민 계정을 연동하면 과거 전체 러닝 기록, <strong>1km 구간별 페이스 스플릿</strong>, <strong>심박수</strong>, <strong>케이던스</strong>를 가져와 퍼포먼스를 정밀 분석합니다.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2">
            <span className="shrink-0 text-sm">⚠️</span>
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successInfo && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2.5">
            <span className="text-lg">🎉</span>
            <div>
              <p className="font-bold">가민 데이터 수집 완료!</p>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">
                총 {successInfo.count}건의 러닝 기록과 1km 랩 스플릿을 불러왔습니다.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200 space-y-2 animate-pulse">
            <div className="flex items-center gap-2.5 font-bold text-amber-300 text-sm">
              <svg className="animate-spin h-4 w-4 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>가민 서버에서 러닝 데이터 수집 중...</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed pl-6">
              가민 공식 SSO 로그인 및 과거 전체 활동(1km 랩 스플릿, 심박, 페이스)을 수집하고 있습니다. 활동량에 따라 약 15~30초 소요됩니다. 완료될 때까지 잠시만 기다려주세요!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Garmin Connect 이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="garmin_user@example.com"
              className="dark-input w-full px-3.5 py-2 text-xs text-zinc-100"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Garmin Connect 비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="가민 계정 비밀번호"
              className="dark-input w-full px-3.5 py-2 text-xs text-zinc-100"
              disabled={loading}
            />
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] text-zinc-300 space-y-1">
            <p className="font-semibold text-amber-300 flex items-center gap-1">
              🛡️ 안전한 세션 토큰 연동 안내
            </p>
            <p className="text-zinc-400 leading-relaxed">
              입력하신 비밀번호는 DB에 평문으로 저장되지 않으며, 가민 공식 SSO 세션 토큰을 발급받아 매월 1일 새벽 신규 기록을 수집하는 데만 사용됩니다.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(successInfo)}
            className="w-full rounded-xl bg-amber-400 py-3 text-xs font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-zinc-950" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>수집 완료될 때까지 동기화 진행 중...</span>
              </>
            ) : successInfo ? (
              <span>동기화 완료!</span>
            ) : (
              "가민 연동하고 전체 데이터 가져오기"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
