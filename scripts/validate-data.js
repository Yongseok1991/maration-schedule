import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const RaceSchema = z.object({
  id: z.string().min(1, "대회 ID는 필수입니다"),
  name: z.string().min(1, "대회명은 필수입니다"),
  date_iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD 이어야 합니다"),
  date_display: z.string().optional(),
  place: z.string().optional(),
  distances: z.string().optional(),
  homepage: z.string().optional(),
  status: z.string().optional(),
  reg_period: z.string().optional(),
  organizer: z.string().optional()
});

const RacesDataSchema = z.object({
  updatedAt: z.string().nullable().optional(),
  races: z.array(RaceSchema).min(5, "수집된 대회 수가 너무 적습니다 (최소 5건 이상)")
});

async function main() {
  const filePath = path.resolve("public/data/races.json");
  console.log(`[Harness] Validating marathon race data: ${filePath}`);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(raw);

    const result = RacesDataSchema.safeParse(json);
    if (!result.success) {
      console.error("❌ Data Schema Validation Failed!");
      console.error(JSON.stringify(result.error.format(), null, 2));
      process.exit(1);
    }

    console.log(`✅ Data Schema Validation Passed! Total ${result.data.races.length} races verified.`);
  } catch (err) {
    console.error("❌ Failed to read or parse races.json:", err.message);
    process.exit(1);
  }
}

main();
