import { useMemo } from "react";

const parseEntryFee = (value) => {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
};

const parseResultSeconds = (value) => {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return null;
  const parts = cleanValue.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
};

const formatResultSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "기록 없음";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export function useStats(entries, shoes) {
  const pbMap = useMemo(() => {
    const bests = { "5k": null, "10k": null, half: null, full: null };
    entries.forEach((e) => {
      const type = e.raceType;
      if (!type || !(type in bests)) return;
      const secs = parseResultSeconds(e.resultTime);
      if (!secs) return;
      if (bests[type] === null || secs < bests[type]) {
        bests[type] = secs;
      }
    });
    return {
      pb5k: formatResultSeconds(bests["5k"]),
      pb10k: formatResultSeconds(bests["10k"]),
      pbHalf: formatResultSeconds(bests.half),
      pbFull: formatResultSeconds(bests.full)
    };
  }, [entries]);

  const totalEntryFee = useMemo(() => {
    return entries.reduce((acc, e) => acc + parseEntryFee(e.entryFee), 0);
  }, [entries]);

  const yearlyEntryFees = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const year = e.dateIso ? e.dateIso.slice(0, 4) : "미정";
      map.set(year, (map.get(year) || 0) + parseEntryFee(e.entryFee));
    });
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "미정") return 1;
      if (b[0] === "미정") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [entries]);

  const totalShoePrice = useMemo(() => {
    return shoes.reduce((acc, s) => acc + parseEntryFee(s.price), 0);
  }, [shoes]);

  const yearlyShoePrices = useMemo(() => {
    const map = new Map();
    shoes.forEach((s) => {
      const year = s.purchaseDate ? s.purchaseDate.slice(0, 4) : "미정";
      map.set(year, (map.get(year) || 0) + parseEntryFee(s.price));
    });
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "미정") return 1;
      if (b[0] === "미정") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [shoes]);

  return {
    pbMap,
    totalEntryFee,
    yearlyEntryFees,
    totalShoePrice,
    yearlyShoePrices,
    formatResultSeconds
  };
}
