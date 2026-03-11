import { useEffect, useMemo, useRef, useState } from "react";

const TEXT = {
  tabs: {
    browse: "\ud0d0\uc0c9",
    mine: "\ub0b4 \uc77c\uc815",
    calendar: "\uce98\ub9b0\ub354",
    sync: "\ub3d9\uae30\ud654"
  },
  plannerTitle: "\ub9c8\ub77c\ud1a4 \ud50c\ub798\ub108",
  plannerDesc: "\ubaa9\ud45c, \uba54\ubaa8, \uae30\ub85d\uc99d, \uce98\ub9b0\ub354\ub97c \ud55c \ubc88\uc5d0 \uad00\ub9ac",
  updated: "\uc5c5\ub370\uc774\ud2b8",
  upcoming: "\ub2e4\uac00\uc624\ub294 \ub300\ud68c",
  myEntries: "\ub4f1\ub85d\ud55c \ub300\ud68c",
  searchPlaceholder: "\ub300\ud68c\uba85/\uc7a5\uc18c/\uc8fc\ucd5c \uac80\uc0c9",
  allRegions: "\uc804\uccb4 \uc9c0\uc5ed",
  allMonths: "\uc804\uccb4 \uc6d4",
  openOnly: "\uc811\uc218\uc911\ub9cc \ubcf4\uae30",
  noRaces: "\uc870\uac74\uc5d0 \ub9de\ub294 \ub300\ud68c\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.",
  noEntries: "\uc800\uc7a5\ud55c \ub0b4 \uc77c\uc815\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
  add: "\ub0b4 \uc77c\uc815\uc5d0 \ucd94\uac00",
  added: "\ucd94\uac00\ub428",
  remove: "\uc0ad\uc81c",
  dist: "\uc885\ubaa9",
  place: "\uc7a5\uc18c",
  reg: "\uc811\uc218\uae30\uac04",
  org: "\uc8fc\ucd5c",
  status: "\uc0c1\ud0dc",
  goalTime: "\ubaa9\ud45c \uc2dc\uac04",
  goalPace: "\ubaa9\ud45c \ud398\uc774\uc2a4",
  resultTime: "\uc2e4\uc81c \uae30\ub85d",
  memo: "\uba54\ubaa8",
  memoPlaceholder: "\ud6c8\ub828 \uba54\ubaa8, \uc900\ube44\ubb3c, \uc804\ub7b5 \ub4f1\uc744 \uc801\uc5b4\ub450\uc138\uc694.",
  resultNote: "\ub300\ud68c \ud6c4 \uba54\ubaa8",
  resultPlaceholder: "\ub300\ud68c \uacb0\uacfc\uc640 \ud68c\uace0\ub97c \uc801\uc5b4\ub450\uc138\uc694.",
  cert: "\uae30\ub85d\uc99d (\uc774\ubbf8\uc9c0 1\uc7a5)",
  certOnlyImage: "\uae30\ub85d\uc99d\uc740 \uc774\ubbf8\uc9c0 \ud30c\uc77c\ub9cc \uc5c5\ub85c\ub4dc\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
  certMaxSize: "\uae30\ub85d\uc99d \ud30c\uc77c\uc740 \ucd5c\ub300 4MB\uae4c\uc9c0 \ud5c8\uc6a9\ub429\ub2c8\ub2e4.",
  racePhotos: "\ub300\ud68c \uc0ac\uc9c4 (\ucd5c\ub300 6\uc7a5)",
  racePhotosTip: "\uac24\ub7ec\ub9ac\ub85c \ubcf4\uace0 \uc2f6\uc740 \ub300\ud68c \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uc138\uc694.",
  photoOnlyImage: "\ub300\ud68c \uc0ac\uc9c4\uc740 \uc774\ubbf8\uc9c0 \ud30c\uc77c\ub9cc \uc5c5\ub85c\ub4dc\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
  photoMaxSize: "\ub300\ud68c \uc0ac\uc9c4 \ud30c\uc77c\uc740 \ucd5c\ub300 4MB\uae4c\uc9c0 \ud5c8\uc6a9\ub429\ub2c8\ub2e4.",
  removePhoto: "\uc0ad\uc81c",
  homepage: "\ud648\ud398\uc774\uc9c0",
  prev: "\uc774\uc804",
  next: "\ub2e4\uc74c",
  selectDate: "\ub0a0\uc9dc\ub97c \uc120\ud0dd\ud558\uc138\uc694",
  noDateEntries: "\uc120\ud0dd\ud55c \ub0a0\uc9dc\uc5d0 \uc77c\uc815\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
  syncTitle: "GitHub PAT \ub3d9\uae30\ud654 (\ub85c\uadf8\uc778 \uc5c6\uc74c)",
  ownerPlaceholder: "Owner (\uc608: yongseok1991)",
  repoPlaceholder: "Repo (\uc608: maration-schedule)",
  branchPlaceholder: "\ube0c\ub79c\uce58",
  pathPlaceholder: "\ub370\uc774\ud130 \uacbd\ub85c",
  tokenPlaceholder: "Fine-grained PAT \ud1a0\ud070",
  autoSync: "\ubcc0\uacbd \uc2dc \uc790\ub3d9 \ub3d9\uae30\ud654",
  pull: "\uac00\uc838\uc624\uae30",
  push: "\uc800\uc7a5\ud558\uae30",
  syncNeedFields: "owner/repo/token\uc744 \uba3c\uc800 \uc785\ub825\ud558\uc138\uc694.",
  syncPulling: "GitHub\uc5d0\uc11c \uac00\uc838\uc624\ub294 \uc911...",
  syncPushing: "GitHub\ub85c \uc800\uc7a5 \uc911...",
  syncDone: "\ub3d9\uae30\ud654\uac00 \uc644\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
  sourceMissing: "\uc6d0\ubcf8 \uc77c\uc815 \uc5c6\uc74c"
};

const TABS = [
  { id: "browse", label: TEXT.tabs.browse },
  { id: "mine", label: TEXT.tabs.mine },
  { id: "calendar", label: TEXT.tabs.calendar },
  { id: "sync", label: TEXT.tabs.sync }
];

const STATUS_OPTIONS = ["interested", "registered", "training", "finished", "dns"];

const STATUS_LABEL = {
  interested: "\uad00\uc2ec",
  registered: "\uc811\uc218\uc644\ub8cc",
  training: "\uc900\ube44\uc911",
  finished: "\uc644\uc8fc",
  dns: "\ubd88\ucc38",
  "\uc811\uc218\uc911": "\uc811\uc218\uc911",
  "\uc2e0\uaddc": "\uc2e0\uaddc"
};

const STORAGE_KEYS = {
  entries: "maraton.my_entries.v1",
  syncConfig: "maraton.sync_config.v1"
};

const DEFAULT_SYNC = {
  owner: "yongseok1991",
  repo: "maration-schedule",
  branch: "master",
  path: "user-data/my-marathons.json",
  token: "",
  autoSync: true
};

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const toDate = (dateIso) => {
  if (!dateIso) return null;
  const d = new Date(`${dateIso}T00:00:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (dateIso, fallback = "\uc77c\uc815 \ubbf8\uc815") => {
  const d = toDate(dateIso);
  if (!d) return fallback;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const formatRegPeriod = (value) => {
  if (!value) return "-";
  const matches = [...value.matchAll(/(20\d{2})\D*(\d{1,2})\D*(\d{1,2})/g)];
  if (!matches.length) return value;
  const f = (m) => `${m[1]}.${m[2].padStart(2, "0")}.${m[3].padStart(2, "0")}`;
  return matches.length === 1 ? `${f(matches[0])}~` : `${f(matches[0])}~${f(matches[matches.length - 1])}`;
};

const encodeBase64Utf8 = (text) => btoa(unescape(encodeURIComponent(text)));
const decodeBase64Utf8 = (base64) => decodeURIComponent(escape(atob(base64)));

const statusBadgeClass = (status) => {
  if (status === "\uc811\uc218\uc911" || status === "registered") return "border-emerald-400/35 bg-emerald-400/15 text-emerald-200";
  if (status === "\uc2e0\uaddc") return "border-amber-400/35 bg-amber-400/15 text-amber-200";
  if (status === "finished") return "border-cyan-400/35 bg-cyan-400/15 text-cyan-200";
  return "border-zinc-500/35 bg-zinc-500/20 text-zinc-200";
};

const makeEntry = (race) => ({
  entryId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  raceId: race.id || null,
  name: race.name || "\uc774\ub984 \uc5c6\ub294 \ub300\ud68c",
  dateIso: race.date_iso || "",
  dateDisplay: race.date_display || "",
  place: race.place || "",
  distances: race.distances || "",
  homepage: race.homepage || "",
  status: "registered",
  goalTime: "",
  goalPace: "",
  memo: "",
  resultTime: "",
  resultNote: "",
  certificateDataUrl: "",
  racePhotoDataUrls: [],
  updatedAt: new Date().toISOString()
});

const monthKeyOf = (dateIso) => (dateIso ? dateIso.slice(0, 7) : "");

export default function App() {
  const [tab, setTab] = useState("browse");
  const [racesData, setRacesData] = useState({ updatedAt: null, races: [] });
  const [entries, setEntries] = useState(() => readJSON(STORAGE_KEYS.entries, []));
  const [syncConfig, setSyncConfig] = useState(() => ({ ...DEFAULT_SYNC, ...readJSON(STORAGE_KEYS.syncConfig, {}) }));
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [month, setMonth] = useState("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState("");
  const [syncState, setSyncState] = useState({ kind: "idle", message: "" });
  const [photoViewer, setPhotoViewer] = useState("");

  const syncTimerRef = useRef(null);
  const firstRef = useRef(true);

  useEffect(() => {
    fetch("./data/races.json")
      .then((res) => res.json())
      .then((json) => setRacesData({ updatedAt: json.updatedAt, races: json.races || [] }))
      .catch(() => setRacesData({ updatedAt: null, races: [] }));
  }, []);

  useEffect(() => {
    writeJSON(STORAGE_KEYS.entries, entries);
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    if (!syncConfig.autoSync || !syncConfig.owner || !syncConfig.repo || !syncConfig.token) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      pushToGitHub().catch((err) => setSyncState({ kind: "error", message: String(err?.message || err) }));
    }, 900);
    return () => syncTimerRef.current && clearTimeout(syncTimerRef.current);
  }, [entries, syncConfig.autoSync, syncConfig.owner, syncConfig.repo, syncConfig.token, syncConfig.branch, syncConfig.path]);

  useEffect(() => {
    writeJSON(STORAGE_KEYS.syncConfig, syncConfig);
  }, [syncConfig]);

  const regions = useMemo(() => [...new Set(racesData.races.map((r) => r.region).filter(Boolean))].sort(), [racesData.races]);
  const months = useMemo(() => [...new Set(racesData.races.map((r) => monthKeyOf(r.date_iso)).filter(Boolean))].sort(), [racesData.races]);
  const raceIdSet = useMemo(() => new Set(racesData.races.map((r) => r.id).filter(Boolean)), [racesData.races]);
  const raceById = useMemo(() => new Map(racesData.races.map((r) => [r.id, r])), [racesData.races]);

  const browseRaces = useMemo(() => {
    return racesData.races
      .filter((race) => {
        const hitOpen = openOnly ? race.status === "\uc811\uc218\uc911" : true;
        const text = `${race.name || ""} ${race.place || ""} ${race.organizer || ""} ${race.distances || ""}`.toLowerCase();
        const hitQuery = query.trim() ? text.includes(query.trim().toLowerCase()) : true;
        const hitRegion = region === "all" ? true : race.region === region;
        const hitMonth = month === "all" ? true : monthKeyOf(race.date_iso) === month;
        return hitOpen && hitQuery && hitRegion && hitMonth;
      })
      .sort((a, b) => {
        const ad = toDate(a.date_iso);
        const bd = toDate(b.date_iso);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad - bd;
      });
  }, [racesData.races, openOnly, query, region, month]);

  const myEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => {
        const ad = toDate(a.dateIso);
        const bd = toDate(b.dateIso);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad - bd;
      });
  }, [entries]);

  const entriesByDate = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      if (!e.dateIso) return;
      if (!map.has(e.dateIso)) map.set(e.dateIso, []);
      map.get(e.dateIso).push(e);
    });
    return map;
  }, [entries]);

  const selectedDateEntries = selectedDate ? entriesByDate.get(selectedDate) || [] : [];

  const addRaceToMyEntries = (race) => {
    if (entries.some((e) => e.raceId && e.raceId === race.id)) return;
    setEntries((prev) => [...prev, makeEntry(race)]);
    setTab("mine");
  };

  const updateEntry = (entryId, patch) => {
    setEntries((prev) => prev.map((e) => (e.entryId === entryId ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)));
  };

  const removeEntry = (entryId) => setEntries((prev) => prev.filter((e) => e.entryId !== entryId));

  const onCertificateChange = (entryId, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSyncState({ kind: "error", message: TEXT.certOnlyImage });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setSyncState({ kind: "error", message: TEXT.certMaxSize });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateEntry(entryId, { certificateDataUrl: String(reader.result || "") });
    reader.readAsDataURL(file);
  };

  const onRacePhotosChange = (entryId, fileList) => {
    const files = Array.from(fileList || []).slice(0, 6);
    if (!files.length) return;

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setSyncState({ kind: "error", message: TEXT.photoOnlyImage });
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        setSyncState({ kind: "error", message: TEXT.photoMaxSize });
        return;
      }
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.readAsDataURL(file);
          })
      )
    ).then((urls) => {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.entryId !== entryId) return e;
          const nextPhotos = [...(e.racePhotoDataUrls || []), ...urls].slice(0, 6);
          return { ...e, racePhotoDataUrls: nextPhotos, updatedAt: new Date().toISOString() };
        })
      );
    });
  };

  const removeRacePhoto = (entryId, index) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.entryId !== entryId) return e;
        const nextPhotos = [...(e.racePhotoDataUrls || [])];
        nextPhotos.splice(index, 1);
        return { ...e, racePhotoDataUrls: nextPhotos, updatedAt: new Date().toISOString() };
      })
    );
  };

  const githubApi = async (path, options = {}) => {
    const res = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${syncConfig.token}`,
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  };

  const pullFromGitHub = async () => {
    if (!syncConfig.owner || !syncConfig.repo || !syncConfig.token) {
      setSyncState({ kind: "error", message: TEXT.syncNeedFields });
      return;
    }
    setSyncState({ kind: "syncing", message: TEXT.syncPulling });
    try {
      const path = `/repos/${syncConfig.owner}/${syncConfig.repo}/contents/${encodeURIComponent(syncConfig.path)}?ref=${encodeURIComponent(syncConfig.branch || "master")}`;
      const file = await githubApi(path, { method: "GET" });
      const decoded = decodeBase64Utf8((file.content || "").replace(/\n/g, ""));
      const parsed = JSON.parse(decoded);
      const nextEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      setEntries(nextEntries);
      setSyncState({ kind: "success", message: `${nextEntries.length}\uac1c \uc77c\uc815\uc744 \uac00\uc838\uc654\uc2b5\ub2c8\ub2e4.` });
    } catch (err) {
      setSyncState({ kind: "error", message: String(err?.message || err) });
    }
  };

  const pushToGitHub = async () => {
    if (!syncConfig.owner || !syncConfig.repo || !syncConfig.token) {
      setSyncState({ kind: "error", message: TEXT.syncNeedFields });
      return;
    }
    setSyncState({ kind: "syncing", message: TEXT.syncPushing });
    const payload = { version: 1, updatedAt: new Date().toISOString(), entries };
    const content = encodeBase64Utf8(`${JSON.stringify(payload, null, 2)}\n`);
    const branch = syncConfig.branch || "master";
    const filePath = `/repos/${syncConfig.owner}/${syncConfig.repo}/contents/${encodeURIComponent(syncConfig.path)}`;
    try {
      let sha;
      try {
        const existing = await githubApi(`${filePath}?ref=${encodeURIComponent(branch)}`, { method: "GET" });
        sha = existing.sha;
      } catch {
        sha = undefined;
      }
      const bodyOf = (nextSha) => JSON.stringify({
        message: `sync: \ub9c8\ub77c\ud1a4 \uc77c\uc815 \uc5c5\ub370\uc774\ud2b8 (${entries.length})`,
        content,
        branch,
        sha: nextSha
      });
      const putOnce = (nextSha) =>
        githubApi(filePath, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: bodyOf(nextSha)
        });

      try {
        await putOnce(sha);
      } catch (err) {
        const msg = String(err?.message || err);
        if (!msg.includes("GitHub API 409")) throw err;
        const latest = await githubApi(`${filePath}?ref=${encodeURIComponent(branch)}`, { method: "GET" });
        await putOnce(latest?.sha);
      }
      setSyncState({ kind: "success", message: TEXT.syncDone });
    } catch (err) {
      setSyncState({ kind: "error", message: String(err?.message || err) });
    }
  };

  const renderBrowse = () => (
    <section className="mt-3 grid grid-cols-1 gap-3">
      {browseRaces.map((race) => {
        const alreadyAdded = entries.some((e) => e.raceId && e.raceId === race.id);
        return (
          <article key={race.id} className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-amber-300">{race.date_display || formatDate(race.date_iso)}</p>
              {race.status && <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(race.status)}`}>{STATUS_LABEL[race.status] || race.status}</span>}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <h2 className="text-[16px] font-bold leading-snug text-zinc-100">{race.name}</h2>
              <button
                className="h-7 w-7 rounded-md border border-amber-300/40 bg-amber-400/15 text-base font-bold leading-none text-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => addRaceToMyEntries(race)}
                disabled={alreadyAdded}
                aria-label={alreadyAdded ? TEXT.added : TEXT.add}
                title={alreadyAdded ? TEXT.added : TEXT.add}
              >
                {alreadyAdded ? "v" : "+"}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] text-zinc-300">
              <p className="truncate">{TEXT.dist}: {race.distances || "-"}</p>
              <p className="truncate">{TEXT.place}: {race.place || "-"}</p>
              <p className="col-span-2">{TEXT.reg}: {formatRegPeriod(race.registration_period)}</p>
              <p className="truncate">{TEXT.org}: {race.organizer || "-"}</p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {race.homepage && <a className="h-9 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-100 inline-flex items-center" href={race.homepage} target="_blank" rel="noreferrer">{TEXT.homepage}</a>}
            </div>
          </article>
        );
      })}
      {browseRaces.length === 0 && <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center text-sm text-zinc-400">{TEXT.noRaces}</p>}
    </section>
  );

  const renderMine = () => (
    <section className="mt-3 grid grid-cols-1 gap-3">
      {myEntries.map((entry) => {
        const missingFromSource = entry.raceId && !raceIdSet.has(entry.raceId);
        const fallbackHomepage = entry.homepage || (entry.raceId ? raceById.get(entry.raceId)?.homepage || "" : "");
        return (
        <article key={entry.entryId} className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-amber-300">{entry.dateDisplay || formatDate(entry.dateIso)}</p>
            <button className="text-[11px] font-semibold text-zinc-400 hover:text-red-300" onClick={() => removeEntry(entry.entryId)}>{TEXT.remove}</button>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-[16px] font-bold leading-snug text-zinc-100">{entry.name}</h2>
            {missingFromSource && <span className="rounded-full border border-rose-400/35 bg-rose-400/15 px-2 py-0.5 text-[11px] font-semibold text-rose-200">{TEXT.sourceMissing}</span>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] text-zinc-300">
            <label className="flex flex-col gap-1"><span>{TEXT.status}</span><select className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={entry.status} onChange={(e) => updateEntry(entry.entryId, { status: e.target.value })}>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span>{TEXT.goalTime}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={entry.goalTime} onChange={(e) => updateEntry(entry.entryId, { goalTime: e.target.value })} placeholder="03:45:00" /></label>
            <label className="flex flex-col gap-1"><span>{TEXT.goalPace}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={entry.goalPace} onChange={(e) => updateEntry(entry.entryId, { goalPace: e.target.value })} placeholder="5:20/km" /></label>
            <label className="flex flex-col gap-1"><span>{TEXT.resultTime}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={entry.resultTime} onChange={(e) => updateEntry(entry.entryId, { resultTime: e.target.value })} placeholder="03:51:10" /></label>
          </div>
          <label className="mt-2 flex flex-col gap-1 text-[13px] text-zinc-300"><span>{TEXT.memo}</span><textarea className="min-h-[72px] rounded-lg border border-zinc-700 bg-zinc-900 p-2" value={entry.memo} onChange={(e) => updateEntry(entry.entryId, { memo: e.target.value })} placeholder={TEXT.memoPlaceholder} /></label>
          <label className="mt-2 flex flex-col gap-1 text-[13px] text-zinc-300"><span>{TEXT.resultNote}</span><textarea className="min-h-[64px] rounded-lg border border-zinc-700 bg-zinc-900 p-2" value={entry.resultNote} onChange={(e) => updateEntry(entry.entryId, { resultNote: e.target.value })} placeholder={TEXT.resultPlaceholder} /></label>
          <div className="mt-2 flex items-center gap-2 text-[13px] text-zinc-300">{fallbackHomepage && <a className="h-8 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-100 inline-flex items-center" href={fallbackHomepage} target="_blank" rel="noreferrer">{TEXT.homepage}</a>}</div>
          <div className="mt-2 text-[13px] text-zinc-300">
            <p>{TEXT.racePhotos}</p>
            <p className="mt-1 text-xs text-zinc-400">{TEXT.racePhotosTip}</p>
            <input className="mt-1 block w-full text-sm text-zinc-300 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-zinc-100" type="file" accept="image/*" multiple onChange={(e) => onRacePhotosChange(entry.entryId, e.target.files)} />
            {(entry.racePhotoDataUrls || []).length > 0 && <div className="mt-2 grid grid-cols-3 gap-2">{(entry.racePhotoDataUrls || []).map((photo, idx) => <div key={idx} className="relative"><img alt="race-photo" src={photo} className="h-28 w-full cursor-zoom-in rounded-lg border border-zinc-700 object-contain bg-zinc-950 p-1" onClick={() => setPhotoViewer(photo)} /><button type="button" className="absolute right-1 top-1 rounded-md border border-black/40 bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white" onClick={() => removeRacePhoto(entry.entryId, idx)}>{TEXT.removePhoto}</button></div>)}</div>}
          </div>
          <div className="mt-2 text-[13px] text-zinc-300"><p>{TEXT.cert}</p><input className="mt-1 block w-full text-sm text-zinc-300 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-zinc-100" type="file" accept="image/*" onChange={(e) => onCertificateChange(entry.entryId, e.target.files?.[0])} />{entry.certificateDataUrl && <img alt="certificate" src={entry.certificateDataUrl} className="mt-2 max-h-40 w-full rounded-lg border border-zinc-700 object-contain bg-zinc-950" />}</div>
        </article>
      );})}
      {myEntries.length === 0 && <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center text-sm text-zinc-400">{TEXT.noEntries}</p>}
    </section>
  );

  const renderCalendar = () => {
    const [year, monthNum] = calendarMonth.split("-").map(Number);
    const first = new Date(year, monthNum - 1, 1);
    const last = new Date(year, monthNum, 0);
    const startWeekday = first.getDay();
    const daysInMonth = last.getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(`${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`);

    return (
      <section className="mt-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-200" onClick={() => { const d = new Date(year, monthNum - 2, 1); setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }}>{TEXT.prev}</button>
            <p className="font-semibold text-zinc-100">{calendarMonth}</p>
            <button className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-200" onClick={() => { const d = new Date(year, monthNum, 1); setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }}>{TEXT.next}</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-400">{["S","M","T","W","T","F","S"].map((w) => <div key={w}>{w}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((key, idx) => {
              if (!key) return <div key={`blank-${idx}`} className="h-10 rounded-md bg-zinc-900/20" />;
              const count = (entriesByDate.get(key) || []).length;
              const selected = selectedDate === key;
              return (
                <button key={key} className={`h-10 rounded-md border text-xs ${selected ? "border-amber-300 bg-amber-400/15 text-amber-200" : "border-zinc-800 bg-zinc-900/40 text-zinc-200"}`} onClick={() => setSelectedDate(key)}>
                  <div>{Number(key.slice(8, 10))}</div>{count > 0 && <div className="text-[10px] text-emerald-300">{count}</div>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/75 p-3">
          <p className="text-sm font-semibold text-zinc-100">{selectedDate ? `${selectedDate} \uc77c\uc815` : TEXT.selectDate}</p>
          <div className="mt-2 space-y-2">
            {selectedDateEntries.map((e) => <div key={e.entryId} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2"><p className="text-sm font-semibold text-zinc-100">{e.name}</p><p className="text-xs text-zinc-400">{e.place || "-"}</p></div>)}
            {selectedDate && selectedDateEntries.length === 0 && <p className="text-sm text-zinc-400">{TEXT.noDateEntries}</p>}
          </div>
        </div>
      </section>
    );
  };

  const renderSync = () => (
    <section className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 text-sm text-zinc-300">
      <p className="mb-2 text-zinc-100">{TEXT.syncTitle}</p>
      <div className="grid grid-cols-1 gap-2">
        <input className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3" placeholder={TEXT.ownerPlaceholder} value={syncConfig.owner} onChange={(e) => setSyncConfig((p) => ({ ...p, owner: e.target.value.trim() }))} />
        <input className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3" placeholder={TEXT.repoPlaceholder} value={syncConfig.repo} onChange={(e) => setSyncConfig((p) => ({ ...p, repo: e.target.value.trim() }))} />
        <input className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3" placeholder={TEXT.branchPlaceholder} value={syncConfig.branch} onChange={(e) => setSyncConfig((p) => ({ ...p, branch: e.target.value.trim() || "master" }))} />
        <input className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3" placeholder={TEXT.pathPlaceholder} value={syncConfig.path} onChange={(e) => setSyncConfig((p) => ({ ...p, path: e.target.value.trim() || DEFAULT_SYNC.path }))} />
        <input className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3" type="password" placeholder={TEXT.tokenPlaceholder} value={syncConfig.token} onChange={(e) => setSyncConfig((p) => ({ ...p, token: e.target.value.trim() }))} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={syncConfig.autoSync} onChange={(e) => setSyncConfig((p) => ({ ...p, autoSync: e.target.checked }))} />{TEXT.autoSync}</label>
        <div className="flex gap-2"><button className="h-10 rounded-lg border border-zinc-700 px-3" onClick={() => pullFromGitHub()}>{TEXT.pull}</button><button className="h-10 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 text-amber-200" onClick={() => pushToGitHub()}>{TEXT.push}</button></div>
        {syncState.kind !== "idle" && <p className={`rounded-md p-2 text-xs ${syncState.kind === "error" ? "bg-red-500/15 text-red-200" : syncState.kind === "success" ? "bg-emerald-500/15 text-emerald-200" : "bg-zinc-700/40 text-zinc-200"}`}>{syncState.message}</p>}
      </div>
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-xl px-3 pb-16 pt-3 sm:px-4">
      <section className="hero-panel rounded-2xl p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Maraton Mobile</p>
        <h1 className="mt-1 text-2xl font-black text-zinc-100">{TEXT.plannerTitle}</h1>
        <p className="mt-1 text-sm text-zinc-400">{TEXT.plannerDesc}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="stat-chip">{TEXT.updated} {racesData.updatedAt ? new Date(racesData.updatedAt).toLocaleDateString("ko-KR") : "-"}</span>
          <span className="stat-chip">{TEXT.upcoming} {browseRaces.length}{"\uac74"}</span>
          <span className="stat-chip stat-chip-strong">{TEXT.myEntries} {entries.length}{"\uac74"}</span>
        </div>
      </section>

      <section className="sticky top-2 z-20 mt-3 rounded-2xl border border-zinc-700/70 bg-zinc-950/90 p-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-1">{TABS.map((t) => <button key={t.id} className={`h-9 rounded-lg text-xs font-semibold ${tab === t.id ? "bg-amber-400/20 text-amber-200" : "bg-zinc-900 text-zinc-300"}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
        {tab === "browse" && (
          <div className="mt-2 grid grid-cols-1 gap-2">
            <input className="h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-300" placeholder={TEXT.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select className="h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100" value={region} onChange={(e) => setRegion(e.target.value)}><option value="all">{TEXT.allRegions}</option>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</select>
              <select className="h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100" value={month} onChange={(e) => setMonth(e.target.value)}><option value="all">{TEXT.allMonths}</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            </div>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />{TEXT.openOnly}</label>
          </div>
        )}
      </section>

      {tab === "browse" && renderBrowse()}
      {tab === "mine" && renderMine()}
      {tab === "calendar" && renderCalendar()}
      {tab === "sync" && renderSync()}

      {photoViewer && (
        <div className="fixed inset-0 z-50 bg-black/75 p-4" onClick={() => setPhotoViewer("")}>
          <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center">
            <img
              alt="race-photo-full"
              src={photoViewer}
              className="max-h-[86vh] max-w-[94vw] rounded-xl border border-zinc-700 bg-zinc-950 object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="absolute right-5 top-5 rounded-md border border-zinc-500 bg-zinc-900/90 px-3 py-1.5 text-sm font-semibold text-white"
              onClick={() => setPhotoViewer("")}
            >
              ??
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
