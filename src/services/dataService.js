import { supabase } from "./supabase";
import { storageService } from "./storageService";
import { getKstIsoString, getTodayKstDate } from "../utils/dateUtils";

export const dataService = {
  /**
   * 유저의 마라톤 대회 등록 목록 조회
   */
  async getEntries(userId) {
    if (!supabase || !userId) return [];

    const { data, error } = await supabase
      .from("user_races")
      .select("*, race_photos(photo_url, display_order)")
      .eq("user_id", userId)
      .order("date_iso", { ascending: false });

    if (error) {
      console.error("Failed to fetch user races:", error);
      throw error;
    }

    return (data || []).map((row) => ({
      entryId: row.id,
      raceId: row.race_id,
      name: row.name,
      dateIso: row.date_iso,
      dateDisplay: row.date_display,
      place: row.place,
      distances: row.distances,
      homepage: row.homepage,
      status: row.status,
      raceType: row.race_type,
      entryFee: row.entry_fee ? String(row.entry_fee) : "",
      goalTime: row.goal_time || "",
      goalPace: row.goal_pace || "",
      resultTime: row.result_time || "",
      memo: row.memo || "",
      resultNote: row.result_note || "",
      certificateDataUrl: row.certificate_url || "",
      racePhotoDataUrls: (row.race_photos || [])
        .sort((a, b) => a.display_order - b.display_order)
        .map((p) => p.photo_url),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  /**
   * 단일 대회 기록 등록 / 업데이트 (이미지 스토리지 업로드 포함)
   */
  async saveEntry(entry, userId) {
    if (!supabase || !userId) throw new Error("로그인이 필요합니다.");

    let certUrl = entry.certificateDataUrl || "";
    // Base64 이미지인 경우 Supabase Storage에 업로드 후 URL로 대체
    if (certUrl.startsWith("data:")) {
      try {
        certUrl = await storageService.uploadCertificate(userId, entry.entryId, certUrl);
      } catch (err) {
        console.error("Cert upload error:", err);
      }
    }

    const payload = {
      id: entry.entryId,
      user_id: userId,
      race_id: entry.raceId || null,
      name: entry.name,
      date_iso: entry.dateIso || getTodayKstDate(),
      date_display: entry.dateDisplay || "",
      place: entry.place || "",
      distances: entry.distances || "",
      homepage: entry.homepage || "",
      status: entry.status || "registered",
      race_type: entry.raceType || "",
      entry_fee: Number.parseInt(String(entry.entryFee).replace(/[^\d]/g, ""), 10) || 0,
      goal_time: entry.goalTime || "",
      goal_pace: entry.goalPace || "",
      result_time: entry.resultTime || "",
      memo: entry.memo || "",
      result_note: entry.resultNote || "",
      certificate_url: certUrl,
      created_at: entry.createdAt || getKstIsoString(),
      updated_at: getKstIsoString()
    };

    const { error } = await supabase.from("user_races").upsert(payload, { onConflict: "id" });
    if (error) throw error;

    // 갤러리 사진 처리
    if (Array.isArray(entry.racePhotoDataUrls)) {
      for (let i = 0; i < entry.racePhotoDataUrls.length; i++) {
        let photoUrl = entry.racePhotoDataUrls[i];
        if (photoUrl.startsWith("data:")) {
          try {
            photoUrl = await storageService.uploadRacePhoto(userId, entry.entryId, i, photoUrl);
          } catch (err) {
            console.error("Photo upload error:", err);
          }
        }
        await supabase.from("race_photos").upsert({
          user_id: userId,
          user_race_id: entry.entryId,
          photo_url: photoUrl,
          display_order: i,
          created_at: getKstIsoString()
        });
      }
    }

    return { ...entry, certificateDataUrl: certUrl };
  },

  /**
   * 대회 삭제
   */
  async deleteEntry(entryId, userId) {
    if (!supabase || !userId) throw new Error("로그인이 필요합니다.");
    const { error } = await supabase.from("user_races").delete().eq("id", entryId).eq("user_id", userId);
    if (error) throw error;
  },

  /**
   * 러닝화 목록 조회
   */
  async getShoes(userId) {
    if (!supabase || !userId) return [];
    const { data, error } = await supabase
      .from("shoes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      shoeId: row.id,
      name: row.name,
      price: row.price ? String(row.price) : "",
      purchaseDate: row.purchase_date || "",
      distanceKm: row.distance_km ? String(row.distance_km) : "",
      memo: row.memo || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  /**
   * 러닝화 등록 / 수정
   */
  async saveShoe(shoe, userId) {
    if (!supabase || !userId) throw new Error("로그인이 필요합니다.");
    const { error } = await supabase.from("shoes").upsert({
      id: shoe.shoeId,
      user_id: userId,
      name: shoe.name,
      price: Number.parseInt(String(shoe.price).replace(/[^\d]/g, ""), 10) || 0,
      purchase_date: shoe.purchaseDate || null,
      distance_km: Number.parseFloat(shoe.distanceKm) || 0,
      memo: shoe.memo || "",
      created_at: shoe.createdAt || getKstIsoString(),
      updated_at: getKstIsoString()
    });
    if (error) throw error;
  },

  /**
   * 러닝화 삭제
   */
  async deleteShoe(shoeId, userId) {
    if (!supabase || !userId) throw new Error("로그인이 필요합니다.");
    const { error } = await supabase.from("shoes").delete().eq("id", shoeId).eq("user_id", userId);
    if (error) throw error;
  }
};
