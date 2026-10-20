import { useState, useEffect, useCallback, useMemo } from "react";
import { dataService } from "../services/dataService";
import { optimizeImageFile, isSupportedImageFile, dataUrlBytes } from "../utils/imageOptimizer";
import { getKstIsoString } from "../utils/dateUtils";

const LOCAL_STORAGE_KEY = "maraton.my_entries.v1";

const detectDistanceCategory = (value) => {
  const text = String(value || "").toLowerCase().replace(/\s+/g, "");
  if (!text) return "";
  if (text.includes("5km") || /(^|[^0-9])5k/.test(text)) return "5k";
  if (text.includes("42.195") || text.includes("풀코스") || /(^|[^0-9])42k/.test(text) || text.includes("풀")) return "full";
  if (text.includes("하프") || text.includes("21.0975") || /(^|[^0-9])21k/.test(text)) return "half";
  if (text.includes("10km") || /(^|[^0-9])10k/.test(text)) return "10k";
  return "";
};

const makeEntry = (race, initialStatus = "registered") => ({
  entryId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  raceId: race.id || null,
  name: race.name || "이름 없는 대회",
  dateIso: race.date_iso || "",
  dateDisplay: race.date_display || "",
  place: race.place || "",
  distances: race.distances || "",
  homepage: race.homepage || "",
  status: initialStatus,
  raceType: detectDistanceCategory(race.distances),
  entryFee: "",
  goalTime: "",
  goalPace: "",
  memo: "",
  resultTime: "",
  resultNote: "",
  certificateDataUrl: "",
  racePhotoDataUrls: [],
  createdAt: getKstIsoString(),
  updatedAt: getKstIsoString()
});

const saveToLocalStorage = (data) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to write entries to localStorage:", err);
  }
};

export function useEntries(user, authLoading) {
  const [entries, setEntries] = useState([]);
  const [entriesReady, setEntriesReady] = useState(false);
  const [syncState, setSyncState] = useState({ kind: "idle", message: "" });

  const loadEntries = useCallback(async () => {
    if (!user) {
      // 1. 비로그인 상태일 때는 localStorage 확인
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEntries(parsed);
            setEntriesReady(true);
            return;
          }
        }
        // 2. localStorage도 없으면 기본 user-data/my-marathons.json 읽어오기
        const res = await fetch("./user-data/my-marathons.json");
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json?.entries) ? json.entries : [];
          setEntries(items);
          saveToLocalStorage(items);
        }
      } catch (err) {
        console.warn("Guest entries fallback notice:", err);
      } finally {
        setEntriesReady(true);
      }
      return;
    }

    try {
      const data = await dataService.getEntries(user.id);
      setEntries(data);
      saveToLocalStorage(data);
    } catch (err) {
      console.error("Failed to load user entries from Supabase:", err);
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) setEntries(JSON.parse(local));
      } catch {}
      setSyncState({ kind: "error", message: "일정을 불러오지 못했습니다." });
    } finally {
      setEntriesReady(true);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadEntries();
    }
  }, [authLoading, loadEntries]);

  const addRaceToEntries = async (race, initialStatus = "registered") => {
    const existing = entries.find((e) => e.raceId && e.raceId === race.id);
    if (existing) {
      // 이미 관심 상태인데 [ + ] 접수 추가를 누른 경우 -> 접수완료로 상태 업데이트
      if (existing.status === "interested" && initialStatus === "registered") {
        return updateEntry(existing.entryId, { status: "registered" });
      }
      return { alreadyExists: true };
    }
    const newEntry = makeEntry(race, initialStatus);
    const next = [newEntry, ...entries];
    setEntries(next);
    saveToLocalStorage(next);

    const isFav = initialStatus === "interested";
    const msg = isFav ? "⭐ 관심 대회로 등록되었습니다. (접수 오픈 전날/당일 알림)" : "내 일정에 추가되었습니다.";

    if (!user) {
      setSyncState({ kind: "success", message: `${msg} (로컬)` });
      return { success: true };
    }

    try {
      await dataService.saveEntry(newEntry, user.id);
      setSyncState({ kind: "success", message: msg });
      return { success: true };
    } catch (err) {
      console.error("Save entry error:", err);
      setSyncState({ kind: "error", message: "저장 중 오류가 발생했습니다." });
      return { success: false, error: err };
    }
  };

  const toggleFavoriteRace = async (race) => {
    const existing = entries.find((e) => e.raceId && e.raceId === race.id);
    if (existing) {
      if (existing.status === "interested") {
        // 관심 상태이면 토글 해제 (삭제)
        await removeEntry(existing.entryId);
        setSyncState({ kind: "success", message: "관심 등록이 해제되었습니다." });
        return { isFavorite: false };
      }
      // 이미 접수완료/준비중/완주로 등록된 대회
      alert("이미 내 일정에 등록되어 있는 대회입니다.");
      return { isFavorite: true, alreadyRegistered: true };
    }

    // 새로 관심 등록
    await addRaceToEntries(race, "interested");
    return { isFavorite: true };
  };

  const addManualEntry = async (manualForm) => {
    const name = manualForm.name.trim();
    if (!name) return { error: "대회명을 입력해주세요." };

    const newEntry = makeEntry({
      id: null,
      name,
      date_iso: manualForm.dateIso || "",
      date_display: manualForm.dateIso || "",
      place: manualForm.place?.trim() || "",
      distances: manualForm.distances?.trim() || "",
      homepage: manualForm.homepage?.trim() || ""
    });
    newEntry.entryFee = manualForm.entryFee?.trim() || "";
    newEntry.raceType = manualForm.raceType || "";

    const next = [newEntry, ...entries];
    setEntries(next);
    saveToLocalStorage(next);

    if (!user) {
      setSyncState({ kind: "success", message: "대회가 추가되었습니다. (로컬)" });
      return { success: true };
    }

    try {
      await dataService.saveEntry(newEntry, user.id);
      setSyncState({ kind: "success", message: "대회가 추가되었습니다." });
      return { success: true };
    } catch (err) {
      console.error("Save manual error:", err);
      setSyncState({ kind: "error", message: "저장 실패" });
      return { success: false, error: err };
    }
  };

  const updateEntry = (entryId, patch) => {
    const target = entries.find((e) => e.entryId === entryId);
    if (!target) return;

    const updated = { ...target, ...patch, updatedAt: getKstIsoString() };
    const next = entries.map((e) => (e.entryId === entryId ? updated : e));
    setEntries(next);
    saveToLocalStorage(next);
  };

  const saveEntry = async (entryId) => {
    const target = entries.find((e) => e.entryId === entryId);
    if (!target) return { error: "대회를 찾을 수 없습니다." };

    saveToLocalStorage(entries);

    if (!user) {
      setSyncState({ kind: "success", message: "로컬에 저장되었습니다." });
      return { success: true, local: true };
    }

    try {
      const saved = await dataService.saveEntry(target, user.id);
      if (saved) {
        const next = entries.map((e) => (e.entryId === entryId ? { ...e, ...saved } : e));
        setEntries(next);
        saveToLocalStorage(next);
      }
      setSyncState({ kind: "success", message: "클라우드 DB에 저장되었습니다." });
      return { success: true };
    } catch (err) {
      console.error("Save entry error:", err);
      setSyncState({ kind: "error", message: "저장에 실패했습니다." });
      return { success: false, error: err };
    }
  };

  const removeEntry = async (entryId) => {
    const next = entries.filter((e) => e.entryId !== entryId);
    setEntries(next);
    saveToLocalStorage(next);

    if (!user) {
      setSyncState({ kind: "success", message: "삭제되었습니다." });
      return;
    }

    try {
      await dataService.deleteEntry(entryId, user.id);
      setSyncState({ kind: "success", message: "삭제되었습니다." });
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const onCertificateChange = async (entryId, file) => {
    if (!file) return;
    if (!isSupportedImageFile(file)) {
      setSyncState({ kind: "error", message: "이미지 파일만 업로드할 수 있습니다." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setSyncState({ kind: "error", message: "이미지는 최대 8MB까지 가능합니다." });
      return;
    }
    try {
      const optimized = await optimizeImageFile(file, { maxSide: 2200, maxBytes: 1400 * 1024 });
      const target = entries.find((e) => e.entryId === entryId);
      if (!target) return;
      const updated = { ...target, certificateDataUrl: optimized, updatedAt: getKstIsoString() };
      const next = entries.map((e) => (e.entryId === entryId ? updated : e));
      setEntries(next);
      saveToLocalStorage(next);
      if (user) {
        const saved = await dataService.saveEntry(updated, user.id);
        if (saved) {
          const nextWithSaved = next.map((e) => (e.entryId === entryId ? { ...e, ...saved } : e));
          setEntries(nextWithSaved);
          saveToLocalStorage(nextWithSaved);
        }
      }
    } catch {
      setSyncState({ kind: "error", message: "이미지 처리 실패" });
    }
  };

  const onRacePhotosChange = async (entryId, fileList) => {
    const current = entries.find((e) => e.entryId === entryId);
    const currentCount = current?.racePhotoDataUrls?.length || 0;
    const available = Math.max(0, 6 - currentCount);
    const files = Array.from(fileList || []).slice(0, available);
    if (!files.length) return;

    try {
      const urls = await Promise.all(
        files.map((file) => optimizeImageFile(file, { maxSide: 1800, maxBytes: 900 * 1024 }))
      );
      const merged = Array.from(new Set([...(current?.racePhotoDataUrls || []), ...urls])).slice(0, 6);
      const updated = { ...current, racePhotoDataUrls: merged, updatedAt: getKstIsoString() };
      const next = entries.map((e) => (e.entryId === entryId ? updated : e));
      setEntries(next);
      saveToLocalStorage(next);
      if (user) {
        const saved = await dataService.saveEntry(updated, user.id);
        if (saved) {
          const nextWithSaved = next.map((e) => (e.entryId === entryId ? { ...e, ...saved } : e));
          setEntries(nextWithSaved);
          saveToLocalStorage(nextWithSaved);
        }
      }
    } catch {
      setSyncState({ kind: "error", message: "사진 처리 중 오류가 발생했습니다." });
    }
  };

  const removeRacePhoto = async (entryId, index) => {
    const target = entries.find((e) => e.entryId === entryId);
    if (!target) return;
    const nextPhotos = (target.racePhotoDataUrls || []).filter((_, i) => i !== index);
    const updated = { ...target, racePhotoDataUrls: nextPhotos, updatedAt: getKstIsoString() };
    const next = entries.map((e) => (e.entryId === entryId ? updated : e));
    setEntries(next);
    saveToLocalStorage(next);
    if (user) {
      const saved = await dataService.saveEntry(updated, user.id);
      if (saved) {
        const nextWithSaved = next.map((e) => (e.entryId === entryId ? { ...e, ...saved } : e));
        setEntries(nextWithSaved);
        saveToLocalStorage(nextWithSaved);
      }
    }
  };

  const entriesByDate = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      if (!e.dateIso) return;
      if (!map.has(e.dateIso)) map.set(e.dateIso, []);
      map.get(e.dateIso).push(e);
    });
    return map;
  }, [entries]);

  return {
    entries,
    entriesReady,
    entriesByDate,
    syncState,
    setSyncState,
    addRaceToEntries,
    toggleFavoriteRace,
    addManualEntry,
    updateEntry,
    saveEntry,
    removeEntry,
    onCertificateChange,
    onRacePhotosChange,
    removeRacePhoto,
    reload: loadEntries
  };
}
