import { useState, useEffect } from "react";

// 페이스 문자열을 "M:SS/km" 표준 포맷으로 자동 정규화
function normalizePaceString(input) {
  if (!input || typeof input !== "string") return "";
  const cleaned = input.trim().replace(/[^\d:]/g, "");
  if (!cleaned) return "";

  // 1. 콜론이 있는 경우 (예: 5:20 -> 5:20/km)
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":").filter((p) => p.length > 0);
    if (parts.length >= 2) {
      const m = Number(parts[0]);
      const s = String(Math.min(59, Number(parts[1]))).padStart(2, "0");
      return `${m}:${s}/km`;
    }
    if (parts.length === 1) {
      return `${Number(parts[0])}:00/km`;
    }
  }

  // 2. 숫자만 입력한 경우 (예: 520 -> 5:20/km, 430 -> 4:30/km)
  const digits = cleaned.replace(/[^\d]/g, "");
  if (digits.length === 3) {
    const m = digits.slice(0, 1);
    const s = String(Math.min(59, Number(digits.slice(1, 3)))).padStart(2, "0");
    return `${m}:${s}/km`;
  }
  if (digits.length === 4) {
    const m = digits.slice(0, 2);
    const s = String(Math.min(59, Number(digits.slice(2, 4)))).padStart(2, "0");
    return `${m}:${s}/km`;
  }
  if (digits.length <= 2) {
    return `${Number(digits)}:00/km`;
  }
  return `${cleaned}/km`;
}

// 실시간 한글 페이스 해석 (예: "5분 20초 /km")
function getPacePreview(val) {
  if (!val) return "";
  const norm = normalizePaceString(val);
  const clean = norm.replace("/km", "").trim();
  const parts = clean.split(":").map(Number);
  if (parts.length === 2 && !parts.some(Number.isNaN)) {
    return `${parts[0]}분 ${parts[1]}초 /km`;
  }
  return "";
}

export default function PaceInput({ label, value, onChange }) {
  const [text, setText] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setText(value || "");
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    // 숫자, 콜론, km 문자 허용
    const filtered = e.target.value.replace(/[^\d:km/]/gi, "");
    setText(filtered);
    onChange && onChange(filtered);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!text.trim()) {
      setText("");
      onChange && onChange("");
      return;
    }
    const formatted = normalizePaceString(text);
    setText(formatted);
    onChange && onChange(formatted);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setText("");
    onChange && onChange("");
  };

  const preview = getPacePreview(text);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        {preview && (
          <span className="text-[11px] font-semibold text-emerald-400/90 bg-emerald-400/10 px-1.5 py-0.2 rounded border border-emerald-400/20">
            {preview}
          </span>
        )}
      </div>

      <div className="relative flex items-center h-9 rounded-xl border border-zinc-800 bg-zinc-900/90 transition px-3 focus-within:border-amber-400/70 focus-within:ring-1 focus-within:ring-amber-400/20">
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onFocus={() => setIsFocused(true)}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="5:20/km (또는 520)"
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
