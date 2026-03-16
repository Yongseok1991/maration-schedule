import { useEffect, useMemo, useRef, useState } from "react";
import { getEntriesFromDb, saveEntriesToDb } from "./lib/entriesDb";

const TEXT = {
  tabs: {
    browse: "\ud0d0\uc0c9",
    mine: "\ub0b4 \uc77c\uc815",
    mypage: "\ub9c8\uc774",
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
  raceType: "\ucc38\uac00\uc720\ud615",
  goalTime: "\ubaa9\ud45c \uc2dc\uac04",
  goalPace: "\ubaa9\ud45c \ud398\uc774\uc2a4",
  resultTime: "\uc2e4\uc81c \uae30\ub85d",
  entryFee: "\ucc38\uac00\ube44",
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
  photoTooLargeAfterCompress: "\ub300\ud68c \uc0ac\uc9c4 \uc6a9\ub7c9\uc774 \ud06c\uc11c \uc800\uc7a5\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 \uc0ac\uc9c4\uc744 \uc120\ud0dd\ud574\uc8fc\uc138\uc694.",
  certTooLargeAfterCompress: "\uae30\ub85d\uc99d \uc6a9\ub7c9\uc774 \ud06c\uc11c \uc800\uc7a5\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 \uc774\ubbf8\uc9c0\ub97c \uc120\ud0dd\ud574\uc8fc\uc138\uc694.",
  imageProcessFailed: "\uc774\ubbf8\uc9c0 \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574\uc8fc\uc138\uc694.",
  storageFull: "\uc800\uc7a5 \uacf5\uac04\uc774 \ubd80\uc871\ud569\ub2c8\ub2e4. \uc77c\ubd80 \uc0ac\uc9c4\uc744 \uc0ad\uc81c\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574\uc8fc\uc138\uc694.",
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
  sourceMissing: "\uc6d0\ubcf8 \uc77c\uc815 \uc5c6\uc74c",
  manualAdd: "\uc9c1\uc811 \ucd94\uac00",
  manualName: "\ub300\ud68c\uba85",
  manualDate: "\ub300\ud68c\uc77c",
  manualRaceType: "\ucc38\uac00\uc720\ud615",
  manualPlace: "\uc7a5\uc18c",
  manualDistances: "\uc885\ubaa9",
  manualHomepage: "\ud648\ud398\uc774\uc9c0",
  manualFee: "\ucc38\uac00\ube44",
  manualNameRequired: "\ub300\ud68c\uba85\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.",
  manualNamePlaceholder: "\uc11c\uc6b8 \ud558\ud504 \ub9c8\ub77c\ud1a4",
  manualPlacePlaceholder: "\uc11c\uc6b8 \uc5ec\uc758\ub3c4",
  saveEntry: "\uc800\uc7a5",
  manualSaved: "\ub0b4 \uc77c\uc815\uc5d0 \ucd94\uac00\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
  totalEntryFee: "\ucc38\uac00\ube44 \ud569\uacc4",
  yearlyEntryFee: "\uc5f0\ub3c4\ubcc4",
  pbTitle: "PB",
  statsTitle: "\ud1b5\uacc4",
  totalRaces: "\ub4f1\ub85d \ub300\ud68c",
  finishedRaces: "\uae30\ub85d \uc785\ub825",
  pb5k: "5K PB",
  pb10k: "10K PB",
  pbHalf: "\ud558\ud504 PB",
  pbFull: "\ud480\ucf54\uc2a4 PB",
  noPb: "\uae30\ub85d \uc5c6\uc74c",
  shoesTitle: "\ub7ec\ub2dd\ud654",
  shoesCount: "\ub4f1\ub85d \uc6b4\ub3d9\ud654",
  totalShoePrice: "\ub7ec\ub2dd\ud654 \ud569\uacc4",
  yearlyShoePrice: "\uc5f0\ub3c4\ubcc4",
  shoeName: "\uc6b4\ub3d9\ud654 \uc774\ub984",
  shoePrice: "\uad6c\ub9e4\uac00\uaca9",
  shoePurchaseDate: "\uad6c\ub9e4\uc77c",
  shoeDistance: "\ub204\uc801 km",
  shoeMemo: "\uba54\ubaa8",
  addShoe: "\ub7ec\ub2dd\ud654 \ucd94\uac00",
  shoeNameRequired: "\ub7ec\ub2dd\ud654 \uc774\ub984\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694.",
  shoeNamePlaceholder: "\uc54c\ud30c\ud50c\ub77c\uc774 3",
  shoePricePlaceholder: "289000",
  shoePurchaseDatePlaceholder: "2026-03-16",
  shoeDistancePlaceholder: "120",
  shoeMemoPlaceholder: "\ud6c8\ub828\uc6a9, \ub300\ud68c\uc6a9 \ub4f1",
  currencyWon: "\uc6d0",
  backupExport: "\ubc31\uc5c5 \ub0b4\ubcf4\ub0b4\uae30",
  backupImport: "\ubc31\uc5c5 \uac00\uc838\uc624\uae30",
  backupExportDone: "\ubc31\uc5c5 \ud30c\uc77c\uc744 \ub2e4\uc6b4\ub85c\ub4dc\ud588\uc2b5\ub2c8\ub2e4.",
  backupImportDone: "\ubc31\uc5c5\uc5d0\uc11c \ub0b4 \uc77c\uc815\uc744 \ubcf5\uc6d0\ud588\uc2b5\ub2c8\ub2e4.",
  backupImportInvalid: "\ubc31\uc5c5 \ud30c\uc77c \ud615\uc2dd\uc774 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
  backupImportConfirm: "\ud604\uc7ac \ub0b4 \uc77c\uc815\uc744 \ubc31\uc5c5 \ub0b4\uc6a9\uc73c\ub85c \ub36e\uc5b4\uc4f0\uaca0\uc2b5\ub2c8\uae4c?"
};

const TABS = [
  { id: "browse", label: TEXT.tabs.browse },
  { id: "mine", label: TEXT.tabs.mine },
  { id: "mypage", label: TEXT.tabs.mypage },
  { id: "calendar", label: TEXT.tabs.calendar },
  { id: "sync", label: TEXT.tabs.sync }
];

const STATUS_OPTIONS = ["interested", "registered", "training", "finished", "dns"];
const RACE_TYPE_OPTIONS = ["", "5k", "10k", "half", "full"];

const STATUS_LABEL = {
  interested: "\uad00\uc2ec",
  registered: "\uc811\uc218\uc644\ub8cc",
  training: "\uc900\ube44\uc911",
  finished: "\uc644\uc8fc",
  dns: "\ubd88\ucc38",
  "\uc811\uc218\uc911": "\uc811\uc218\uc911",
  "\uc2e0\uaddc": "\uc2e0\uaddc"
};

const RACE_TYPE_LABEL = {
  "": "\uc120\ud0dd \uc548 \ud568",
  "5k": "5K",
  "10k": "10K",
  "half": "\ud558\ud504",
  "full": "\ud480"
};

const STORAGE_KEYS = {
  legacyEntries: "maraton.my_entries.v1",
  syncConfig: "maraton.sync_config.v1",
  shoes: "maraton.shoes.v1"
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

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const dataUrlBytes = (dataUrl) => {
  const b64 = String(dataUrl || "").split(",")[1] || "";
  return Math.ceil((b64.length * 3) / 4);
};

const isHeicFile = (file) => {
  const t = String(file?.type || "").toLowerCase();
  const n = String(file?.name || "").toLowerCase();
  return t === "image/heic" || t === "image/heif" || n.endsWith(".heic") || n.endsWith(".heif");
};

const isSupportedImageFile = (file) => {
  if (!file) return false;
  const t = String(file.type || "").toLowerCase();
  return t.startsWith("image/") || isHeicFile(file);
};

let heicModulePromise;
const convertHeicToJpegBlob = async (file) => {
  if (!heicModulePromise) heicModulePromise = import("heic2any");
  const mod = await heicModulePromise;
  const heic2anyFn = mod?.default || mod;
  const converted = await heic2anyFn({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(converted) ? converted[0] : converted;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });

const optimizeImageFile = async (file, { maxSide = 1800, maxBytes = 900 * 1024 } = {}) => {
  if (!isSupportedImageFile(file)) throw new Error("not-image");

  let sourceBlob = file;
  let sourceType = String(file.type || "").toLowerCase();

  if (isHeicFile(file)) {
    try {
      sourceBlob = await convertHeicToJpegBlob(file);
      sourceType = "image/jpeg";
    } catch {
      throw new Error("heic-convert-failed");
    }
  }

  if (sourceType === "image/gif" || sourceType === "image/svg+xml") return readFileAsDataUrl(sourceBlob);

  const objectUrl = URL.createObjectURL(sourceBlob);
  try {
    const img = await loadImageElement(objectUrl);
    const mimeType = sourceType === "image/png" ? "image/png" : "image/jpeg";
    const minSide = 900;
    let side = maxSide;
    let quality = 0.9;
    let best = "";

    for (let i = 0; i < 7; i += 1) {
      const scale = Math.min(1, side / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas-context-failed");
      ctx.drawImage(img, 0, 0, width, height);
      const out = canvas.toDataURL(mimeType, quality);
      best = out;
      if (dataUrlBytes(out) <= maxBytes) return out;
      if (quality > 0.55) {
        quality -= 0.1;
      } else if (side > minSide) {
        side = Math.max(minSide, Math.floor(side * 0.85));
      } else {
        break;
      }
    }

    return best || readFileAsDataUrl(sourceBlob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

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
const decodeBase64Utf8 = (base64) => {
  const bin = atob(base64);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
};

const statusBadgeClass = (status) => {
  if (status === "\uc811\uc218\uc911" || status === "registered") return "border-emerald-400/35 bg-emerald-400/15 text-emerald-200";
  if (status === "\uc2e0\uaddc") return "border-amber-400/35 bg-amber-400/15 text-amber-200";
  if (status === "finished") return "border-cyan-400/35 bg-cyan-400/15 text-cyan-200";
  return "border-zinc-500/35 bg-zinc-500/20 text-zinc-200";
};

const parseEntryFee = (value) => {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
};

const formatEntryFee = (value) => {
  const amount = typeof value === "number" ? value : parseEntryFee(value);
  return amount > 0 ? `${amount.toLocaleString("ko-KR")}\uc6d0` : "-";
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
  if (!Number.isFinite(seconds) || seconds <= 0) return TEXT.noPb;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const detectDistanceCategory = (value) => {
  const text = String(value || "").toLowerCase().replace(/\s+/g, "");
  if (!text) return "";
  if (text.includes("5km") || /(^|[^0-9])5k/.test(text)) return "5k";
  if (text.includes("42.195") || text.includes("\ud480\ucf54\uc2a4") || /(^|[^0-9])42k/.test(text) || text.includes("\ud480")) return "full";
  if (text.includes("\ud558\ud504") || text.includes("21.0975") || /(^|[^0-9])21k/.test(text)) return "half";
  if (text.includes("10km") || /(^|[^0-9])10k/.test(text)) return "10k";
  return "";
};

const normalizeEntry = (entry = {}) => ({
  ...entry,
  entryFee: typeof entry.entryFee === "string" ? entry.entryFee : "",
  raceType: typeof entry.raceType === "string" ? entry.raceType : ""
});

const normalizeShoe = (shoe = {}) => ({
  shoeId: shoe.shoeId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
  name: shoe.name || "",
  price: typeof shoe.price === "string" ? shoe.price : "",
  purchaseDate: typeof shoe.purchaseDate === "string" ? shoe.purchaseDate : "",
  distanceKm: typeof shoe.distanceKm === "string" ? shoe.distanceKm : "",
  memo: shoe.memo || ""
});

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
  raceType: "",
  entryFee: "",
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
const formatMonthLabel = (m) => (m || "").replace("-", ".");

export default function App() {
  const [tab, setTab] = useState("browse");
  const [racesData, setRacesData] = useState({ updatedAt: null, races: [] });
  const [entries, setEntries] = useState([]);
  const [entriesReady, setEntriesReady] = useState(false);
  const [syncConfig, setSyncConfig] = useState(() => ({ ...DEFAULT_SYNC, ...readJSON(STORAGE_KEYS.syncConfig, {}) }));
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [month, setMonth] = useState(() => clampMonthFromMin(currentMonthKey()));
  const [openOnly, setOpenOnly] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => clampMonthFromMin(currentMonthKey()));
  const [selectedDate, setSelectedDate] = useState("");
  const [syncState, setSyncState] = useState({ kind: "idle", message: "" });
  const [photoViewer, setPhotoViewer] = useState("");
  const [manualForm, setManualForm] = useState({ name: "", dateIso: "", raceType: "", place: "", distances: "", homepage: "", entryFee: "" });
  const [shoes, setShoes] = useState(() => readJSON(STORAGE_KEYS.shoes, []).map(normalizeShoe));
  const [shoeForm, setShoeForm] = useState({ name: "", price: "", purchaseDate: "", distanceKm: "", memo: "" });

  const syncTimerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const firstRef = useRef(true);
  const monthScrollerRef = useRef(null);
  const monthChipRefs = useRef({});
  const backupInputRef = useRef(null);

  useEffect(() => {
    fetch("./data/races.json")
      .then((res) => res.json())
      .then((json) => setRacesData({ updatedAt: json.updatedAt, races: json.races || [] }))
      .catch(() => setRacesData({ updatedAt: null, races: [] }));
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadEntries = async () => {
      try {
        const fromDb = await getEntriesFromDb();
        if (mounted && Array.isArray(fromDb) && fromDb.length > 0) {
          setEntries(fromDb.map(normalizeEntry));
          return;
        }
        const legacy = readJSON(STORAGE_KEYS.legacyEntries, []);
        if (mounted && Array.isArray(legacy) && legacy.length > 0) {
          setEntries(legacy.map(normalizeEntry));
          try {
            await saveEntriesToDb(legacy.map(normalizeEntry));
            localStorage.removeItem(STORAGE_KEYS.legacyEntries);
          } catch {
            // Ignore migration failure and keep in-memory data.
          }
        }
      } catch {
        const legacy = readJSON(STORAGE_KEYS.legacyEntries, []);
        if (mounted && Array.isArray(legacy)) setEntries(legacy.map(normalizeEntry));
      } finally {
        if (mounted) setEntriesReady(true);
      }
    };
    loadEntries();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!entriesReady) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveEntriesToDb(entries).catch(() => {
        setSyncState((prev) => (prev.kind === "error" && prev.message === TEXT.storageFull ? prev : { kind: "error", message: TEXT.storageFull }));
      });
    }, 350);
    return () => saveTimerRef.current && clearTimeout(saveTimerRef.current);
  }, [entries, entriesReady]);

  useEffect(() => {
    if (!entriesReady) return;
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
  }, [entries, entriesReady, syncConfig.autoSync, syncConfig.owner, syncConfig.repo, syncConfig.token, syncConfig.branch, syncConfig.path]);

  useEffect(() => {
    const saved = writeJSON(STORAGE_KEYS.syncConfig, syncConfig);
    if (!saved) {
      setSyncState((prev) => (prev.kind === "error" && prev.message === TEXT.storageFull ? prev : { kind: "error", message: TEXT.storageFull }));
    }
  }, [syncConfig]);

  useEffect(() => {
    const saved = writeJSON(STORAGE_KEYS.shoes, shoes);
    if (!saved) {
      setSyncState((prev) => (prev.kind === "error" && prev.message === TEXT.storageFull ? prev : { kind: "error", message: TEXT.storageFull }));
    }
  }, [shoes]);

  const regions = useMemo(() => [...new Set(racesData.races.map((r) => r.region).filter(Boolean))].sort(), [racesData.races]);
  const months = useMemo(() => [...new Set(racesData.races.map((r) => monthKeyOf(r.date_iso)).filter((m) => m && m >= MIN_FILTER_MONTH))].sort(), [racesData.races]);
  const monthOptions = useMemo(() => (months.includes(month) ? months : [...new Set([month, ...months])].sort()), [months, month]);
  const todayMonth = clampMonthFromMin(currentMonthKey());
  const raceIdSet = useMemo(() => new Set(racesData.races.map((r) => r.id).filter(Boolean)), [racesData.races]);
  const raceById = useMemo(() => new Map(racesData.races.map((r) => [r.id, r])), [racesData.races]);

  const browseRaces = useMemo(() => {
    return racesData.races
      .filter((race) => {
        const hitOpen = openOnly ? race.status === "\uc811\uc218\uc911" : true;
        const text = `${race.name || ""} ${race.place || ""} ${race.organizer || ""} ${race.distances || ""}`.toLowerCase();
        const hitQuery = query.trim() ? text.includes(query.trim().toLowerCase()) : true;
        const hitRegion = region === "all" ? true : race.region === region;
        const raceMonth = monthKeyOf(race.date_iso);
        const hitMonth = !raceMonth ? true : raceMonth >= month;
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

  const totalEntryFee = useMemo(() => entries.reduce((sum, entry) => sum + parseEntryFee(entry.entryFee), 0), [entries]);

  const yearlyEntryFees = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      const year = /^\d{4}-\d{2}-\d{2}$/.test(entry.dateIso || "") ? entry.dateIso.slice(0, 4) : "\ubbf8\uc815";
      map.set(year, (map.get(year) || 0) + parseEntryFee(entry.entryFee));
    });
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "\ubbf8\uc815") return 1;
      if (b[0] === "\ubbf8\uc815") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [entries]);

  const pbSummary = useMemo(() => {
    const best = { "5k": null, "10k": null, half: null, full: null };
    entries.forEach((entry) => {
      const category = entry.raceType || detectDistanceCategory(entry.distances);
      const seconds = parseResultSeconds(entry.resultTime);
      if (!category || !seconds) return;
      const current = best[category];
      if (!current || seconds < current.seconds) {
        best[category] = { seconds, name: entry.name, dateIso: entry.dateIso || "" };
      }
    });
    return best;
  }, [entries]);

  const statsSummary = useMemo(() => ({
    totalRaces: entries.length,
    finishedRaces: entries.filter((entry) => parseResultSeconds(entry.resultTime)).length,
    shoesCount: shoes.length
  }), [entries, shoes]);

  const totalShoePrice = useMemo(() => shoes.reduce((sum, shoe) => sum + parseEntryFee(shoe.price), 0), [shoes]);

  const yearlyShoePrices = useMemo(() => {
    const map = new Map();
    shoes.forEach((shoe) => {
      const year = /^\d{4}-\d{2}-\d{2}$/.test(shoe.purchaseDate || "") ? shoe.purchaseDate.slice(0, 4) : "\ubbf8\uc815";
      map.set(year, (map.get(year) || 0) + parseEntryFee(shoe.price));
    });
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "\ubbf8\uc815") return 1;
      if (b[0] === "\ubbf8\uc815") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [shoes]);

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

  const scrollMonthChipToStart = (targetMonth) => {
    const container = monthScrollerRef.current;
    const chip = monthChipRefs.current[targetMonth];
    if (!container || !chip) return;
    const left = Math.max(0, chip.offsetLeft - container.offsetLeft);
    container.scrollTo({ left, behavior: "smooth" });
  };

  useEffect(() => {
    if (tab !== "browse") return;
    const t = setTimeout(() => scrollMonthChipToStart(month), 30);
    return () => clearTimeout(t);
  }, [month, tab]);

  const addRaceToMyEntries = (race) => {
    if (entries.some((e) => e.raceId && e.raceId === race.id)) return;
    const nextEntry = makeEntry(race);
    nextEntry.raceType = detectDistanceCategory(race.distances);
    setEntries((prev) => [...prev, nextEntry]);
    setTab("mine");
  };

  const updateEntry = (entryId, patch) => {
    setEntries((prev) => prev.map((e) => (e.entryId === entryId ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)));
  };

  const removeEntry = (entryId) => setEntries((prev) => prev.filter((e) => e.entryId !== entryId));

  const addShoe = () => {
    const name = shoeForm.name.trim();
    if (!name) {
      setSyncState({ kind: "error", message: TEXT.shoeNameRequired });
      return;
    }
    setShoes((prev) => [...prev, normalizeShoe({ ...shoeForm, name })]);
    setShoeForm({ name: "", price: "", purchaseDate: "", distanceKm: "", memo: "" });
  };

  const updateShoe = (shoeId, patch) => {
    setShoes((prev) => prev.map((shoe) => (shoe.shoeId === shoeId ? { ...shoe, ...patch } : shoe)));
  };

  const removeShoe = (shoeId) => setShoes((prev) => prev.filter((shoe) => shoe.shoeId !== shoeId));

  const addManualEntry = () => {
    const name = manualForm.name.trim();
    if (!name) {
      setSyncState({ kind: "error", message: TEXT.manualNameRequired });
      return;
    }

    const nextEntry = makeEntry({
      id: null,
      name,
      date_iso: manualForm.dateIso || "",
      date_display: manualForm.dateIso || "",
      place: manualForm.place.trim(),
      distances: manualForm.distances.trim(),
      homepage: manualForm.homepage.trim()
    });

    nextEntry.entryFee = manualForm.entryFee.trim();
    nextEntry.raceType = manualForm.raceType;

    setEntries((prev) => [...prev, nextEntry]);
    setManualForm({ name: "", dateIso: "", raceType: "", place: "", distances: "", homepage: "", entryFee: "" });
    setSyncState({ kind: "success", message: TEXT.manualSaved });
  };

  const onCertificateChange = async (entryId, file) => {
    if (!file) return;
    if (!isSupportedImageFile(file)) {
      setSyncState({ kind: "error", message: TEXT.certOnlyImage });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setSyncState({ kind: "error", message: TEXT.certMaxSize });
      return;
    }
    try {
      const optimized = await optimizeImageFile(file, { maxSide: 2200, maxBytes: 1400 * 1024 });
      if (dataUrlBytes(optimized) > 1400 * 1024) {
        setSyncState({ kind: "error", message: TEXT.certTooLargeAfterCompress });
        return;
      }
      updateEntry(entryId, { certificateDataUrl: optimized });
    } catch {
      setSyncState({ kind: "error", message: TEXT.imageProcessFailed });
    }
  };

  const onRacePhotosChange = async (entryId, fileList) => {
    const currentCount = entries.find((e) => e.entryId === entryId)?.racePhotoDataUrls?.length || 0;
    const available = Math.max(0, 6 - currentCount);
    const files = Array.from(fileList || []).slice(0, available);
    if (!files.length) return;

    for (const file of files) {
      if (!isSupportedImageFile(file)) {
        setSyncState({ kind: "error", message: TEXT.photoOnlyImage });
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        setSyncState({ kind: "error", message: TEXT.photoMaxSize });
        return;
      }
    }

    try {
      const urls = await Promise.all(files.map((file) => optimizeImageFile(file, { maxSide: 1800, maxBytes: 900 * 1024 })));
      const tooLarge = urls.some((u) => dataUrlBytes(u) > 900 * 1024);
      if (tooLarge) {
        setSyncState({ kind: "error", message: TEXT.photoTooLargeAfterCompress });
        return;
      }
      setEntries((prev) =>
        prev.map((e) => {
          if (e.entryId !== entryId) return e;
          const nextPhotos = [...(e.racePhotoDataUrls || []), ...urls].slice(0, 6);
          return { ...e, racePhotoDataUrls: nextPhotos, updatedAt: new Date().toISOString() };
        })
      );
    } catch {
      setSyncState({ kind: "error", message: TEXT.imageProcessFailed });
    }
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
      const branch = syncConfig.branch || "master";
      const contentPath = `/repos/${syncConfig.owner}/${syncConfig.repo}/contents/${encodeURIComponent(syncConfig.path)}?ref=${encodeURIComponent(branch)}`;
      const file = await githubApi(contentPath, { method: "GET" });

      let decoded = "";
      const encodedContent = String(file?.content || "").replace(/\n/g, "");
      if (encodedContent && !file?.truncated) {
        decoded = decodeBase64Utf8(encodedContent);
      } else if (file?.sha) {
        const blobPath = `/repos/${syncConfig.owner}/${syncConfig.repo}/git/blobs/${file.sha}`;
        const blob = await githubApi(blobPath, { method: "GET" });
        const blobContent = String(blob?.content || "").replace(/\n/g, "");
        decoded = decodeBase64Utf8(blobContent);
      } else {
        throw new Error("GitHub 파일 내용을 읽을 수 없습니다.");
      }

      let parsed;
      try {
        parsed = JSON.parse(decoded);
      } catch {
        throw new Error("동기화 파일 JSON이 깨졌거나 일부만 내려왔습니다. 다시 가져오기를 시도하세요.");
      }

      const nextEntries = Array.isArray(parsed?.entries) ? parsed.entries : [];
      const nextShoes = Array.isArray(parsed?.shoes) ? parsed.shoes : [];
      setEntries(nextEntries.map(normalizeEntry));
      setShoes(nextShoes.map(normalizeShoe));
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
    const payload = { version: 1, updatedAt: new Date().toISOString(), entries, shoes };
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

  const exportBackup = () => {
    try {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        entries,
        shoes
      };
      const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(".", "_").slice(0, 15);
      a.href = url;
      a.download = `maraton-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSyncState({ kind: "success", message: TEXT.backupExportDone });
    } catch (err) {
      setSyncState({ kind: "error", message: String(err?.message || err) });
    }
  };

  const importBackup = async (file) => {
    if (!file) return;
    const ok = window.confirm(TEXT.backupImportConfirm);
    if (!ok) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const nextEntries = Array.isArray(parsed?.entries) ? parsed.entries : Array.isArray(parsed) ? parsed : null;
      const nextShoes = Array.isArray(parsed?.shoes) ? parsed.shoes : [];
      if (!nextEntries) {
        setSyncState({ kind: "error", message: TEXT.backupImportInvalid });
        return;
      }
      setEntries(nextEntries.map(normalizeEntry));
      setShoes(nextShoes.map(normalizeShoe));
      setSyncState({ kind: "success", message: TEXT.backupImportDone });
    } catch {
      setSyncState({ kind: "error", message: TEXT.backupImportInvalid });
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

  const renderMyPage = () => (
    <section className="mt-3 grid grid-cols-1 gap-3">
      <article className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
        <p className="text-sm font-semibold text-zinc-100">{TEXT.statsTitle}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-[11px] text-zinc-400">{TEXT.totalRaces}</p>
            <p className="mt-1 text-lg font-black text-zinc-100">{statsSummary.totalRaces}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-[11px] text-zinc-400">{TEXT.finishedRaces}</p>
            <p className="mt-1 text-lg font-black text-zinc-100">{statsSummary.finishedRaces}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-[11px] text-zinc-400">{TEXT.shoesCount}</p>
            <p className="mt-1 text-lg font-black text-zinc-100">{statsSummary.shoesCount}</p>
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-100">{TEXT.totalEntryFee}</p>
          <p className="text-base font-black text-amber-200">{formatEntryFee(totalEntryFee)}</p>
        </div>
        {yearlyEntryFees.length > 0 && (
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{TEXT.yearlyEntryFee}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {yearlyEntryFees.map(([year, amount]) => (
                <span key={year} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-200">
                  {year}: {formatEntryFee(amount)}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-100">{TEXT.totalShoePrice}</p>
          <p className="text-base font-black text-amber-200">{formatEntryFee(totalShoePrice)}</p>
        </div>
        {yearlyShoePrices.length > 0 && (
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{TEXT.yearlyShoePrice}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {yearlyShoePrices.map(([year, amount]) => (
                <span key={year} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-200">
                  {year}: {formatEntryFee(amount)}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
        <p className="text-sm font-semibold text-zinc-100">{TEXT.pbTitle}</p>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {[["5k", TEXT.pb5k], ["10k", TEXT.pb10k], ["half", TEXT.pbHalf], ["full", TEXT.pbFull]].map(([key, label]) => {
            const pb = pbSummary[key];
            return (
              <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-100">{label}</p>
                  <p className="text-base font-black text-emerald-200">{pb ? formatResultSeconds(pb.seconds) : TEXT.noPb}</p>
                </div>
                {pb && <p className="mt-1 text-xs text-zinc-400">{pb.name}{pb.dateIso ? ` · ${pb.dateIso}` : ""}</p>}
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
        <p className="text-sm font-semibold text-zinc-100">{TEXT.shoesTitle}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] text-zinc-300">
          <label className="col-span-2 flex flex-col gap-1"><span>{TEXT.shoeName}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={shoeForm.name} onChange={(e) => setShoeForm((prev) => ({ ...prev, name: e.target.value }))} placeholder={TEXT.shoeNamePlaceholder} /></label>
          <label className="flex flex-col gap-1"><span>{TEXT.shoePrice}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" inputMode="numeric" value={shoeForm.price} onChange={(e) => setShoeForm((prev) => ({ ...prev, price: e.target.value }))} placeholder={TEXT.shoePricePlaceholder} /></label>
          <label className="flex flex-col gap-1"><span>{TEXT.shoePurchaseDate}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" type="date" value={shoeForm.purchaseDate} onChange={(e) => setShoeForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} placeholder={TEXT.shoePurchaseDatePlaceholder} /></label>
          <label className="flex flex-col gap-1"><span>{TEXT.shoeDistance}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" inputMode="decimal" value={shoeForm.distanceKm} onChange={(e) => setShoeForm((prev) => ({ ...prev, distanceKm: e.target.value }))} placeholder={TEXT.shoeDistancePlaceholder} /></label>
          <label className="col-span-2 flex flex-col gap-1"><span>{TEXT.shoeMemo}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={shoeForm.memo} onChange={(e) => setShoeForm((prev) => ({ ...prev, memo: e.target.value }))} placeholder={TEXT.shoeMemoPlaceholder} /></label>
        </div>
        <div className="mt-2 flex justify-end"><button className="h-9 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 text-sm font-semibold text-amber-200" onClick={addShoe}>{TEXT.addShoe}</button></div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {shoes.map((shoe) => (
            <div key={shoe.shoeId} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{shoe.name || "-"}</p>
                  <p className="mt-1 text-xs text-zinc-400">{formatEntryFee(shoe.price)}{shoe.purchaseDate ? ` · ${shoe.purchaseDate}` : ""}</p>
                </div>
                <button className="text-[11px] font-semibold text-zinc-400 hover:text-red-300" onClick={() => removeShoe(shoe.shoeId)}>{TEXT.remove}</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] text-zinc-300">
                <label className="flex flex-col gap-1"><span>{TEXT.shoePrice}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" inputMode="numeric" value={shoe.price} onChange={(e) => updateShoe(shoe.shoeId, { price: e.target.value })} /></label>
                <label className="flex flex-col gap-1"><span>{TEXT.shoePurchaseDate}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" type="date" value={shoe.purchaseDate} onChange={(e) => updateShoe(shoe.shoeId, { purchaseDate: e.target.value })} /></label>
                <label className="flex flex-col gap-1"><span>{TEXT.shoeDistance}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" inputMode="decimal" value={shoe.distanceKm} onChange={(e) => updateShoe(shoe.shoeId, { distanceKm: e.target.value })} /></label>
                <label className="col-span-2 flex flex-col gap-1"><span>{TEXT.shoeMemo}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={shoe.memo} onChange={(e) => updateShoe(shoe.shoeId, { memo: e.target.value })} /></label>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );

  const renderMine = () => (
    <section className="mt-3 grid grid-cols-1 gap-3">
      <article className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
        <p className="text-sm font-semibold text-zinc-100">{TEXT.manualAdd}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] text-zinc-300">
          <label className="col-span-2 flex flex-col gap-1"><span>{TEXT.manualName}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={manualForm.name} onChange={(e) => setManualForm((p) => ({ ...p, name: e.target.value }))} placeholder={TEXT.manualNamePlaceholder} /></label>
          <label className="flex flex-col gap-1"><span>{TEXT.manualDate}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" type="date" value={manualForm.dateIso} onChange={(e) => setManualForm((p) => ({ ...p, dateIso: e.target.value }))} /></label>
          <label className="flex flex-col gap-1"><span>{TEXT.manualRaceType}</span><select className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={manualForm.raceType} onChange={(e) => setManualForm((p) => ({ ...p, raceType: e.target.value }))}>{RACE_TYPE_OPTIONS.map((type) => <option key={type || "empty"} value={type}>{RACE_TYPE_LABEL[type]}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span>{TEXT.manualDistances}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={manualForm.distances} onChange={(e) => setManualForm((p) => ({ ...p, distances: e.target.value }))} placeholder="Half, 10K" /></label>
          <label className="col-span-2 flex flex-col gap-1"><span>{TEXT.manualFee}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" inputMode="numeric" value={manualForm.entryFee} onChange={(e) => setManualForm((p) => ({ ...p, entryFee: e.target.value }))} placeholder="50000" /></label>
          <label className="col-span-2 flex flex-col gap-1"><span>{TEXT.manualPlace}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={manualForm.place} onChange={(e) => setManualForm((p) => ({ ...p, place: e.target.value }))} placeholder={TEXT.manualPlacePlaceholder} /></label>
          <label className="col-span-2 flex flex-col gap-1"><span>{TEXT.manualHomepage}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={manualForm.homepage} onChange={(e) => setManualForm((p) => ({ ...p, homepage: e.target.value }))} placeholder="https://..." /></label>
        </div>
        <div className="mt-2 flex justify-end"><button className="h-9 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 text-sm font-semibold text-amber-200" onClick={addManualEntry}>{TEXT.saveEntry}</button></div>
      </article>

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
            <label className="flex flex-col gap-1"><span>{TEXT.raceType}</span><select className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" value={entry.raceType || ""} onChange={(e) => updateEntry(entry.entryId, { raceType: e.target.value })}>{RACE_TYPE_OPTIONS.map((type) => <option key={type || "empty"} value={type}>{RACE_TYPE_LABEL[type]}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span>{TEXT.entryFee}</span><input className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2" inputMode="numeric" value={entry.entryFee || ""} onChange={(e) => updateEntry(entry.entryId, { entryFee: e.target.value })} placeholder="50000" /></label>
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
          <div className="mt-2 text-[13px] text-zinc-300"><p>{TEXT.cert}</p><input className="mt-1 block w-full text-sm text-zinc-300 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-zinc-100" type="file" accept="image/*" onChange={(e) => onCertificateChange(entry.entryId, e.target.files?.[0])} />{entry.certificateDataUrl && <img alt="certificate" src={entry.certificateDataUrl} className="mt-2 max-h-40 w-full cursor-zoom-in rounded-lg border border-zinc-700 object-contain bg-zinc-950" onClick={() => setPhotoViewer(entry.certificateDataUrl)} />}</div>
        </article>
      );})}
      {myEntries.length === 0 && <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center text-sm text-zinc-400">{TEXT.noEntries}</p>}
    </section>
  );

  const renderCalendar = () => {
    const [year, monthNum] = calendarMonth.split("-").map(Number);
    const canGoPrev = calendarMonth > MIN_FILTER_MONTH;
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <button className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-200 disabled:opacity-40" onClick={() => canGoPrev && setCalendarMonth(shiftMonth(calendarMonth, -1))} disabled={!canGoPrev}>{TEXT.prev}</button>
            <input className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100" type="month" min={MIN_FILTER_MONTH} value={calendarMonth} onChange={(e) => setCalendarMonth(clampMonthFromMin(e.target.value))} />
            <button className="rounded-md border border-zinc-700 px-2 py-1 text-sm text-zinc-200" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}>{TEXT.next}</button>
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
        <div className="flex gap-2"><button className="h-10 rounded-lg border border-zinc-700 px-3" onClick={exportBackup}>{TEXT.backupExport}</button><button className="h-10 rounded-lg border border-zinc-700 px-3" onClick={() => backupInputRef.current?.click()}>{TEXT.backupImport}</button><input ref={backupInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { importBackup(e.target.files?.[0]); e.target.value = ""; }} /></div>
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
        <div className="grid grid-cols-5 gap-1">{TABS.map((t) => <button key={t.id} className={`h-9 rounded-lg text-xs font-semibold ${tab === t.id ? "bg-amber-400/20 text-amber-200" : "bg-zinc-900 text-zinc-300"}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
        {tab === "browse" && (
          <div className="mt-2 grid grid-cols-1 gap-2">
            <input className="h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-300" placeholder={TEXT.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="grid grid-cols-1 gap-2">
              <select className="h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100" value={region} onChange={(e) => setRegion(e.target.value)}><option value="all">{TEXT.allRegions}</option>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</select>
              <div className="overflow-x-auto pb-1" ref={monthScrollerRef}>
                <div className="flex min-w-max gap-2">
                  <button
                    type="button"
                    className={month === todayMonth ? "h-9 rounded-lg border border-emerald-300 bg-emerald-400/15 px-3 text-sm font-semibold text-emerald-200" : "h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200"}
                    onClick={() => setMonth(todayMonth)}
                  >
                    {"\uc624\ub298"}
                  </button>
                  {monthOptions.map((m) => (
                    <button
                      key={m}
                      ref={(el) => { monthChipRefs.current[m] = el; }}
                      type="button"
                      className={month === m ? "h-9 rounded-lg border border-amber-300 bg-amber-400/15 px-3 text-sm font-semibold text-amber-200" : "h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200"}
                      onClick={() => setMonth(m)}
                      onFocus={() => scrollMonthChipToStart(m)}
                    >
                      {formatMonthLabel(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />{TEXT.openOnly}</label>
          </div>
        )}
      </section>

      {tab === "browse" && renderBrowse()}
      {tab === "mine" && renderMine()}
      {tab === "mypage" && renderMyPage()}
      {tab === "calendar" && renderCalendar()}
      {tab === "sync" && renderSync()}

      {photoViewer && (
        <div className="fixed inset-0 z-50 bg-black/75 p-4" onClick={() => setPhotoViewer("")}>
          <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center">
            <img
              alt="race-photo-full"
              src={photoViewer}
              className="max-h-[86vh] max-w-[94vw] rounded-xl border border-zinc-700 bg-zinc-950 object-contain"
              onClick={() => setPhotoViewer("")}
            />
            <button
              type="button"
              className="absolute right-5 top-5 rounded-md border border-zinc-500 bg-zinc-900/90 px-3 py-1.5 text-sm font-semibold text-white"
              onClick={() => setPhotoViewer("")}
            >
              X
            </button>
          </div>
        </div>
      )}
    </main>
  );
}





