import { useState, useEffect, useRef } from "react";

// 문자열 "5:20/km", "05:20", "5분 20초" 등에서 { m, s } 파싱
function parsePaceToParts(val) {
  if (!val || typeof val !== "string") return { m: "", s: "" };
  const digitsOnly = val.replace(/[^\d:]/g, "");
  const parts = digitsOnly.split(":").filter(Boolean);
  if (parts.length >= 2) {
    return {
      m: parts[0] ? String(Number(parts[0])) : "",
      s: parts[1] ? String(Math.min(59, Number(parts[1]))).padStart(2, "0") : ""
    };
  }
  if (parts.length === 1 && parts[0]) {
    return { m: String(Number(parts[0])), s: "" };
  }
  return { m: "", s: "" };
}

export default function PaceInput({ label, value, onChange }) {
  const [parts, setParts] = useState(() => parsePaceToParts(value));
  const minRef = useRef(null);
  const secRef = useRef(null);

  useEffect(() => {
    setParts(parsePaceToParts(value));
  }, [value]);

  const emitChange = (nextParts) => {
    const { m, s } = nextParts;
    if (!m && !s) {
      onChange && onChange("");
      return;
    }
    const finalM = m || "5";
    const finalS = s ? s.padStart(2, "0") : "00";
    onChange && onChange(`${finalM}:${finalS}/km`);
  };

  const handleMinChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
    const next = { ...parts, m: raw };
    setParts(next);
    emitChange(next);
    if (raw.length === 1 && Number(raw) >= 3) {
      // 3분대 이상이면 분 입력 완료로 보고 초로 이동
      secRef.current?.focus();
      secRef.current?.select();
    }
  };

  const handleSecChange = (e) => {
    let raw = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
    if (Number(raw) > 59) raw = "59";
    const next = { ...parts, s: raw };
    setParts(next);
    emitChange(next);
  };

  const handleBlur = () => {
    if (!parts.m && !parts.s) return;
    const padded = {
      m: parts.m || "5",
      s: parts.s ? parts.s.padStart(2, "0") : "00"
    };
    setParts(padded);
    emitChange(padded);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    const empty = { m: "", s: "" };
    setParts(empty);
    onChange && onChange("");
  };

  const hasValue = Boolean(parts.m || parts.s);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <span className="text-[10px] text-zinc-500 font-mono">분 : 초 /km</span>
      </div>

      <div className="flex items-center justify-between gap-1 h-9 rounded-xl border border-zinc-800 bg-zinc-900/90 px-2.5 transition focus-within:border-amber-400/70 focus-within:ring-1 focus-within:ring-amber-400/20">
        <div className="flex items-center gap-1 font-mono text-xs">
          {/* 분 */}
          <input
            ref={minRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={parts.m}
            onChange={handleMinChange}
            onBlur={handleBlur}
            placeholder="5"
            className="w-5 text-center bg-transparent font-bold text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          <span className="text-zinc-400 text-[11px] font-sans font-medium">분</span>

          {/* 초 */}
          <input
            ref={secRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={parts.s}
            onChange={handleSecChange}
            onBlur={handleBlur}
            placeholder="20"
            className="w-6 text-center bg-transparent font-bold text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          <span className="text-zinc-400 text-[11px] font-sans font-medium">초 /km</span>
        </div>

        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="h-4 w-4 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center text-[10px] transition"
            title="페이스 지우기"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
