import { useState, useEffect, useCallback, useMemo } from "react";
import { dataService } from "../services/dataService";
import { optimizeImageFile, isSupportedImageFile, dataUrlBytes } from "../utils/imageOptimizer";

const detectDistanceCategory = (value) => {
  const text = String(value || "").toLowerCase().replace(/\s+/g, "");
  if (!text) return "";
  if (text.includes("5km") || /(^|[^0-9])5k/.test(text)) return "5k";
  if (text.includes("42.195") || text.includes("풀코스") || /(^|[^0-9])42k/.test(text) || text.includes("풀")) return "full";
  if (text.includes("하프") || text.includes("21.0975") || /(^|[^0-9])21k/.test(text)) return "half";
  if (text.includes("10km") || /(^|[^0-9])10k/.test(text)) return "10k";
  return "";
};

const makeEntry = (race) => ({
  entryId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  raceId: race.id || null,
  name: race.name || "이름 없는 대회",
  dateIso: race.date_iso || "",
  dateDisplay: race.date_display || "",
  place: race.place || "",
  distances: race.distances || "",
  homepage: race.homepage || "",
  status: "registered",
  raceType: detectDistanceCategory(race.distances),
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

export function useEntries(user, authLoading) {
  const [entries, setEntries] = useState([]);
  const [entriesReady, setEntriesReady] = useState(false);
  const [syncState, setSyncState] = useState({ kind: "idle", message: "" });

  const loadEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setEntriesReady(true);
      return;
    }
    try {
      const data = await dataService.getEntries(user.id);
      setEntries(data);
    } catch (err) {
      console.error("Failed to load user entries:", err);
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

  const addRaceToEntries = async (race) => {
    if (!user) {
      return { needAuth: true };
    }
    if (entries.some((e) => e.raceId && e.raceId === race.id)) {
      return { alreadyExists: true };
    }
    const newEntry = makeEntry(race);
    setEntries((prev) => [newEntry, ...prev]);

    try {
      await dataService.saveEntry(newEntry, user.id);
      setSyncState({ kind: "success", message: "내 일정에 추가되었습니다." });
      return { success: true };
    } catch (err) {
      console.error("Save entry error:", err);
      setSyncState({ kind: "error", message: "저장 중 오류가 발생했습니다." });
      return { success: false, error: err };
    }
  };

  const addManualEntry = async (manualForm) => {
    if (!user) return { needAuth: true };
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

    setEntries((prev) => [newEntry, ...prev]);

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

  const updateEntry = async (entryId, patch) => {
    if (!user) return;
    const target = entries.find((e) => e.entryId === entryId);
    if (!target) return;

    const updated = { ...target, ...patch, updatedAt: new Date().toISOString() };
    setEntries((prev) => prev.map((e) => (e.entryId === entryId ? updated : e)));

    try {
      await dataService.saveEntry(updated, user.id);
    } catch (err) {
      console.error("Update error:", err);
      setSyncState({ kind: "error", message: "업데이트 실패" });
    }
  };

  const removeEntry = async (entryId) => {
    if (!user) return;
    setEntries((prev) => prev.filter((e) => e.entryId !== entryId));
    try {
      await dataService.deleteEntry(entryId, user.id);
      setSyncState({ kind: "success", message: "삭제되었습니다." });
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const onCertificateChange = async (entryId, file) => {
    if (!user || !file) return;
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
      await updateEntry(entryId, { certificateDataUrl: optimized });
    } catch {
      setSyncState({ kind: "error", message: "이미지 처리 실패" });
    }
  };

  const onRacePhotosChange = async (entryId, fileList) => {
    if (!user) return;
    const current = entries.find((e) => e.entryId === entryId);
    const currentCount = current?.racePhotoDataUrls?.length || 0;
    const available = Math.max(0, 6 - currentCount);
    const files = Array.from(fileList || []).slice(0, available);
    if (!files.length) return;

    try {
      const urls = await Promise.all(
        files.map((file) => optimizeImageFile(file, { maxSide: 1800, maxBytes: 900 * 1024 }))
      );
      const nextPhotos = [...(current?.racePhotoDataUrls || []), ...urls].slice(0, 6);
      await updateEntry(entryId, { racePhotoDataUrls: nextPhotos });
    } catch {
      setSyncState({ kind: "error", message: "사진 처리 중 오류가 발생했습니다." });
    }
  };

  const removeRacePhoto = async (entryId, index) => {
    if (!user) return;
    const target = entries.find((e) => e.entryId === entryId);
    if (!target) return;
    const nextPhotos = (target.racePhotoDataUrls || []).filter((_, i) => i !== index);
    await updateEntry(entryId, { racePhotoDataUrls: nextPhotos });
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
    addManualEntry,
    updateEntry,
    removeEntry,
    onCertificateChange,
    onRacePhotosChange,
    removeRacePhoto,
    reload: loadEntries
  };
}
