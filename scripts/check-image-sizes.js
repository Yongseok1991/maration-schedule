import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || "https://ayvxlbnovvsdupxsotec.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_1lcq2IVZvi71rgHJrZMvVg_sUse0Vzp";
const supabase = createClient(url, key);
const userId = "ae873dfa-ec62-488f-a088-157e23ef7d6b";

async function main() {
  console.log("==================================================");
  console.log("📸 Supabase Storage 실제 저장된 이미지 파일 용량 분석");
  console.log("==================================================\n");

  console.log("1. [certificates] 완주증 버킷:");
  const { data: certs, error: cErr } = await supabase.storage.from("certificates").list(userId);
  if (cErr) {
    console.error("  ❌ 조회 실패:", cErr.message);
  } else if (!certs || certs.length === 0) {
    console.log("  (파일 없음)");
  } else {
    certs.forEach((f) => {
      const sizeKB = (f.metadata?.size / 1024).toFixed(1);
      const isCompressed = f.metadata?.size < 1500 * 1024;
      console.log(`  • ${f.name} => ${sizeKB} KB ${isCompressed ? "✅ (압축 정상: 1.5MB 이하)" : "⚠️"}`);
    });
  }

  console.log("\n2. [race-photos] 대회 사진 갤러리 버킷:");
  const { data: photos, error: pErr } = await supabase.storage.from("race-photos").list(userId);
  if (pErr) {
    console.error("  ❌ 조회 실패:", pErr.message);
  } else if (!photos || photos.length === 0) {
    console.log("  (파일 없음)");
  } else {
    photos.forEach((f) => {
      const sizeKB = (f.metadata?.size / 1024).toFixed(1);
      const isCompressed = f.metadata?.size < 1000 * 1024;
      console.log(`  • ${f.name} => ${sizeKB} KB ${isCompressed ? "✅ (압축 정상: 1MB 이하)" : "⚠️"}`);
    });
  }
  console.log("\n==================================================");
}

main();
