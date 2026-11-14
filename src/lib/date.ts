// 로컬 타임존 기준 날짜 및 호주 회계연도(FY) 유틸리티

export function getLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalMonthStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function isValidDateStr(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function isValidMonthStr(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const [, m] = value.split('-').map(Number);
  return m >= 1 && m <= 12;
}

/**
 * 기준 월(YYYY-MM)을 포함해 과거 count개월 목록을 오름차순으로 반환한다.
 */
export function getRecentMonthKeys(endMonth: string, count = 6): string[] {
  const [yearStr, monthStr] = endMonth.split('-');
  const baseYear = Number(yearStr);
  const baseMonth = Number(monthStr) - 1;
  const result: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(baseYear, baseMonth - i, 1);
    result.push(getLocalMonthStr(dt));
  }
  return result;
}

/**
 * 호주 회계연도(7월 1일 ~ 다음해 6월 30일) 기간 계산
 */
export function getAustralianFyRange(referenceDate: Date = new Date()): {
  label: string;
  startDate: string;
  endDate: string;
} {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1; // 1~12
  const fyStartYear = month >= 7 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;
  return {
    label: `FY ${fyStartYear}-${String(fyEndYear).slice(2)} (${fyStartYear}.07~${fyEndYear}.06)`,
    startDate: `${fyStartYear}-07-01`,
    endDate: `${fyEndYear}-06-30`,
  };
}
