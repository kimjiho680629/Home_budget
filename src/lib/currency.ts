// 호주 달러(AUD) 금액 포맷팅 유틸리티

export function formatAUD(amount: number): string {
  const num = Number(amount) || 0;
  const absFormatted = Math.abs(num).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return num < 0 ? `-A$${absFormatted}` : `A$${absFormatted}`;
}

export function formatSignedAUD(amount: number, type: 'expense' | 'income'): string {
  const absFormatted = Math.abs(Number(amount) || 0).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${type === 'expense' ? '-' : '+'}A$${absFormatted}`;
}
