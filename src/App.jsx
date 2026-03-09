import { useEffect, useMemo, useState } from "react";

const LABEL = {
  unknownDate: "일정 미정",
  title: "마라톤 일정",
  subtitle: "휴대폰에서 바로 보기 좋게 정리한 일정 뷰",
  updated: "업데이트",
  total: "전체",
  upcoming: "예정",
  searchPlaceholder: "대회명, 장소, 주최 검색",
  allRegion: "전체 지역",
  allMonth: "전체 월",
  openOnly: "접수중만",
  distance: "종목",
  region: "지역",
  place: "장소",
  organizer: "주최",
  contact: "문의",
  reg: "접수기간",
  raceHomepage: "대회 홈페이지",
  noResult: "조건에 맞는 일정이 없습니다."
};

const toDate = (race) => (race.date_iso ? new Date(`${race.date_iso}T00:00:00+09:00`) : null);

const formatDay = (race) => {
  if (race.date_display) return race.date_display;
  const d = toDate(race);
  if (!d || Number.isNaN(d.getTime())) return LABEL.unknownDate;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const unique = (arr) => [...new Set(arr.filter(Boolean))];

const statusBadgeClass = (status) => {
  if (status === "접수중") return "border-emerald-400/35 bg-emerald-400/15 text-emerald-200";
  if (status === "신규") return "border-amber-400/35 bg-amber-400/15 text-amber-200";
  return "border-zinc-500/35 bg-zinc-500/20 text-zinc-200";
};

export default function App() {
  const [data, setData] = useState({ updatedAt: null, races: [] });
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [month, setMonth] = useState("all");
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    fetch("./data/races.json")
      .then((res) => res.json())
      .then((json) => setData({ updatedAt: json.updatedAt, races: json.races || [] }))
      .catch(() => setData({ updatedAt: null, races: [] }));
  }, []);

  const regions = useMemo(() => unique(data.races.map((r) => r.region)).sort(), [data.races]);
  const months = useMemo(() => unique(data.races.map((r) => (r.date_iso || "").slice(0, 7))).sort(), [data.races]);

  const today = new Date(new Date().toDateString());

  const filtered = useMemo(() => {
    return data.races
      .filter((race) => {
        const d = toDate(race);
        if (d && d < today) return false;

        const text = `${race.name} ${race.place} ${race.organizer} ${race.distances}`.toLowerCase();
        const hitQuery = query.trim() ? text.includes(query.trim().toLowerCase()) : true;
        const hitRegion = region === "all" ? true : race.region === region;
        const hitMonth = month === "all" ? true : (race.date_iso || "").startsWith(month);
        const hitOpen = openOnly ? race.status === "접수중" : true;

        return hitQuery && hitRegion && hitMonth && hitOpen;
      })
      .sort((a, b) => {
        const ad = toDate(a);
        const bd = toDate(b);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad - bd;
      });
  }, [data.races, month, openOnly, query, region, today]);

  const upcomingCount = filtered.length;

  return (
    <main className="mx-auto w-full max-w-xl px-3 pb-20 pt-4 sm:px-4">
      <section className="hero-panel rounded-2xl p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">Maraton Mobile</p>
        <h1 className="mt-2 text-2xl font-black text-zinc-100">{LABEL.title}</h1>
        <p className="mt-1 text-xs text-zinc-400">{LABEL.subtitle}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="stat-chip">
            {LABEL.updated} {data.updatedAt ? new Date(data.updatedAt).toLocaleString("ko-KR") : "-"}
          </span>
          <span className="stat-chip">{LABEL.total} {data.races.length}건</span>
          <span className="stat-chip stat-chip-strong">{LABEL.upcoming} {upcomingCount}건</span>
        </div>
      </section>

      <section className="sticky top-2 z-20 mt-3 rounded-2xl border border-zinc-700/70 bg-zinc-950/90 p-3 backdrop-blur">
        <div className="grid grid-cols-1 gap-2">
          <input
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-300"
            placeholder={LABEL.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-300"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="all">{LABEL.allRegion}</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-300"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="all">{LABEL.allMonth}</option>
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100">
            <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
            {LABEL.openOnly}
          </label>
        </div>
      </section>

      <section className="mt-3 grid gap-3">
        {filtered.map((race) => (
          <article key={race.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">{formatDay(race)}</p>
                <h2 className="mt-1 text-lg font-bold leading-snug text-zinc-100">{race.name}</h2>
              </div>
              {race.status && (
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(race.status)}`}>
                  {race.status}
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-zinc-300">
              <p>{LABEL.distance}: {race.distances || "-"}</p>
              <p>{LABEL.region}: {race.region || "-"}</p>
              <p>{LABEL.place}: {race.place || "-"}</p>
              <p>{LABEL.organizer}: {race.organizer || "-"}</p>
              <p>{LABEL.contact}: {race.contact || "-"}</p>
              <p>{LABEL.reg}: {race.registration_period || "-"}</p>
            </div>

            {race.homepage && (
              <a className="mt-3 inline-block text-sm font-semibold text-amber-300 hover:text-amber-200" href={race.homepage} target="_blank" rel="noreferrer">
                {LABEL.raceHomepage}
              </a>
            )}
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-center text-sm text-zinc-400">
            {LABEL.noResult}
          </p>
        )}
      </section>
    </main>
  );
}
