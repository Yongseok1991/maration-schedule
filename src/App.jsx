import { useEffect, useMemo, useState } from "react";

const TXT = {
  unknownDate: "\uc77c\uc815 \ubbf8\uc815",
  title: "\ub9c8\ub77c\ud1a4 \uc77c\uc815 \uc544\uce74\uc774\ube0c",
  updated: "\ub9c8\uc9c0\ub9c9 \uc5c5\ub370\uc774\ud2b8",
  total: "\uc804\uccb4",
  upcoming: "\ub2e4\uac00\uc624\ub294 \uc77c\uc815",
  searchPlaceholder: "\ub300\ud68c\uba85, \uc7a5\uc18c, \uc8fc\ucd5c \uac80\uc0c9",
  allRegion: "\uc804\uccb4 \uc9c0\uc5ed",
  allMonth: "\uc804\uccb4 \uc6d4",
  openOnly: "\uc811\uc218\uc911 \uc77c\uc815\ub9cc",
  distance: "\uc885\ubaa9",
  region: "\uc9c0\uc5ed",
  place: "\uc7a5\uc18c",
  organizer: "\uc8fc\ucd5c",
  contact: "\ubb38\uc758",
  reg: "\uc811\uc218\uae30\uac04",
  raceHomepage: "\ub300\ud68c \ud648\ud398\uc774\uc9c0 \ubc14\ub85c\uac00\uae30",
  noResult: "\uc870\uac74\uc5d0 \ub9de\ub294 \uc77c\uc815\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."
};

const toDate = (race) => (race.date_iso ? new Date(`${race.date_iso}T00:00:00+09:00`) : null);

const formatDay = (race) => {
  if (race.date_display) return race.date_display;
  const d = toDate(race);
  if (!d || Number.isNaN(d.getTime())) return TXT.unknownDate;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const unique = (arr) => [...new Set(arr.filter(Boolean))];

const statusBadgeClass = (status) => {
  if (status === "\uc811\uc218\uc911") return "bg-emerald-400/20 text-emerald-300 border-emerald-400/40";
  if (status === "\uc2e0\uaddc") return "bg-amber-400/20 text-amber-300 border-amber-400/40";
  return "bg-slate-500/20 text-slate-200 border-slate-500/40";
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

  const now = new Date();

  const filtered = useMemo(() => {
    return data.races
      .filter((race) => {
        const text = `${race.name} ${race.place} ${race.organizer} ${race.distances}`.toLowerCase();
        const hitQuery = query.trim() ? text.includes(query.trim().toLowerCase()) : true;
        const hitRegion = region === "all" ? true : race.region === region;
        const hitMonth = month === "all" ? true : (race.date_iso || "").startsWith(month);
        const hitOpen = openOnly ? race.status === "\uc811\uc218\uc911" : true;
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
  }, [data.races, month, openOnly, query, region]);

  const upcoming = filtered.filter((race) => {
    const d = toDate(race);
    return d && d >= new Date(now.toDateString());
  });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-700/50 bg-slate-900/55 p-5 shadow-glow backdrop-blur md:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Maraton Calendar</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-white md:text-5xl">{TXT.title}</h1>
        <p className="mt-3 text-sm text-slate-300 md:text-base">
          {TXT.updated} {data.updatedAt ? new Date(data.updatedAt).toLocaleString("ko-KR") : "-"} | {TXT.total} {data.races.length}\uac74 | {TXT.upcoming} {upcoming.length}\uac74
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-accent transition focus:ring"
            placeholder={TXT.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-accent transition focus:ring"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="all">{TXT.allRegion}</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-accent transition focus:ring"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="all">{TXT.allMonth}</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-sm text-white">
            <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
            {TXT.openOnly}
          </label>
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        {filtered.map((race) => (
          <article key={race.id} className="rounded-2xl border border-slate-700/60 bg-panel/80 p-5 shadow-[0_8px_26px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{formatDay(race)}</p>
                <h2 className="mt-1 text-xl font-bold text-white">{race.name}</h2>
              </div>
              {race.status && (
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(race.status)}`}>
                  {race.status}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
              <p>{TXT.distance}: {race.distances || "-"}</p>
              <p>{TXT.region}: {race.region || "-"}</p>
              <p>{TXT.place}: {race.place || "-"}</p>
              <p>{TXT.organizer}: {race.organizer || "-"}</p>
              <p>{TXT.contact}: {race.contact || "-"}</p>
              <p>{TXT.reg}: {race.registration_period || "-"}</p>
            </div>

            {race.homepage && (
              <a className="mt-4 inline-block break-all text-sm font-semibold text-warm hover:underline" href={race.homepage} target="_blank" rel="noreferrer">
                {TXT.raceHomepage}
              </a>
            )}
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="rounded-xl border border-slate-700 bg-panel/60 p-6 text-center text-slate-300">{TXT.noResult}</p>
        )}
      </section>
    </main>
  );
}
