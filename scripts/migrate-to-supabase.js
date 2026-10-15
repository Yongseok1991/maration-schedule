import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// .env.local 로드
dotenv.config({ path: path.resolve(".env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ .env.local에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY가 설정되어 있어야 합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function uploadDataUrl(bucket, filePath, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
  try {
    const base64Data = dataUrl.split(",")[1];
    const mimeMatch = dataUrl.match(/data:([^;]+);/);
    const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const buffer = Buffer.from(base64Data, "base64");

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.warn(`Storage upload warning (${filePath}):`, error.message);
      return dataUrl;
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicData.publicUrl;
  } catch (err) {
    console.warn(`Storage upload error (${filePath}):`, err.message);
    return dataUrl;
  }
}

async function main() {
  const targetEmail = process.argv[2];
  let userId = process.argv[3];

  console.log("==================================================");
  console.log("🏃 Maraton Data Migration: user-data -> Supabase");
  console.log("==================================================\n");

  const jsonPath = path.resolve("user-data/my-marathons.json");
  console.log(`[1/4] Reading local backup file: ${jsonPath}`);
  const raw = await fs.readFile(jsonPath, "utf-8");
  const data = JSON.parse(raw);

  const entries = data.entries || [];
  const shoes = data.shoes || [];
  console.log(`      Found ${entries.length} race entries and ${shoes.length} shoes.\n`);

  if (!userId) {
    console.log("[2/4] Resolving user account...");
    // 세션 또는 사용자 조회
    const { data: usersData, error: userError } = await supabase.auth.getUser();
    if (usersData?.user?.id) {
      userId = usersData.user.id;
    } else {
      console.log("      ⚠️ CLI에서는 로그인 세션이 없으므로, 대상 유저의 ID(UUID)가 필요합니다.");
      console.log("      사용법: node scripts/migrate-to-supabase.js [USER_UUID]");
      console.log("\n      💡 웹 화면에서도 마이그레이션이 가능합니다:");
      console.log("      1. 'npm run dev' 실행 후 웹 브라우저에서 로그인");
      console.log("      2. '동기화' 탭에서 [백업 가져오기] 클릭 후 'user-data/my-marathons.json' 선택");
      console.log("      3. 18개 대회가 현재 로그인 계정의 Supabase DB로 자동 저장됩니다!\n");
      return;
    }
  }

  console.log(`[3/4] Migrating ${entries.length} race entries to user (${userId})...`);
  let raceCount = 0;
  for (const entry of entries) {
    let certUrl = entry.certificateDataUrl || "";
    if (certUrl.startsWith("data:")) {
      console.log(`      Uploading certificate for: ${entry.name}`);
      const ext = certUrl.includes("image/png") ? "png" : "jpg";
      const filePath = `${userId}/${entry.entryId}_cert_${Date.now()}.${ext}`;
      certUrl = await uploadDataUrl("certificates", filePath, certUrl);
    }

    const payload = {
      id: entry.entryId,
      user_id: userId,
      race_id: entry.raceId || null,
      name: entry.name,
      date_iso: entry.dateIso || new Date().toISOString().slice(0, 10),
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
      updated_at: new Date().toISOString()
    };

    const { error: raceErr } = await supabase.from("user_races").upsert(payload, { onConflict: "id" });
    if (raceErr) {
      console.error(`      ❌ Error saving race (${entry.name}):`, raceErr.message);
    } else {
      raceCount++;
    }

    // 갤러리 사진
    if (Array.isArray(entry.racePhotoDataUrls)) {
      for (let i = 0; i < entry.racePhotoDataUrls.length; i++) {
        let photoUrl = entry.racePhotoDataUrls[i];
        if (photoUrl.startsWith("data:")) {
          const ext = photoUrl.includes("image/png") ? "png" : "jpg";
          const filePath = `${userId}/${entry.entryId}_photo_${i}_${Date.now()}.${ext}`;
          photoUrl = await uploadDataUrl("race-photos", filePath, photoUrl);
        }
        await supabase.from("race_photos").upsert({
          user_id: userId,
          user_race_id: entry.entryId,
          photo_url: photoUrl,
          display_order: i
        });
      }
    }
  }
  console.log(`      ✅ Successfully migrated ${raceCount}/${entries.length} race entries.\n`);

  console.log(`[4/4] Migrating ${shoes.length} shoes...`);
  let shoeCount = 0;
  for (const shoe of shoes) {
    const { error: shoeErr } = await supabase.from("shoes").upsert({
      id: shoe.shoeId,
      user_id: userId,
      name: shoe.name,
      price: Number.parseInt(String(shoe.price).replace(/[^\d]/g, ""), 10) || 0,
      purchase_date: shoe.purchaseDate || null,
      distance_km: Number.parseFloat(shoe.distanceKm) || 0,
      memo: shoe.memo || "",
      updated_at: new Date().toISOString()
    });
    if (shoeErr) {
      console.error(`      ❌ Error saving shoe (${shoe.name}):`, shoeErr.message);
    } else {
      shoeCount++;
    }
  }
  console.log(`      ✅ Successfully migrated ${shoeCount}/${shoes.length} shoes.\n`);

  console.log("==================================================");
  console.log("🎉 Migration finished successfully!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
