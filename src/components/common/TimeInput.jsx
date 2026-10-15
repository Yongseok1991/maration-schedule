import { useState, useEffect, useRef } from "react";

// 문자열 "HH:MM:SS" 또는 "MM:SS"를 { h, m, s } 숫자로 파싱
function parseTimeToParts(val) {
  if (!val || typeof val !== "string") return { h: "", m: "", s: "" };
  const parts = val.trim().split(":").map((p) => p.replace(/[^\d]/g, ""));
  if (parts.length === 3) {
    return {
      h: parts[0] ? String(Number(parts[0])).padStart(2, "0") : "",
      m: parts[1] ? String(Math.min(59, Number(parts[1]))).padStart(2, "0") : "",
      s: parts[2] ? String(Math.min(59, Number(parts[2]))).padStart(2, "0") : ""
    };
  }
  if (parts.length === 2) {
    return {
      h: "00",
      m: parts[0] ? String(Math.min(59, Number(parts[0]))).padStart(2, "0") : "",
      s: parts[1] ? String(Math.min(59, Number(parts[1]))).padStart(2, "0") : ""
    };
  }
  return { h: "", m: "", s: "" };
}

export default function TimeInput({ label, value, onChange, highlightResult = false }) {
  const [parts, setParts] = useState(() => parseTimeToParts(value));
  const hourRef = useRef(null);
  const minRef = useRef(null);
  const secRef = useRef(null);

  useEffect(() => {
    setParts(parseTimeToParts(value));
  }, [value]);

  const emitChange = (nextParts) => {
    const { h, m, s } = nextParts;
    if (!h && !m && !s) {
      onChange && onChange("");
      return;
    }
    const finalH = h ? h.padStart(2, "0") : "00";
    const finalM = m ? m.padStart(2, "0") : "00";
    const finalS = s ? s.padStart(2, "0") : "00";
    onChange && onChange(`${finalH}:${finalM}:${finalS}`);
  };

  const handleHourChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
    const next = { ...parts, h: raw };
    setParts(next);
    emitChange(next);
    if (raw.length === 2) {
      minRef.current?.focus();
      minRef.current?.select();
    }
  };

  const handleMinChange = (e) => {
    let raw = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
    if (Number(raw) > 59) raw = "59";
    const next = { ...parts, m: raw };
    setParts(next);
    emitChange(next);
    if (raw.length === 2) {
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
    if (!parts.h && !parts.m && !parts.s) return;
    const padded = {
      h: parts.h ? parts.h.padStart(2, "0") : "00",
      m: parts.m ? parts.m.padStart(2, "0") : "00",
      s: parts.s ? parts.s.padStart(2, "0") : "00"
    };
    setParts(padded);
    emitChange(padded);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    const empty = { h: "", m: "", s: "" };
    setParts(empty);
    onChange && onChange("");
  };

  const hasValue = Boolean(parts.h || parts.m || parts.s);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${highlightResult ? "text-emerald-400 font-bold" : "text-zinc-400"}`}>
          {label}
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">시 : 분 : 초</span>
      </div>

      <div
        className={`flex items-center justify-between gap-1 h-9 rounded-xl border px-2.5 transition bg-zinc-900/90 ${
          highlightResult
            ? "border-emerald-500/40 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/30"
            : "border-zinc-800 focus-within:border-amber-400/70 focus-within:ring-1 focus-within:ring-amber-400/20"
        }`}
      >
        <div className="flex items-center gap-1 font-mono text-xs">
          {/* 시 */}
          <input
            ref={hourRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={parts.h}
            onChange={handleHourChange}
            onBlur={handleBlur}
            placeholder="00"
            className="w-6 text-center bg-transparent font-bold text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          <span className="text-zinc-500 font-bold leading-none">:</span>

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
            placeholder="00"
            className="w-6 text-center bg-transparent font-bold text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          <span className="text-zinc-500 font-bold leading-none">:</span>

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
            placeholder="00"
            className="w-6 text-center bg-transparent font-bold text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
        </div>

        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="h-4 w-4 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center text-[10px] transition"
            title="기록 지우기"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
