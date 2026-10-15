import { useState, useEffect } from "react";
import { authService } from "../../services/authService";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // 모달 열릴 때 저장된 설정 및 잠금 상태 로드
  useEffect(() => {
    if (!isOpen) return;

    // 1. 아이디 기억하기 상태 및 저장된 이메일 복원
    const isRemember = localStorage.getItem("racebook_remember_email") === "true";
    const savedEmail = localStorage.getItem("racebook_saved_email") || "";
    setRememberEmail(isRemember);
    if (isRemember && savedEmail) {
      setEmail(savedEmail);
    }

    // 2. 로그인 상태 유지(자동 로그인) 설정 복원 (기본값: true)
    const savedKeepLoggedIn = localStorage.getItem("racebook_keep_logged_in") !== "false";
    setKeepLoggedIn(savedKeepLoggedIn);

    // 3. 무차별 대입 방어 잠금 상태 확인
    const lockoutUntilStr = localStorage.getItem("racebook_lockout_until");
    const storedAttempts = parseInt(localStorage.getItem("racebook_login_attempts") || "0", 10);
    setFailedAttempts(storedAttempts);

    if (lockoutUntilStr) {
      const lockoutUntil = parseInt(lockoutUntilStr, 10);
      const now = Date.now();
      if (lockoutUntil > now) {
        setLockoutRemaining(Math.ceil((lockoutUntil - now) / 1000));
      } else {
        localStorage.removeItem("racebook_lockout_until");
        localStorage.removeItem("racebook_login_attempts");
        setFailedAttempts(0);
        setLockoutRemaining(0);
      }
    }
  }, [isOpen]);

  // 잠금 쿨다운 타이머 (매 초마다 카운트다운)
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem("racebook_lockout_until");
          localStorage.removeItem("racebook_login_attempts");
          setFailedAttempts(0);
          setErrorMsg("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

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
        await authService.signIn({ email, password, keepLoggedIn });

        // 아이디 기억하기 처리 (비밀번호는 절대 저장하지 않음)
        if (rememberEmail) {
          localStorage.setItem("racebook_remember_email", "true");
          localStorage.setItem("racebook_saved_email", email.trim());
        } else {
          localStorage.removeItem("racebook_remember_email");
          localStorage.removeItem("racebook_saved_email");
        }

        // 로그인 성공 시 보안 카운트 초기화
        localStorage.removeItem("racebook_login_attempts");
        localStorage.removeItem("racebook_lockout_until");
        setFailedAttempts(0);

        onAuthSuccess && onAuthSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      if (!isSignUp) {
        // 로그인 실패 시 시도 횟수 누적 및 5회 초과 시 60초 잠금
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        localStorage.setItem("racebook_login_attempts", String(newAttempts));

        if (newAttempts >= 5) {
          const lockoutUntil = Date.now() + 60 * 1000;
          localStorage.setItem("racebook_lockout_until", String(lockoutUntil));
          setLockoutRemaining(60);
          setErrorMsg("연속 5회 로그인 실패로 인해 계정 보호를 위해 60초 동안 로그인이 일시 차단됩니다.");
        } else {
          setErrorMsg(
            `${err.message || "이메일 또는 비밀번호가 올바르지 않습니다."} (연속 ${newAttempts}/5회 실패 시 60초간 잠금)`
          );
        }
      } else {
        setErrorMsg(err.message || "가입 처리 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-900/95 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 h-7 w-7 rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-white flex items-center justify-center transition"
        >
          ✕
        </button>

        <h3 className="mb-1.5 text-xl font-bold tracking-tight text-zinc-100">
          {isSignUp ? "회원가입" : "로그인"}
        </h3>
        <p className="mb-5 text-xs text-zinc-400 leading-relaxed">
          {isSignUp
            ? "계정을 생성하여 모든 기기에서 마라톤 일정과 기록을 동기화하세요."
            : "로그인하면 클라우드에 저장된 기록을 불러오고 동기화합니다."}
        </p>

        {isLocked && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs text-rose-300 flex items-center gap-2 font-medium">
            <span className="text-base">🚨</span>
            <div>
              로그인 5회 실패로 계정 보호 잠금 중입니다.
              <br />
              <strong className="text-amber-400 font-bold">{lockoutRemaining}초</strong> 후 다시 시도하실 수 있습니다.
            </div>
          </div>
        )}

        {!isLocked && errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="러너 닉네임"
                className="dark-input w-full px-3.5 py-2 text-xs text-zinc-100"
                disabled={isLocked || loading}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="runner@example.com"
              className="dark-input w-full px-3.5 py-2 text-xs text-zinc-100"
              disabled={isLocked || loading}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">비밀번호</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자리 이상 비밀번호"
                className="dark-input w-full px-3.5 py-2 pr-10 text-xs text-zinc-100"
                disabled={isLocked || loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition p-1"
                title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {!isSignUp && (
            <div className="space-y-2 pt-1 pb-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-amber-400 focus:ring-amber-400/30 accent-amber-400 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>이메일 기억하기</span>
                </label>

                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-amber-400 focus:ring-amber-400/30 accent-amber-400 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>로그인 상태 유지</span>
                </label>
              </div>

              {!keepLoggedIn && (
                <div className="text-[11px] text-amber-400/90 bg-amber-400/10 rounded-lg px-2.5 py-1.5 border border-amber-400/25 flex items-start gap-1.5">
                  <span>🛡️</span>
                  <span>
                    <strong>공용 PC 모드:</strong> 브라우저 창을 닫으면 로그인 세션이 즉시 자동 소멸됩니다.
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLocked
              ? `🔒 잠금 중 (${lockoutRemaining}초 남음)`
              : loading
              ? "처리 중..."
              : isSignUp
              ? "가입하기"
              : "로그인"}
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
            className="font-semibold text-amber-400 hover:underline ml-1"
          >
            {isSignUp ? "로그인하기" : "회원가입"}
          </button>
        </div>
      </div>
    </div>
  );
}
