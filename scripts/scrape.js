import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import iconv from "iconv-lite";
import * as cheerio from "cheerio";

const LIST_URL = "http://www.roadrun.co.kr/schedule/list.php";
const BASE_URL = "http://www.roadrun.co.kr/schedule/";
const OUT_FILE = path.resolve("public/data/races.json");
const MAX_DETAILS = Number.parseInt(process.env.MAX_DETAILS || "0", 10);

const clean = (v = "") =>
  v
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const decodeEucKr = (responseData) => iconv.decode(Buffer.from(responseData), "euc-kr");

const parseIsoDate = (text) => {
  const m = text.match(/(20\d{2})\D{0,3}(\d{1,2})\D{0,3}(\d{1,2})/);
  if (!m) return null;
  const y = m[1];
  const mo = m[2].padStart(2, "0");
  const d = m[3].padStart(2, "0");
  return `${y}-${mo}-${d}`;
};

const parseDateFromMonthDay = (mmdd) => {
  const m = mmdd.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const year = new Date().getFullYear();
  const month = m[1].padStart(2, "0");
  const day = m[2].padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const splitNameAndDistance = (nameWithDistance) => {
  const s = clean(nameWithDistance);
  const tokenRegex =
    /(100miles|\d{1,3}(?:\.\d+)?\s?(?:km|k)|\ud480\ucf54\uc2a4|\ud558\ud504\ucf54\uc2a4|\ud480|\ud558\ud504|\ud2b8\ub808\uc77c|\uc6b8\ud2b8\ub77c|\uac77\uae30|\ub9b4\ub808\uc774|\ub9c8\ub2c8\uc544)/i;
  const match = tokenRegex.exec(s);
  if (!match || match.index <= 0) {
    return { name: s, distances: "" };
  }

  const idx = match.index;
  return {
    name: s.slice(0, idx).trim(),
    distances: s.slice(idx).trim()
  };
};

const parseStatusFromCell = ($, td) => {
  const srcs = $(td)
    .find("img")
    .toArray()
    .map((img) => ($(img).attr("src") || "").toLowerCase());

  if (srcs.some((s) => s.includes("goingon.gif"))) return "\uc811\uc218\uc911";
  if (srcs.some((s) => s.includes("new.gif"))) return "\uc2e0\uaddc";
  return "";
};

const parseListRows = (html) => {
  const $ = cheerio.load(html);
  const rows = [];

  $("tr").each((_, tr) => {
    const rowHtml = $.html(tr);
    const idMatch = rowHtml.match(/view\.php\?no=(\d+)/);
    if (!idMatch) return;

    const tds = $(tr).find("td").toArray();
    if (tds.length !== 4) return;

    const cells = tds.map((td) => clean($(td).text())).filter(Boolean);
    if (cells.length < 4) return;

    const dateDisplay = cells[0].replace(/\s+/g, "");
    if (!/^\d{1,2}\/\d{1,2}\([^)]+\)$/.test(dateDisplay)) return;

    const id = idMatch[1];
    const status = parseStatusFromCell($, tds[0]);
    const { name, distances } = splitNameAndDistance(cells[1]);
    const place = cells[2];

    const contact = (cells[3].match(/\d{2,4}-\d{3,4}-\d{4}/) || [""])[0];
    const organizer = clean(cells[3].replace(/[\u260e\u2121]?\s*\d{2,4}-\d{3,4}-\d{4}/, ""));

    rows.push({
      id,
      name,
      distances,
      place,
      organizer,
      contact,
      status,
      date_display: dateDisplay,
      date_iso_guess: parseDateFromMonthDay(dateDisplay),
      detail_url: `${BASE_URL}view.php?no=${id}`
    });
  });

  const dedup = new Map(rows.map((r) => [r.id, r]));
  return [...dedup.values()];
};

const parseDetail = (html) => {
  const $ = cheerio.load(html);

  const wanted = new Set([
    "\ub300\ud68c\uba85",
    "\ub300\ud68c\uc77c\uc2dc",
    "\ub300\ud68c\uc885\ubaa9",
    "\ub300\ud68c\uc9c0\uc5ed",
    "\ub300\ud68c\uc7a5\uc18c",
    "\uc8fc\ucd5c\ub2e8\uccb4",
    "\uc804\ud654\ubc88\ud638",
    "\uc811\uc218\uae30\uac04",
    "\ud648\ud398\uc774\uc9c0"
  ]);

  const normalizeLabel = (s) =>
    clean(s)
      .replace(/[:\uFF1A]/g, "")
      .replace(/\s+/g, "");

  const dict = {};
  $("tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 2) return;

    const key = normalizeLabel($(tds[0]).text());
    if (!wanted.has(key) || dict[key]) return;

    const value = clean($(tds[1]).text());
    if (!value) return;

    dict[key] = value;
  });

  const homepageHref = $('a[href^="http"]').first().attr("href") || "";

  return {
    name: dict["\ub300\ud68c\uba85"] || "",
    date_display: (dict["\ub300\ud68c\uc77c\uc2dc"] || "").split("\ucd9c\ubc1c\uc2dc\uac04")[0].trim(),
    date_iso: parseIsoDate(dict["\ub300\ud68c\uc77c\uc2dc"] || ""),
    distances: dict["\ub300\ud68c\uc885\ubaa9"] || "",
    region: dict["\ub300\ud68c\uc9c0\uc5ed"] || "",
    place: dict["\ub300\ud68c\uc7a5\uc18c"] || "",
    organizer: dict["\uc8fc\ucd5c\ub2e8\uccb4"] || "",
    contact: dict["\uc804\ud654\ubc88\ud638"] || "",
    registration_period: dict["\uc811\uc218\uae30\uac04"] || "",
    homepage: clean(homepageHref || dict["\ud648\ud398\uc774\uc9c0"] || "")
  };
};

const fetchEucKr = async (url) => {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MaratonBot/1.0)",
      Referer: LIST_URL
    }
  });
  return decodeEucKr(res.data);
};

const run = async () => {
  const listHtml = await fetchEucKr(LIST_URL);
  const allRows = parseListRows(listHtml);
  const listRows = Number.isFinite(MAX_DETAILS) && MAX_DETAILS > 0 ? allRows.slice(0, MAX_DETAILS) : allRows;

  const races = [];
  for (const row of listRows) {
    try {
      const detailHtml = await fetchEucKr(row.detail_url);
      const detail = parseDetail(detailHtml);
      races.push({
        id: row.id,
        name: detail.name || row.name,
        date_display: detail.date_display || row.date_display || "",
        date_iso: detail.date_iso || row.date_iso_guess || null,
        distances: detail.distances || row.distances,
        region: detail.region || "",
        place: detail.place || row.place,
        organizer: detail.organizer || row.organizer,
        contact: detail.contact || row.contact,
        registration_period: detail.registration_period || "",
        homepage: detail.homepage || "",
        status: row.status || "",
        detail_url: row.detail_url
      });
    } catch {
      races.push({
        id: row.id,
        name: row.name,
        date_display: row.date_display,
        date_iso: row.date_iso_guess,
        distances: row.distances,
        region: "",
        place: row.place,
        organizer: row.organizer,
        contact: row.contact,
        registration_period: "",
        homepage: "",
        status: row.status || "",
        detail_url: row.detail_url,
        error: "detail_fetch_failed"
      });
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: LIST_URL,
    count: races.length,
    races
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Saved ${races.length} races to ${OUT_FILE}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
