import { useState } from "react";
import { authService } from "../../services/authService";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        await authService.signUp({ email, password, nickname });
        setSuccessMsg("가입이 완료되었습니다! (확인 이메일이 발송되었을 수 있습니다.)");
        setTimeout(() => {
          onAuthSuccess && onAuthSuccess();
          onClose();
        }, 1200);
      } else {
        await authService.signIn({ email, password });
        onAuthSuccess && onAuthSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "인증 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white"
        >
          ✕
        </button>

        <h3 className="mb-2 text-xl font-bold text-white">
          {isSignUp ? "회원가입" : "로그인"}
        </h3>
        <p className="mb-6 text-sm text-zinc-400">
          {isSignUp
            ? "계정을 생성하여 모든 기기에서 마라톤 일정과 기록을 동기화하세요."
            : "로그인하면 클라우드에 저장된 기록을 불러오고 동기화합니다."}
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="러너 닉네임"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="runner@example.com"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">비밀번호</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자리 이상 비밀번호"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-400 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? "처리 중..." : isSignUp ? "가입하기" : "로그인"}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-zinc-400">
          {isSignUp ? "이미 계정이 있으신가요?" : "계정이 아직 없으신가요?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="font-medium text-amber-400 hover:underline"
          >
            {isSignUp ? "로그인하기" : "회원가입"}
          </button>
        </div>
      </div>
    </div>
  );
}
