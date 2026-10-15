import { useMemo } from "react";

// 시 옵션: 00시 ~ 12시
const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i).padStart(2, "0"));

// 분/초 옵션: 00 ~ 59
const MIN_SEC_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// "03:45:00" -> { h: "03", m: "45", s: "00" }
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
    const p0 = Number(parts[0]);
    const p1 = Math.min(59, Number(parts[1]));
    if (p0 <= 6) {
      return { h: String(p0).padStart(2, "0"), m: String(p1).padStart(2, "0"), s: "00" };
    }
    return { h: "00", m: String(p0).padStart(2, "0"), s: String(p1).padStart(2, "0") };
  }
  return { h: "", m: "", s: "" };
}

export default function TimeInput({ label, value, onChange, highlightResult = false }) {
  const parts = useMemo(() => parseTimeToParts(value), [value]);

  const handleChange = (field, newVal) => {
    const next = { ...parts, [field]: newVal };

    // 모두 비어있으면 초기화
    if (!next.h && !next.m && !next.s) {
      onChange && onChange("");
      return;
    }

    const finalH = next.h || "00";
    const finalM = next.m || "00";
    const finalS = next.s || "00";
    onChange && onChange(`${finalH}:${finalM}:${finalS}`);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange && onChange("");
  };

  const hasValue = Boolean(parts.h || parts.m || parts.s);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${highlightResult ? "text-emerald-400 font-bold" : "text-zinc-400"}`}>
          {label}
        </span>
        {hasValue && (
          <span className="text-[11px] font-semibold text-amber-400/90 font-mono">
            {parts.h || "00"}시간 {parts.m || "00"}분 {parts.s || "00"}초
          </span>
        )}
      </div>

      <div
        className={`flex items-center justify-between gap-1 h-9 rounded-xl border px-2 transition bg-zinc-900/90 ${
          highlightResult
            ? "border-emerald-500/40 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/30"
            : "border-zinc-800 focus-within:border-amber-400/70 focus-within:ring-1 focus-within:ring-amber-400/20"
        }`}
      >
        <div className="flex items-center gap-1 w-full">
          {/* 시 (Hour) */}
          <select
            value={parts.h}
            onChange={(e) => handleChange("h", e.target.value)}
            className="dark-input h-7 px-1 text-xs font-mono font-bold text-zinc-100 bg-zinc-800/80 rounded-lg border-zinc-700/80 cursor-pointer flex-1 text-center"
          >
            <option value="">시</option>
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h}시
              </option>
            ))}
          </select>
          <span className="text-zinc-500 font-bold leading-none">:</span>

          {/* 분 (Minute) */}
          <select
            value={parts.m}
            onChange={(e) => handleChange("m", e.target.value)}
            className="dark-input h-7 px-1 text-xs font-mono font-bold text-zinc-100 bg-zinc-800/80 rounded-lg border-zinc-700/80 cursor-pointer flex-1 text-center"
          >
            <option value="">분</option>
            {MIN_SEC_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}분
              </option>
            ))}
          </select>
          <span className="text-zinc-500 font-bold leading-none">:</span>

          {/* 초 (Second) */}
          <select
            value={parts.s}
            onChange={(e) => handleChange("s", e.target.value)}
            className="dark-input h-7 px-1 text-xs font-mono font-bold text-zinc-100 bg-zinc-800/80 rounded-lg border-zinc-700/80 cursor-pointer flex-1 text-center"
          >
            <option value="">초</option>
            {MIN_SEC_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}초
              </option>
            ))}
          </select>
        </div>

        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 h-5 w-5 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center text-[10px] shrink-0 transition"
            title="초기화"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
