import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useRaces } from "./hooks/useRaces";
import { useEntries } from "./hooks/useEntries";
import { useShoes } from "./hooks/useShoes";
import { useStats } from "./hooks/useStats";
import AuthModal from "./components/auth/AuthModal";

const TEXT = {
  tabs: {
    browse: "\ud0d0\uc0c9",
    mine: "\ub0b4 \uc77c\uc815",
    mypage: "\ub9c8\uc774",
    calendar: "\uce98\ub9b0\ub354"
  },
  plannerTitle: "RACEBOOK",
  plannerDesc: "전국 마라톤 대회 일정 탐색부터 목표, 기록, 완주증까지 한 번에 관리",
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
  certMaxSize: "\uae30\ub85d\uc99d \ud30c\uc77c\uc740 \ucd5c\ub300 8MB\uae4c\uc9c0 \ud5c8\uc6a9\ub429\ub2c8\ub2e4.",
  racePhotos: "\ub300\ud68c \uc0ac\uc9c4 (\ucd5c\ub300 6\uc7a5)",
  racePhotosTip: "\uac24\ub7ec\ub9ac\ub85c \ubcf4\uace0 \uc2f6\uc740 \ub300\ud68c \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uc138\uc694.",
  photoOnlyImage: "\ub300\ud68c \uc0ac\uc9c4\uc740 \uc774\ubbf8\uc9c0 \ud30c\uc77c\ub9cc \uc5c5\ub85c\ub4dc\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
  photoMaxSize: "\ub300\ud68c \uc0ac\uc9c4 \ud30c\uc77c\uc740 \ucd5c\ub300 8MB\uae4c\uc9c0 \ud5c8\uc6a9\ub429\ub2c8\ub2e4.",
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
  { id: "calendar", label: TEXT.tabs.calendar }
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
  shoes: "maraton.shoes.v1"
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
  const n = String(file.name || "").toLowerCase();
  return t.startsWith("image/") || isHeicFile(file) || [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => n.endsWith(ext));
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
    // Re-encode PNG uploads as JPEG too so large screenshots/photos compress reliably.
    const mimeType = "image/jpeg";
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
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
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
  if (status === "접수중" || status === "registered") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "신규") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (status === "finished") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if (status === "training") return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
  if (status === "dns") return "border-zinc-700 bg-zinc-800/60 text-zinc-400";
  return "border-zinc-700/60 bg-zinc-800/40 text-zinc-300";
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
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [tab, setTab] = useState("browse");

  const racesState = useRaces();
  const entriesState = useEntries(user, authLoading);
  const shoesState = useShoes(user, authLoading);
  const statsState = useStats(entriesState.entries, shoesState.shoes);

  const [photoViewer, setPhotoViewer] = useState("");
  const [manualForm, setManualForm] = useState({ name: "", dateIso: "", raceType: "", place: "", distances: "", homepage: "", entryFee: "" });

  const visibleTabs = useMemo(() => {
    if (!user) {
      return [{ id: "browse", label: TEXT.tabs.browse }];
    }
    return TABS;
  }, [user]);

  useEffect(() => {
    if (!user && tab !== "browse") {
      setTab("browse");
    }
  }, [user, tab]);

  const monthScrollerRef = useRef(null);
  const monthChipRefs = useRef({});
  const backupInputRef = useRef(null);

  const racesData = { updatedAt: racesState.updatedAt, races: racesState.races };
  const { query, setQuery, region, setRegion, regions, month, setMonth, monthOptions, todayMonth, openOnly, setOpenOnly, calendarMonth, setCalendarMonth, selectedDate, setSelectedDate, browseRaces, racesByDate } = racesState;
  const { entries, entriesReady, entriesByDate, syncState, setSyncState } = entriesState;
  const { shoes, shoeForm, setShoeForm } = shoesState;
  const { pbSummary, statsSummary, totalEntryFee, yearlyEntryFees, totalShoePrice, yearlyShoePrices } = statsState;

  const raceIdSet = useMemo(() => new Set(racesData.races.map((r) => r.id).filter(Boolean)), [racesData.races]);
  const raceById = useMemo(() => new Map(racesData.races.map((r) => [r.id, r])), [racesData.races]);

  const myEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => {
        const ad = toDate(a.dateIso);
        const bd = toDate(b.dateIso);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        const diff = bd.getTime() - ad.getTime();
        if (diff !== 0) return diff;
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      });
  }, [entries]);

  const selectedDateMyEntries = selectedDate ? entriesByDate.get(selectedDate) || [] : [];
  const selectedDateRaces = selectedDate ? (racesByDate?.get(selectedDate) || []) : [];

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

  const addRaceToMyEntries = async (race) => {
    const res = await entriesState.addRaceToEntries(race);
    if (res?.needAuth) {
      setIsAuthModalOpen(true);
      return;
    }
    setTab("mine");
  };

  const updateEntry = (entryId, patch) => entriesState.updateEntry(entryId, patch);
  const removeEntry = (entryId) => entriesState.removeEntry(entryId);

  const addShoe = async () => {
    const res = await shoesState.addShoe();
    if (res?.needAuth) {
      setIsAuthModalOpen(true);
      return;
    }
    if (res?.error) {
      setSyncState({ kind: "error", message: res.error });
    }
  };

  const updateShoe = (shoeId, patch) => shoesState.updateShoe(shoeId, patch);
  const removeShoe = (shoeId) => shoesState.removeShoe(shoeId);

  const addManualEntry = async () => {
    const res = await entriesState.addManualEntry(manualForm);
    if (res?.needAuth) {
      setIsAuthModalOpen(true);
      return;
    }
    if (res?.error) {
      setSyncState({ kind: "error", message: res.error });
      return;
    }
    setManualForm({ name: "", dateIso: "", raceType: "", place: "", distances: "", homepage: "", entryFee: "" });
  };

  const onCertificateChange = (entryId, file) => entriesState.onCertificateChange(entryId, file);
  const onRacePhotosChange = (entryId, files) => entriesState.onRacePhotosChange(entryId, files);
  const removeRacePhoto = (entryId, index) => entriesState.removeRacePhoto(entryId, index);

  const renderBrowse = () => (
    <section className="mt-3 grid grid-cols-1 gap-3">
      {browseRaces.map((race) => {
        const alreadyAdded = entries.some((e) => e.raceId && e.raceId === race.id);
        return (
          <article key={race.id} className="card-panel p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-amber-400/90 tracking-wide">
                {race.date_display || formatDate(race.date_iso)}
              </span>
              {race.status && (
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClass(race.status)}`}>
                  {STATUS_LABEL[race.status] || race.status}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-3">
              <h2 className="text-[16px] font-bold leading-snug text-zinc-100 tracking-tight">{race.name}</h2>
              <button
                className={`h-7 w-7 flex-shrink-0 rounded-lg border font-bold text-sm transition-all flex items-center justify-center ${
                  alreadyAdded
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 cursor-default"
                    : "border-amber-400/40 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 active:scale-95"
                }`}
                onClick={() => !alreadyAdded && addRaceToMyEntries(race)}
                disabled={alreadyAdded}
                aria-label={alreadyAdded ? TEXT.added : TEXT.add}
                title={alreadyAdded ? TEXT.added : TEXT.add}
              >
                {alreadyAdded ? "✓" : "+"}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
              <p className="truncate text-zinc-400"><span className="text-zinc-500">{TEXT.dist}:</span> {race.distances || "-"}</p>
              <p className="truncate text-zinc-400"><span className="text-zinc-500">{TEXT.place}:</span> {race.place || "-"}</p>
              <p className="col-span-2 text-zinc-400"><span className="text-zinc-500">{TEXT.reg}:</span> {formatRegPeriod(race.registration_period)}</p>
              <p className="col-span-2 truncate text-zinc-400"><span className="text-zinc-500">{TEXT.org}:</span> {race.organizer || "-"}</p>
            </div>
            {race.homepage && (
              <div className="mt-3 flex items-center gap-2">
                <a
                  className="h-8 rounded-lg border border-zinc-700/80 bg-zinc-800/50 hover:bg-zinc-800/80 px-3 text-xs font-semibold text-zinc-200 inline-flex items-center gap-1.5 transition"
                  href={race.homepage}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{TEXT.homepage}</span>
                  <span className="text-[10px] text-zinc-400">↗</span>
                </a>
              </div>
            )}
          </article>
        );
      })}
      {browseRaces.length === 0 && <p className="card-panel p-6 text-center text-sm text-zinc-400">{TEXT.noRaces}</p>}
    </section>
  );

  const renderMyPage = () => (
    <section className="mt-3 grid grid-cols-1 gap-3">
      {/* 대회 통계 카드 */}
      <article className="card-panel p-4">
        <p className="text-sm font-bold text-zinc-100 tracking-tight">{TEXT.statsTitle}</p>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3 text-center">
            <p className="text-[11px] font-medium text-zinc-400">{TEXT.totalRaces}</p>
            <p className="mt-1 text-xl font-black text-zinc-100">{statsSummary.totalRaces}</p>
          </div>
          <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3 text-center">
            <p className="text-[11px] font-medium text-zinc-400">{TEXT.finishedRaces}</p>
            <p className="mt-1 text-xl font-black text-emerald-400">{statsSummary.finishedRaces}</p>
          </div>
          <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3 text-center">
            <p className="text-[11px] font-medium text-zinc-400">{TEXT.shoesCount}</p>
            <p className="mt-1 text-xl font-black text-zinc-100">{statsSummary.shoesCount}</p>
          </div>
        </div>
      </article>

      {/* 참가비 합계 */}
      <article className="card-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-zinc-100 tracking-tight">{TEXT.totalEntryFee}</p>
          <p className="text-lg font-black text-amber-300">{formatEntryFee(totalEntryFee)}</p>
        </div>
        {yearlyEntryFees.length > 0 && (
          <div className="mt-3 border-t border-zinc-800/80 pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{TEXT.yearlyEntryFee}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {yearlyEntryFees.map(([year, amount]) => (
                <span key={year} className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1 text-xs font-medium text-zinc-300">
                  <span className="text-zinc-500">{year}:</span> {formatEntryFee(amount)}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* 러닝화 비용 합계 */}
      <article className="card-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-zinc-100 tracking-tight">{TEXT.totalShoePrice}</p>
          <p className="text-lg font-black text-amber-300">{formatEntryFee(totalShoePrice)}</p>
        </div>
        {yearlyShoePrices.length > 0 && (
          <div className="mt-3 border-t border-zinc-800/80 pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{TEXT.yearlyShoePrice}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {yearlyShoePrices.map(([year, amount]) => (
                <span key={year} className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1 text-xs font-medium text-zinc-300">
                  <span className="text-zinc-500">{year}:</span> {formatEntryFee(amount)}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* PB 최고기록 */}
      <article className="card-panel p-4">
        <p className="text-sm font-bold text-zinc-100 tracking-tight">{TEXT.pbTitle} (Personal Best)</p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {[["5k", TEXT.pb5k], ["10k", TEXT.pb10k], ["half", TEXT.pbHalf], ["full", TEXT.pbFull]].map(([key, label]) => {
            const pb = pbSummary[key];
            return (
              <div key={key} className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-zinc-200">{label}</span>
                  <span className="text-base font-black text-emerald-400 font-mono tracking-tight">{pb ? formatResultSeconds(pb.seconds) : TEXT.noPb}</span>
                </div>
                {pb && <p className="mt-1 text-xs text-zinc-400 truncate">{pb.name}{pb.dateIso ? ` · ${pb.dateIso}` : ""}</p>}
              </div>
            );
          })}
        </div>
      </article>

      {/* 러닝화 관리 */}
      <article className="card-panel p-4">
        <p className="text-sm font-bold text-zinc-100 tracking-tight">{TEXT.shoesTitle}</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5 text-[13px] text-zinc-300">
          <label className="col-span-2 flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.shoeName}</span><input className="dark-input h-9 px-3 text-xs" value={shoeForm.name} onChange={(e) => setShoeForm((prev) => ({ ...prev, name: e.target.value }))} placeholder={TEXT.shoeNamePlaceholder} /></label>
          <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.shoePrice}</span><input className="dark-input h-9 px-3 text-xs" inputMode="numeric" value={shoeForm.price} onChange={(e) => setShoeForm((prev) => ({ ...prev, price: e.target.value }))} placeholder={TEXT.shoePricePlaceholder} /></label>
          <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.shoePurchaseDate}</span><input className="dark-input h-9 px-3 text-xs" type="date" value={shoeForm.purchaseDate} onChange={(e) => setShoeForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} placeholder={TEXT.shoePurchaseDatePlaceholder} /></label>
          <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.shoeDistance}</span><input className="dark-input h-9 px-3 text-xs" inputMode="decimal" value={shoeForm.distanceKm} onChange={(e) => setShoeForm((prev) => ({ ...prev, distanceKm: e.target.value }))} placeholder={TEXT.shoeDistancePlaceholder} /></label>
          <label className="col-span-2 flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.shoeMemo}</span><input className="dark-input h-9 px-3 text-xs" value={shoeForm.memo} onChange={(e) => setShoeForm((prev) => ({ ...prev, memo: e.target.value }))} placeholder={TEXT.shoeMemoPlaceholder} /></label>
        </div>
        <div className="mt-3 flex justify-end">
          <button className="h-9 rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 text-xs font-semibold text-amber-200 hover:bg-amber-400/25 transition" onClick={addShoe}>
            {TEXT.addShoe}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2.5">
          {shoes.map((shoe) => (
            <div key={shoe.shoeId} className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-zinc-100">{shoe.name || "-"}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{formatEntryFee(shoe.price)}{shoe.purchaseDate ? ` · ${shoe.purchaseDate}` : ""}</p>
                </div>
                <button className="text-xs text-zinc-500 hover:text-rose-400 transition" onClick={() => removeShoe(shoe.shoeId)}>{TEXT.remove}</button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-zinc-300">
                <label className="flex flex-col gap-1"><span className="text-zinc-500">{TEXT.shoePrice}</span><input className="dark-input h-8 px-2.5 text-xs" inputMode="numeric" value={shoe.price} onChange={(e) => updateShoe(shoe.shoeId, { price: e.target.value })} /></label>
                <label className="flex flex-col gap-1"><span className="text-zinc-500">{TEXT.shoePurchaseDate}</span><input className="dark-input h-8 px-2.5 text-xs" type="date" value={shoe.purchaseDate} onChange={(e) => updateShoe(shoe.shoeId, { purchaseDate: e.target.value })} /></label>
                <label className="flex flex-col gap-1"><span className="text-zinc-500">{TEXT.shoeDistance}</span><input className="dark-input h-8 px-2.5 text-xs" inputMode="decimal" value={shoe.distanceKm} onChange={(e) => updateShoe(shoe.shoeId, { distanceKm: e.target.value })} /></label>
                <label className="col-span-2 flex flex-col gap-1"><span className="text-zinc-500">{TEXT.shoeMemo}</span><input className="dark-input h-8 px-2.5 text-xs" value={shoe.memo} onChange={(e) => updateShoe(shoe.shoeId, { memo: e.target.value })} /></label>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );

  const renderMine = () => (
    <section className="mt-3 grid grid-cols-1 gap-3">
      <article className="card-panel p-4">
        <p className="text-sm font-bold text-zinc-100 tracking-tight">{TEXT.manualAdd}</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5 text-[13px] text-zinc-300">
          <label className="col-span-2 flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.manualName}</span><input className="dark-input h-9 px-3 text-xs" value={manualForm.name} onChange={(e) => setManualForm((p) => ({ ...p, name: e.target.value }))} placeholder={TEXT.manualNamePlaceholder} /></label>
          <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.manualDate}</span><input className="dark-input h-9 px-3 text-xs" type="date" value={manualForm.dateIso} onChange={(e) => setManualForm((p) => ({ ...p, dateIso: e.target.value }))} /></label>
          <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.manualRaceType}</span><select className="dark-input h-9 px-2 text-xs" value={manualForm.raceType} onChange={(e) => setManualForm((p) => ({ ...p, raceType: e.target.value }))}>{RACE_TYPE_OPTIONS.map((type) => <option key={type || "empty"} value={type}>{RACE_TYPE_LABEL[type]}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.manualDistances}</span><input className="dark-input h-9 px-3 text-xs" value={manualForm.distances} onChange={(e) => setManualForm((p) => ({ ...p, distances: e.target.value }))} placeholder="Half, 10K" /></label>
          <label className="col-span-2 flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.manualFee}</span><input className="dark-input h-9 px-3 text-xs" inputMode="numeric" value={manualForm.entryFee} onChange={(e) => setManualForm((p) => ({ ...p, entryFee: e.target.value }))} placeholder="50000" /></label>
          <label className="col-span-2 flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.manualPlace}</span><input className="dark-input h-9 px-3 text-xs" value={manualForm.place} onChange={(e) => setManualForm((p) => ({ ...p, place: e.target.value }))} placeholder={TEXT.manualPlacePlaceholder} /></label>
          <label className="col-span-2 flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.manualHomepage}</span><input className="dark-input h-9 px-3 text-xs" value={manualForm.homepage} onChange={(e) => setManualForm((p) => ({ ...p, homepage: e.target.value }))} placeholder="https://..." /></label>
        </div>
        <div className="mt-3 flex justify-end">
          <button className="h-9 rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 text-xs font-semibold text-amber-200 hover:bg-amber-400/25 transition" onClick={addManualEntry}>
            {TEXT.saveEntry}
          </button>
        </div>
      </article>

      {myEntries.map((entry) => {
        const missingFromSource = entry.raceId && !raceIdSet.has(entry.raceId);
        const fallbackHomepage = entry.homepage || (entry.raceId ? raceById.get(entry.raceId)?.homepage || "" : "");
        return (
          <article key={entry.entryId} className="card-panel p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-amber-400/90 tracking-wide">
                {entry.dateDisplay || formatDate(entry.dateIso)}
              </span>
              <button className="text-xs text-zinc-500 hover:text-rose-400 transition" onClick={() => removeEntry(entry.entryId)}>
                {TEXT.remove}
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <h2 className="text-[16px] font-bold leading-snug text-zinc-100 tracking-tight">{entry.name}</h2>
              {missingFromSource && <span className="rounded-full border border-rose-400/35 bg-rose-400/15 px-2 py-0.5 text-[11px] font-semibold text-rose-200">{TEXT.sourceMissing}</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] text-zinc-300">
              <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.status}</span><select className="dark-input h-9 px-2 text-xs" value={entry.status} onChange={(e) => updateEntry(entry.entryId, { status: e.target.value })}>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>)}</select></label>
              <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.raceType}</span><select className="dark-input h-9 px-2 text-xs" value={entry.raceType || ""} onChange={(e) => updateEntry(entry.entryId, { raceType: e.target.value })}>{RACE_TYPE_OPTIONS.map((type) => <option key={type || "empty"} value={type}>{RACE_TYPE_LABEL[type]}</option>)}</select></label>
              <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.entryFee}</span><input className="dark-input h-9 px-2.5 text-xs" inputMode="numeric" value={entry.entryFee || ""} onChange={(e) => updateEntry(entry.entryId, { entryFee: e.target.value })} placeholder="50000" /></label>
              <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.goalTime}</span><input className="dark-input h-9 px-2.5 text-xs" value={entry.goalTime} onChange={(e) => updateEntry(entry.entryId, { goalTime: e.target.value })} placeholder="03:45:00" /></label>
              <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.goalPace}</span><input className="dark-input h-9 px-2.5 text-xs" value={entry.goalPace} onChange={(e) => updateEntry(entry.entryId, { goalPace: e.target.value })} placeholder="5:20/km" /></label>
              <label className="flex flex-col gap-1"><span className="text-zinc-400 text-xs font-medium">{TEXT.resultTime}</span><input className="dark-input h-9 px-2.5 text-xs" value={entry.resultTime} onChange={(e) => updateEntry(entry.entryId, { resultTime: e.target.value })} placeholder="03:51:10" /></label>
            </div>
            <label className="mt-2.5 flex flex-col gap-1 text-[13px] text-zinc-300">
              <span className="text-zinc-400 text-xs font-medium">{TEXT.memo}</span>
              <textarea className="dark-input min-h-[72px] p-2.5 text-xs" value={entry.memo} onChange={(e) => updateEntry(entry.entryId, { memo: e.target.value })} placeholder={TEXT.memoPlaceholder} />
            </label>
            <label className="mt-2 flex flex-col gap-1 text-[13px] text-zinc-300">
              <span className="text-zinc-400 text-xs font-medium">{TEXT.resultNote}</span>
              <textarea className="dark-input min-h-[64px] p-2.5 text-xs" value={entry.resultNote} onChange={(e) => updateEntry(entry.entryId, { resultNote: e.target.value })} placeholder={TEXT.resultPlaceholder} />
            </label>
            {fallbackHomepage && (
              <div className="mt-3 flex items-center gap-2">
                <a className="h-8 rounded-lg border border-zinc-700/80 bg-zinc-800/50 hover:bg-zinc-800 px-3 text-xs font-semibold text-zinc-200 inline-flex items-center gap-1.5 transition" href={fallbackHomepage} target="_blank" rel="noreferrer">
                  <span>{TEXT.homepage}</span>
                  <span className="text-[10px] text-zinc-400">↗</span>
                </a>
              </div>
            )}
            <div className="mt-3 border-t border-zinc-800/70 pt-3 text-[13px] text-zinc-300">
              <p className="font-semibold text-zinc-200 text-xs">{TEXT.racePhotos}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{TEXT.racePhotosTip}</p>
              <input className="mt-2 block w-full text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer" type="file" accept="image/*" multiple onChange={(e) => onRacePhotosChange(entry.entryId, e.target.files)} />
              {(entry.racePhotoDataUrls || []).length > 0 && (
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {(entry.racePhotoDataUrls || []).map((photo, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-zinc-800 group">
                      <img alt="race-photo" src={photo} className="h-24 w-full cursor-zoom-in object-cover bg-zinc-950 transition hover:scale-105" onClick={() => setPhotoViewer(photo)} />
                      <button type="button" className="absolute right-1 top-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200 hover:text-white" onClick={() => removeRacePhoto(entry.entryId, idx)}>
                        {TEXT.removePhoto}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 border-t border-zinc-800/70 pt-3 text-[13px] text-zinc-300">
              <p className="font-semibold text-zinc-200 text-xs">{TEXT.cert}</p>
              <input className="mt-2 block w-full text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer" type="file" accept="image/*" onChange={(e) => onCertificateChange(entry.entryId, e.target.files?.[0])} />
              {entry.certificateDataUrl && (
                <div className="mt-2.5 rounded-xl overflow-hidden border border-zinc-800">
                  <img alt="certificate" src={entry.certificateDataUrl} className="max-h-48 w-full cursor-zoom-in object-contain bg-zinc-950" onClick={() => setPhotoViewer(entry.certificateDataUrl)} />
                </div>
              )}
            </div>
          </article>
        );
      })}
      {myEntries.length === 0 && <p className="card-panel p-6 text-center text-sm text-zinc-400">{TEXT.noEntries}</p>}
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
        <div className="card-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition" onClick={() => canGoPrev && setCalendarMonth(shiftMonth(calendarMonth, -1))} disabled={!canGoPrev}>{TEXT.prev}</button>
            <input className="dark-input h-9 px-3 text-xs font-semibold text-zinc-100" type="month" min={MIN_FILTER_MONTH} value={calendarMonth} onChange={(e) => setCalendarMonth(clampMonthFromMin(e.target.value))} />
            <button className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}>{TEXT.next}</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-500 py-1">{["일","월","화","수","목","금","토"].map((w, i) => <div key={w} className={i === 0 ? "text-rose-400/80" : i === 6 ? "text-sky-400/80" : ""}>{w}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((key, idx) => {
              if (!key) return <div key={`blank-${idx}`} className="h-11 rounded-xl bg-zinc-900/15" />;
              const raceList = racesByDate?.get(key) || [];
              const myList = entriesByDate.get(key) || [];
              const selected = selectedDate === key;
              return (
                <button
                  key={key}
                  className={`h-11 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                    selected
                      ? "border-amber-400/80 bg-amber-400/25 text-amber-200 shadow-md ring-1 ring-amber-400/40"
                      : myList.length > 0
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                      : raceList.length > 0
                      ? "border-zinc-750/70 bg-zinc-850/50 text-zinc-200 hover:border-zinc-600"
                      : "border-zinc-800/60 bg-zinc-900/40 text-zinc-500 hover:bg-zinc-800/40"
                  }`}
                  onClick={() => setSelectedDate(key)}
                >
                  <div className="flex items-center gap-1 leading-none">
                    <span>{Number(key.slice(8, 10))}</span>
                    {myList.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="내 등록 일정 있음" />}
                  </div>
                  {raceList.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-400 leading-none mt-1">
                      {raceList.length}건
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택한 날짜의 상세 일정 카드 */}
        <div className="mt-3 card-panel p-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-zinc-100 tracking-tight">
                {selectedDate ? `${selectedDate} 일정` : TEXT.selectDate}
              </p>
              {selectedDate && (
                <span className="text-xs text-zinc-400">
                  (내 일정 {selectedDateMyEntries.length}건 · 마라톤 {selectedDateRaces.length}건)
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-4">
            {/* 1. 내 등록 일정 */}
            {selectedDateMyEntries.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  내 등록 일정 ({selectedDateMyEntries.length}건)
                </p>
                {selectedDateMyEntries.map((e) => (
                  <div key={e.entryId} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-zinc-100">{e.name}</span>
                      {e.status && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(e.status)}`}>
                          {STATUS_LABEL[e.status] || e.status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 flex flex-wrap gap-x-3 gap-y-1">
                      {e.place && <span>장소: {e.place}</span>}
                      {e.distances && <span>종목: {e.distances}</span>}
                      {e.goalTime && <span>목표: {e.goalTime}</span>}
                      {e.resultTime && <span className="font-semibold text-emerald-400">기록: {e.resultTime}</span>}
                    </div>
                    {e.memo && <p className="text-xs text-zinc-300 bg-zinc-900/60 rounded-lg p-2 mt-1">{e.memo}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* 2. 해당 날짜에 열리는 마라톤 대회 목록 */}
            {selectedDateRaces.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  마라톤 대회 목록 ({selectedDateRaces.length}건)
                </p>
                <div className="space-y-2.5">
                  {selectedDateRaces.map((race) => {
                    const alreadyAdded = entries.some((e) => e.raceId && e.raceId === race.id);
                    return (
                      <div key={race.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-zinc-100 leading-snug">{race.name}</h3>
                            {race.status && (
                              <span className={`inline-block mt-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(race.status)}`}>
                                {STATUS_LABEL[race.status] || race.status}
                              </span>
                            )}
                          </div>
                          <button
                            className={`h-7 px-2.5 rounded-lg border font-semibold text-xs transition flex items-center gap-1 ${
                              alreadyAdded
                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 cursor-default"
                                : "border-amber-400/40 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 active:scale-95"
                            }`}
                            onClick={() => !alreadyAdded && addRaceToMyEntries(race)}
                            disabled={alreadyAdded}
                          >
                            {alreadyAdded ? "✓ 등록됨" : "+ 내 일정 추가"}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-zinc-400">
                          <p className="truncate"><span className="text-zinc-500">종목:</span> {race.distances || "-"}</p>
                          <p className="truncate"><span className="text-zinc-500">장소:</span> {race.place || "-"}</p>
                          <p className="col-span-2"><span className="text-zinc-500">접수:</span> {formatRegPeriod(race.registration_period)}</p>
                          {race.organizer && <p className="col-span-2 truncate"><span className="text-zinc-500">주최:</span> {race.organizer}</p>}
                        </div>
                        {race.homepage && (
                          <div className="pt-0.5">
                            <a
                              className="h-7 rounded-lg border border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-800 px-2.5 text-xs font-medium text-zinc-300 inline-flex items-center gap-1 transition"
                              href={race.homepage}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <span>홈페이지</span>
                              <span className="text-[10px] text-zinc-500">↗</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 아무 일정도 없을 때 */}
            {selectedDate && selectedDateMyEntries.length === 0 && selectedDateRaces.length === 0 && (
              <p className="text-xs text-zinc-500 py-4 text-center">선택한 날짜에 예정된 마라톤 대회가 없습니다.</p>
            )}
            {!selectedDate && (
              <p className="text-xs text-zinc-500 py-4 text-center">달력에서 날짜를 선택하면 해당 일자의 마라톤 대회 및 내 일정이 표시됩니다.</p>
            )}
          </div>
        </div>
      </section>
    );
  };

  return (
    <main className="mx-auto w-full max-w-xl px-3 pb-20 pt-4 sm:px-4">
      {/* Header Panel */}
      <section className="hero-panel p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">RACEBOOK ARCHIVE</p>
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {user.user_metadata?.nickname || user.email?.split("@")[0]} 님
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition shadow-sm"
            >
              <span>로그인 / 회원가입</span>
            </button>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">{TEXT.plannerTitle}</h1>
          <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300">PRO</span>
        </div>
        <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{TEXT.plannerDesc}</p>
        <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
          <span className="stat-chip">{TEXT.updated} {racesData.updatedAt ? new Date(racesData.updatedAt).toLocaleDateString("ko-KR") : "-"}</span>
          <span className="stat-chip">{TEXT.upcoming} {browseRaces.length}건</span>
          {user ? (
            <span className="stat-chip stat-chip-strong">{TEXT.myEntries} {entries.length}건</span>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="stat-chip stat-chip-strong cursor-pointer hover:border-amber-400/60 transition"
            >
              로그인하고 내 일정/기록 관리 시작 ↗
            </button>
          )}
        </div>
      </section>

      {/* Navigation & Filters Panel */}
      <section className="nav-panel sticky top-2 z-20 mt-3 p-1.5">
        {user ? (
          <div className="grid grid-cols-4 gap-1">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                className={`h-9 text-xs font-semibold transition-all ${tab === t.id ? "nav-tab-active" : "nav-tab"}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between px-2.5 py-1">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              대회 탐색
            </span>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs text-zinc-400 hover:text-amber-300 font-medium transition flex items-center gap-1"
            >
              <span>로그인 시 내 일정·마이·캘린더 이용 가능</span>
              <span className="text-[10px]">↗</span>
            </button>
          </div>
        )}

        {tab === "browse" && (
          <div className="mt-2 space-y-2 pt-1 border-t border-zinc-800/60">
            <input
              className="dark-input h-10 w-full px-3.5 text-xs text-zinc-100"
              placeholder={TEXT.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-2">
              <select
                className="dark-input h-10 px-3 text-xs text-zinc-200"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="all">{TEXT.allRegions}</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="overflow-x-auto pb-1" ref={monthScrollerRef}>
                <div className="flex min-w-max gap-1.5">
                  <button
                    type="button"
                    className={`h-8 px-3 text-xs font-semibold transition-all ${
                      month === todayMonth ? "dark-chip-active" : "dark-chip"
                    }`}
                    onClick={() => setMonth(todayMonth)}
                  >
                    오늘
                  </button>
                  {monthOptions.map((m) => (
                    <button
                      key={m}
                      ref={(el) => { monthChipRefs.current[m] = el; }}
                      type="button"
                      className={`h-8 px-3 text-xs transition-all ${
                        month === m ? "dark-chip-active" : "dark-chip"
                      }`}
                      onClick={() => setMonth(m)}
                      onFocus={() => scrollMonthChipToStart(m)}
                    >
                      {formatMonthLabel(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="dark-input flex h-10 items-center gap-2 px-3 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                className="rounded accent-amber-400"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
              />
              {TEXT.openOnly}
            </label>
          </div>
        )}
      </section>

      {tab === "browse" && renderBrowse()}
      {user && tab === "mine" && renderMine()}
      {user && tab === "mypage" && renderMyPage()}
      {user && tab === "calendar" && renderCalendar()}

      {photoViewer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex items-center justify-center" onClick={() => setPhotoViewer("")}>
          <div className="relative max-h-[88vh] max-w-4xl">
            <img
              alt="race-photo-full"
              src={photoViewer}
              className="max-h-[86vh] max-w-[94vw] rounded-2xl border border-zinc-700/80 bg-zinc-950 object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="absolute -top-3 -right-3 rounded-full border border-zinc-600 bg-zinc-800 text-zinc-200 hover:text-white h-8 w-8 flex items-center justify-center text-sm font-bold shadow-lg"
              onClick={() => setPhotoViewer("")}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </main>
  );
}





