import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

async function loadEnv() {
  const envPath = path.resolve(".env.local");
  try {
    const raw = await fs.readFile(envPath, "utf-8");
    const env = {};
    raw.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val;
      }
    });
    return env;
  } catch {
    return {};
  }
}

async function uploadDataUrl(supabaseAdmin, bucket, filePath, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
  try {
    const base64Data = dataUrl.split(",")[1];
    const mimeMatch = dataUrl.match(/data:([^;]+);/);
    const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const buffer = Buffer.from(base64Data, "base64");

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.warn(`      Storage upload warning (${filePath}):`, error.message);
      return dataUrl;
    }

    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);
    return publicData.publicUrl;
  } catch (err) {
    console.warn(`      Storage upload error (${filePath}):`, err.message);
    return dataUrl;
  }
}

async function main() {
  const env = await loadEnv();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  // 환경변수에서 service role key 읽기
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("❌ VITE_SUPABASE_URL이 설정되지 않았습니다.");
    process.exit(1);
  }

  // 관리자 권한 클라이언트 (RLS 우회 및 즉시 계정 활성화)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const email = process.argv[2] || process.env.MIGRATION_USER_EMAIL;
  let password = process.argv[3] || process.env.MIGRATION_USER_PASSWORD;

  if (!email || !password) {
    console.error("❌ 이메일과 비밀번호를 인자 또는 환경변수로 입력해주세요.");
    console.error("   사용법: node scripts/create-user-and-migrate.js <email> <password>");
    process.exit(1);
  }
  if (password.length < 6) password = password.padEnd(6, "0");

  console.log("==================================================");
  console.log("🏃 계정 생성 및 데이터 이관 (Admin Migration)");
  console.log("==================================================");
  console.log(`• 계정 이메일: ${email}`);
  console.log(`• 비밀번호: [보안 숨김 처리]\n`);

  console.log("[1/4] Supabase 유저 계정 확인 및 생성 중...");
  let user = null;

  // 관리자 API로 유저 목록 검색
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = (listData?.users || []).find((u) => u.email === email);

  if (existingUser) {
    user = existingUser;
    console.log(`      ✅ 기존 유저 확인됨: ${user.id}`);
    // 비밀번호 업데이트
    await supabaseAdmin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  } else {
    // 관리자 권한으로 이메일 즉시 인증 완료된 유저 생성
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname: email.split("@")[0] }
    });

    if (createError) {
      console.error("❌ 유저 생성 실패:", createError.message);
      process.exit(1);
    }
    user = newUserData.user;
    console.log(`      ✅ 신규 유저 생성 및 활성화 완료: ${user.id}`);
  }

  // profiles 테이블 확인 및 삽입
  await supabaseAdmin.from("profiles").upsert({
    id: user.id,
    email: user.email,
    nickname: email.split("@")[0],
    updated_at: new Date().toISOString()
  });

  console.log(`\n[2/4] 'user-data/my-marathons.json' 백업 데이터 읽는 중...`);
  const raw = await fs.readFile(path.resolve("user-data/my-marathons.json"), "utf-8");
  const backup = JSON.parse(raw);
  const entries = backup.entries || [];
  const shoes = backup.shoes || [];
  console.log(`      총 ${entries.length}개의 마라톤 대회와 ${shoes.length}개의 러닝화 데이터 발견.\n`);

  console.log(`[3/4] 마라톤 대회 기록 및 사진 이관 중...`);
  let raceSuccess = 0;
  for (const entry of entries) {
    let certUrl = entry.certificateDataUrl || "";
    if (certUrl.startsWith("data:")) {
      console.log(`      완주증 이미지 업로드 중: ${entry.name}`);
      const ext = certUrl.includes("image/png") ? "png" : "jpg";
      const filePath = `${user.id}/${entry.entryId}_cert_${Date.now()}.${ext}`;
      certUrl = await uploadDataUrl(supabaseAdmin, "certificates", filePath, certUrl);
    }

    const payload = {
      id: entry.entryId,
      user_id: user.id,
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

    const { error: rErr } = await supabaseAdmin.from("user_races").upsert(payload, { onConflict: "id" });
    if (rErr) {
      console.error(`      ❌ 저장 실패 (${entry.name}):`, rErr.message);
    } else {
      raceSuccess++;
    }

    // 갤러리 사진 업로드
    if (Array.isArray(entry.racePhotoDataUrls)) {
      for (let i = 0; i < entry.racePhotoDataUrls.length; i++) {
        let photoUrl = entry.racePhotoDataUrls[i];
        if (photoUrl.startsWith("data:")) {
          const ext = photoUrl.includes("image/png") ? "png" : "jpg";
          const filePath = `${user.id}/${entry.entryId}_photo_${i}_${Date.now()}.${ext}`;
          photoUrl = await uploadDataUrl(supabaseAdmin, "race-photos", filePath, photoUrl);
        }
        await supabaseAdmin.from("race_photos").upsert({
          user_id: user.id,
          user_race_id: entry.entryId,
          photo_url: photoUrl,
          display_order: i
        });
      }
    }
  }
  console.log(`      ✅ 대회 기록 이관 완료: ${raceSuccess}/${entries.length} 건\n`);

  console.log(`[4/4] 러닝화 데이터 이관 중...`);
  let shoeSuccess = 0;
  for (const shoe of shoes) {
    const { error: sErr } = await supabaseAdmin.from("shoes").upsert({
      id: shoe.shoeId,
      user_id: user.id,
      name: shoe.name,
      price: Number.parseInt(String(shoe.price).replace(/[^\d]/g, ""), 10) || 0,
      purchase_date: shoe.purchaseDate || null,
      distance_km: Number.parseFloat(shoe.distanceKm) || 0,
      memo: shoe.memo || "",
      updated_at: new Date().toISOString()
    });
    if (sErr) {
      console.error(`      ❌ 러닝화 저장 실패 (${shoe.name}):`, sErr.message);
    } else {
      shoeSuccess++;
    }
  }
  console.log(`      ✅ 러닝화 이관 완료: ${shoeSuccess}/${shoes.length} 켤레\n`);

  console.log("==================================================");
  console.log("🎉 모든 데이터가 Supabase DB & Storage로 성공적으로 이관되었습니다!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
