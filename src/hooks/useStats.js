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

const detectDistanceCategory = (value) => {
  const text = String(value || "").toLowerCase().replace(/\s+/g, "");
  if (!text) return "";
  if (text.includes("5km") || /(^|[^0-9])5k/.test(text)) return "5k";
  if (text.includes("42.195") || text.includes("풀코스") || /(^|[^0-9])42k/.test(text) || text.includes("풀")) return "full";
  if (text.includes("하프") || text.includes("21.0975") || /(^|[^0-9])21k/.test(text)) return "half";
  if (text.includes("10km") || /(^|[^0-9])10k/.test(text)) return "10k";
  return "";
};

const formatResultSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "기록 없음";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export function useStats(entries = [], shoes = []) {
  const pbSummary = useMemo(() => {
    const best = { "5k": null, "10k": null, half: null, full: null };
    (entries || []).forEach((entry) => {
      const category = entry.raceType || detectDistanceCategory(entry.distances) || detectDistanceCategory(entry.name);
      const seconds = parseResultSeconds(entry.resultTime);
      if (!category || !seconds || !(category in best)) return;
      const current = best[category];
      if (!current || seconds < current.seconds) {
        best[category] = { seconds, name: entry.name, dateIso: entry.dateIso || "" };
      }
    });
    return best;
  }, [entries]);

  const statsSummary = useMemo(() => ({
    totalRaces: (entries || []).length,
    finishedRaces: (entries || []).filter((entry) => parseResultSeconds(entry.resultTime)).length,
    shoesCount: (shoes || []).length
  }), [entries, shoes]);

  const totalEntryFee = useMemo(() => {
    return (entries || []).reduce((acc, e) => acc + parseEntryFee(e.entryFee), 0);
  }, [entries]);

  const yearlyEntryFees = useMemo(() => {
    const map = new Map();
    (entries || []).forEach((e) => {
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
    return (shoes || []).reduce((acc, s) => acc + parseEntryFee(s.price), 0);
  }, [shoes]);

  const yearlyShoePrices = useMemo(() => {
    const map = new Map();
    (shoes || []).forEach((s) => {
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
    pbSummary,
    statsSummary,
    totalEntryFee,
    yearlyEntryFees,
    totalShoePrice,
    yearlyShoePrices,
    formatResultSeconds,
    parseResultSeconds
  };
}
