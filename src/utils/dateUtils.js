/**
 * RACEBOOK 한국 표준시(KST, UTC+9) 일시 유틸리티 모듈
 * 모든 데이터 생성/수정/조회 시 시간대 왜곡(자정~아침 9시 사이 날짜 밀림)을 100% 방지합니다.
 */

/**
 * 1. 현재 또는 특정 Date 객체를 한국 표준시(+09:00) ISO 8601 문자열로 변환
 * 예: "2026-10-20T14:18:00.123+09:00"
 */
export function getKstIsoString(inputDate = new Date()) {
  const d = typeof inputDate === "string" || typeof inputDate === "number" ? new Date(inputDate) : inputDate;
  if (!d || Number.isNaN(d.getTime())) {
    return new Date().toISOString();
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const findPart = (t) => {
    const found = parts.find((p) => p.type === t);
    return found ? found.value : "";
  };

  const yyyy = findPart("year");
  const mm = findPart("month");
  const dd = findPart("day");
  let hh = findPart("hour");
  if (hh === "24") hh = "00";
  const min = findPart("minute");
  const ss = findPart("second");
  const ms = String(d.getMilliseconds()).padStart(3, "0");

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.${ms}+09:00`;
}

/**
 * 2. 한국 표준시 기준 오늘 날짜 (YYYY-MM-DD)
 * 자정부터 아침 9시 사이에도 어제 날짜로 밀리지 않고 정확한 한국 날짜 반환
 * 예: "2026-10-20"
 */
export function getTodayKstDate(inputDate = new Date()) {
  const d = typeof inputDate === "string" || typeof inputDate === "number" ? new Date(inputDate) : inputDate;
  if (!d || Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

/**
 * 3. 한국 표준시 기준 현재 년-월 (YYYY-MM)
 * 예: "2026-10"
 */
export function getCurrentKstMonth(inputDate = new Date()) {
  const dateStr = getTodayKstDate(inputDate);
  return dateStr.slice(0, 7);
}

/**
 * 4. UTC 또는 ISO 문자열을 한국어 친화적 날짜/시간 형식으로 포맷팅
 * 예: "2026년 10월 20일 14:18"
 */
export function formatKstDateTime(dateStr, includeTime = true) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);

  const options = {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric"
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat("ko-KR", options).format(d);
}
