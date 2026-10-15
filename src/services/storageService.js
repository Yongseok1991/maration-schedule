import { supabase } from "./supabase";

/**
 * Base64 Data URL 또는 Blob을 Supabase Storage에 업로드
 */
export const storageService = {
  async uploadDataUrl(bucket, path, dataUrl) {
    if (!supabase) throw new Error("Supabase is not configured");

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const contentType = blob.type || "image/jpeg";

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType,
        upsert: true
      });

    if (error) throw error;

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicData.publicUrl;
  },

  async uploadCertificate(userId, entryId, dataUrl) {
    if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl; // 이미 URL이면 그대로 반환
    const ext = dataUrl.includes("image/png") ? "png" : "jpg";
    const path = `${userId}/${entryId}_cert_${Date.now()}.${ext}`;
    return this.uploadDataUrl("certificates", path, dataUrl);
  },

  async uploadRacePhoto(userId, entryId, index, dataUrl) {
    if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
    const ext = dataUrl.includes("image/png") ? "png" : "jpg";
    const path = `${userId}/${entryId}_photo_${index}_${Date.now()}.${ext}`;
    return this.uploadDataUrl("race-photos", path, dataUrl);
  }
};
