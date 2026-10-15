import { useState, useEffect, useMemo } from "react";

const MIN_FILTER_MONTH = "2025-09";
const currentMonthKey = () => new Date().toISOString().slice(0, 7);
const clampMonthFromMin = (monthKey) => {
  const normalized = /^\d{4}-\d{2}$/.test(monthKey || "") ? monthKey : currentMonthKey();
  return normalized < MIN_FILTER_MONTH ? MIN_FILTER_MONTH : normalized;
};
const shiftMonth = (monthKey, delta) => {
  const [y, m] = String(monthKey || currentMonthKey()).split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function useRaces() {
  const [racesData, setRacesData] = useState({ updatedAt: null, races: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [month, setMonth] = useState(() => clampMonthFromMin(currentMonthKey()));
  const [openOnly, setOpenOnly] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => clampMonthFromMin(currentMonthKey()));
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    fetch("./data/races.json")
      .then((res) => res.json())
      .then((json) => {
        setRacesData({ updatedAt: json.updatedAt, races: json.races || [] });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load races.json:", err);
        setRacesData({ updatedAt: null, races: [] });
        setLoading(false);
      });
  }, []);

  const regions = useMemo(() => {
    const set = new Set();
    racesData.races.forEach((r) => {
      const match = (r.place || "").match(/^([가-힣]{2})/);
      if (match) set.add(match[1]);
    });
    return ["all", ...Array.from(set).sort()];
  }, [racesData.races]);

  const monthOptions = useMemo(() => {
    const set = new Set();
    racesData.races.forEach((r) => {
      const m = (r.date_iso || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(m)) set.add(m);
    });
    set.add(currentMonthKey());
    // 최신순 (내림차순, 최신 월이 맨 앞)
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [racesData.races]);

  const browseRaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = racesData.races.filter((race) => {
      if (openOnly && race.status !== "접수중") return false;
      if (region !== "all" && !(race.place || "").includes(region)) return false;
      if (month && !(race.date_iso || "").startsWith(month)) return false;
      if (!q) return true;
      return (
        (race.name || "").toLowerCase().includes(q) ||
        (race.place || "").toLowerCase().includes(q) ||
        (race.organizer || "").toLowerCase().includes(q)
      );
    });

    // 최신순 (날짜 내림차순: 최신 일자 대회 우선 정렬)
    return filtered.sort((a, b) => {
      const ad = a.date_iso || "";
      const bd = b.date_iso || "";
      return bd.localeCompare(ad);
    });
  }, [racesData.races, query, region, month, openOnly]);

  const racesByDate = useMemo(() => {
    const map = new Map();
    racesData.races.forEach((r) => {
      if (!r.date_iso) return;
      if (!map.has(r.date_iso)) map.set(r.date_iso, []);
      map.get(r.date_iso).push(r);
    });
    return map;
  }, [racesData.races]);

  return {
    races: racesData.races,
    racesByDate,
    updatedAt: racesData.updatedAt,
    loading,
    query,
    setQuery,
    region,
    setRegion,
    regions,
    month,
    setMonth,
    monthOptions,
    todayMonth: currentMonthKey(),
    openOnly,
    setOpenOnly,
    calendarMonth,
    setCalendarMonth,
    selectedDate,
    setSelectedDate,
    browseRaces,
    shiftMonth
  };
}
