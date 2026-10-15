import { useState, useEffect } from "react";

// 문자열을 "HH:MM:SS" 표준 포맷으로 자동 정규화
function normalizeTimeString(input) {
  if (!input || typeof input !== "string") return "";
  const cleaned = input.trim().replace(/[^\d:]/g, "");
  if (!cleaned) return "";

  // 1. 콜론(:)이 포함된 경우
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":").filter((p) => p.length > 0);
    if (parts.length >= 3) {
      const h = String(Number(parts[0])).padStart(2, "0");
      const m = String(Math.min(59, Number(parts[1]))).padStart(2, "0");
      const s = String(Math.min(59, Number(parts[2]))).padStart(2, "0");
      return `${h}:${m}:${s}`;
    }
    if (parts.length === 2) {
      const p0 = Number(parts[0]);
      const p1 = Math.min(59, Number(parts[1]));
      // 6시간 이하일 경우 [시:분:00]으로 해석 (마라톤 기준 풀코스 통상 6시간 이내)
      if (p0 <= 6) {
        return `${String(p0).padStart(2, "0")}:${String(p1).padStart(2, "0")}:00`;
      }
      // 7 이상일 경우 [00:분:초]로 해석 (10K/5K 단거리 기록)
      return `00:${String(p0).padStart(2, "0")}:${String(p1).padStart(2, "0")}`;
    }
    if (parts.length === 1) {
      return `${String(Number(parts[0])).padStart(2, "0")}:00:00`;
    }
  }

  // 2. 콜론 없이 숫자만 연달아 입력한 경우 (예: 34500 -> 03:45:00, 4520 -> 00:45:20)
  const digits = cleaned.replace(/[^\d]/g, "");
  if (digits.length === 6) {
    const h = digits.slice(0, 2);
    const m = String(Math.min(59, Number(digits.slice(2, 4)))).padStart(2, "0");
    const s = String(Math.min(59, Number(digits.slice(4, 6)))).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  if (digits.length === 5) {
    const h = "0" + digits.slice(0, 1);
    const m = String(Math.min(59, Number(digits.slice(1, 3)))).padStart(2, "0");
    const s = String(Math.min(59, Number(digits.slice(3, 5)))).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  if (digits.length === 4) {
    const m = String(Math.min(59, Number(digits.slice(0, 2)))).padStart(2, "0");
    const s = String(Math.min(59, Number(digits.slice(2, 4)))).padStart(2, "0");
    return `00:${m}:${s}`;
  }
  if (digits.length === 3) {
    const h = "0" + digits.slice(0, 1);
    const m = String(Math.min(59, Number(digits.slice(1, 3)))).padStart(2, "0");
    return `${h}:${m}:00`;
  }
  if (digits.length <= 2) {
    return `${String(Number(digits)).padStart(2, "0")}:00:00`;
  }
  return cleaned;
}

// 사용자가 쉽게 오타를 인지하도록 한글 시간 해석 반환
function getTimePreview(val) {
  if (!val) return "";
  const norm = normalizeTimeString(val);
  const parts = norm.split(":").map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    const [h, m, s] = parts;
    if (h > 0) {
      return s > 0 ? `${h}시간 ${m}분 ${s}초` : `${h}시간 ${m}분`;
    }
    return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  }
  return "";
}

export default function TimeInput({ label, value, onChange, highlightResult = false }) {
  const [text, setText] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setText(value || "");
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    // 숫자와 콜론만 허용
    const filtered = e.target.value.replace(/[^\d:]/g, "");
    setText(filtered);
    // 실시간으로 상위 state에도 전달하되, 타이핑 중에는 강제 포맷팅하지 않음
    onChange && onChange(filtered);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!text.trim()) {
      setText("");
      onChange && onChange("");
      return;
    }
    const formatted = normalizeTimeString(text);
    setText(formatted);
    onChange && onChange(formatted);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setText("");
    onChange && onChange("");
  };

  const preview = getTimePreview(text);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${highlightResult ? "text-emerald-400 font-bold" : "text-zinc-400"}`}>
          {label}
        </span>
        {preview && (
          <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
            {preview}
          </span>
        )}
      </div>

      <div
        className={`relative flex items-center h-9 rounded-xl border bg-zinc-900/90 transition px-3 ${
          highlightResult
            ? "border-emerald-500/40 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/30"
            : "border-zinc-800 focus-within:border-amber-400/70 focus-within:ring-1 focus-within:ring-amber-400/20"
        }`}
      >
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onFocus={() => setIsFocused(true)}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="03:45:00 (또는 34500)"
          className="w-full bg-transparent font-mono text-xs font-semibold text-zinc-100 placeholder:text-zinc-600 outline-none pr-6"
        />

        {text && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 h-4 w-4 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center text-[10px] transition"
            title="초기화"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
