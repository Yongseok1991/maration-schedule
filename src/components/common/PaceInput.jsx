import { useMemo } from "react";

// 분 옵션: 2분대 ~ 15분대
const MINUTE_OPTIONS = Array.from({ length: 14 }, (_, i) => String(i + 2));

// 초 옵션: 00초 ~ 59초
const SECOND_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// "5:20/km" -> { m: "5", s: "20" }
function parsePaceToParts(val) {
  if (!val || typeof val !== "string") return { m: "", s: "" };
  const clean = val.replace("/km", "").trim();
  const parts = clean.split(":").map((p) => p.replace(/[^\d]/g, ""));
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
  const parts = useMemo(() => parsePaceToParts(value), [value]);

  const handleChange = (field, newVal) => {
    const next = { ...parts, [field]: newVal };

    // 모두 비어있으면 초기화
    if (!next.m && !next.s) {
      onChange && onChange("");
      return;
    }

    const finalM = next.m || "5";
    const finalS = next.s || "00";
    onChange && onChange(`${finalM}:${finalS}/km`);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange && onChange("");
  };

  const hasValue = Boolean(parts.m || parts.s);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        {hasValue && (
          <span className="text-[11px] font-semibold text-emerald-400/90 font-mono">
            {parts.m || "5"}분 {parts.s || "00"}초 /km
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 h-9 rounded-xl border border-zinc-800 bg-zinc-900/90 px-2 transition focus-within:border-amber-400/70 focus-within:ring-1 focus-within:ring-amber-400/20">
        <div className="flex items-center gap-1.5 w-full">
          {/* 분 (Minute) */}
          <select
            value={parts.m}
            onChange={(e) => handleChange("m", e.target.value)}
            className="dark-input h-7 px-1.5 text-xs font-mono font-bold text-zinc-100 bg-zinc-800/80 rounded-lg border-zinc-700/80 cursor-pointer flex-1 text-center"
          >
            <option value="">분</option>
            {MINUTE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}분
              </option>
            ))}
          </select>

          {/* 초 (Second) */}
          <select
            value={parts.s}
            onChange={(e) => handleChange("s", e.target.value)}
            className="dark-input h-7 px-1.5 text-xs font-mono font-bold text-zinc-100 bg-zinc-800/80 rounded-lg border-zinc-700/80 cursor-pointer flex-1 text-center"
          >
            <option value="">초</option>
            {SECOND_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}초
              </option>
            ))}
          </select>

          <span className="text-xs font-medium text-zinc-400 shrink-0 pr-1">/km</span>
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
