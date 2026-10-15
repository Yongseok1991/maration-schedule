import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

console.log("=================================================");
console.log("🏃 Maraton Engineering Harness: System Health Check");
console.log("=================================================\n");

let allPass = true;

// 1. 환경 변수 확인
console.log("1. Environment Variables Check:");
const envLocalPath = path.resolve(".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  const hasUrl = /VITE_SUPABASE_URL\s*=\s*https?:\/\/.+/.test(content);
  const hasKey = /VITE_SUPABASE_ANON_KEY\s*=\s*.+/.test(content);
  if (hasUrl && hasKey) {
    console.log("   ✅ .env.local found and Supabase variables configured.");
  } else {
    console.log("   ⚠️ .env.local found, but VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is empty.");
    console.log("      (Guest mode will be active until Supabase URL is supplied)");
  }
} else {
  console.log("   ⚠️ .env.local not found. (Copy .env.example to .env.local)");
}

// 2. 소스 파일 & 훅 모듈 무결성 점검
console.log("\n2. Architecture & Custom Hooks Check:");
const requiredModules = [
  "src/hooks/useAuth.js",
  "src/hooks/useRaces.js",
  "src/hooks/useEntries.js",
  "src/hooks/useShoes.js",
  "src/hooks/useStats.js",
  "src/services/supabase.js",
  "src/services/authService.js",
  "src/services/storageService.js",
  "src/services/dataService.js",
  "src/utils/imageOptimizer.js",
  "src/components/auth/AuthModal.jsx"
];

let missingModules = 0;
for (const mod of requiredModules) {
  if (fs.existsSync(path.resolve(mod))) {
    console.log(`   ✅ ${mod}`);
  } else {
    console.log(`   ❌ MISSING: ${mod}`);
    missingModules++;
    allPass = false;
  }
}

// 3. 마라톤 데이터 JSON 무결성 검증
console.log("\n3. Marathon Race Data Integrity Check (Zod):");
const raceDataPath = path.resolve("public/data/races.json");
if (fs.existsSync(raceDataPath)) {
  try {
    const raw = fs.readFileSync(raceDataPath, "utf-8");
    const json = JSON.parse(raw);
    const RaceSchema = z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      date_iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    });
    const DataSchema = z.object({
      races: z.array(RaceSchema).min(5)
    });
    const parsed = DataSchema.safeParse(json);
    if (parsed.success) {
      console.log(`   ✅ races.json is valid! Total ${parsed.data.races.length} races verified.`);
    } else {
      console.log("   ❌ races.json schema validation failed!");
      allPass = false;
    }
  } catch (err) {
    console.log(`   ❌ Failed to parse races.json: ${err.message}`);
    allPass = false;
  }
} else {
  console.log("   ❌ public/data/races.json not found!");
  allPass = false;
}

// 4. CI/CD 워크플로우 점검
console.log("\n4. GitHub Actions CI/CD Workflows Check:");
const workflows = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-pages.yml",
  ".github/workflows/scrape-data.yml"
];
for (const wf of workflows) {
  if (fs.existsSync(path.resolve(wf))) {
    console.log(`   ✅ ${wf}`);
  } else {
    console.log(`   ❌ MISSING: ${wf}`);
    allPass = false;
  }
}

console.log("\n=================================================");
if (allPass) {
  console.log("🎉 All core engineering harness checks PASSED!");
} else {
  console.log("⚠️ Some checks require attention.");
}
console.log("=================================================");
