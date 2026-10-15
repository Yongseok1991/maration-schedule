// 마라톤 대회 접수기간 날짜 파싱 유틸리티

/**
 * 접수기간 문자열에서 접수 시작일(YYYY-MM-DD)을 추출합니다.
 * 예: "2026년10월12일~2026년12월30일" -> "2026-10-12"
 */
export function parseRegistrationStartDate(regPeriodText) {
  if (!regPeriodText || typeof regPeriodText !== "string") return null;

  const text = regPeriodText.trim();
  const match = text.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일?/);
  if (!match) return null;

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * 접수기간 문자열에서 접수 마감일(YYYY-MM-DD)을 추출합니다.
 * 예: "2026년10월12일~2026년12월30일" -> "2026-12-30"
 */
export function parseRegistrationEndDate(regPeriodText) {
  if (!regPeriodText || typeof regPeriodText !== "string") return null;

  const text = regPeriodText.trim();
  const match = text.match(/~\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일?/);
  if (!match) return null;

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");

  return `${year}-${month}-${day}`;
}
