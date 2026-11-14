import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getLocalDateStr, isValidDateStr, isValidMonthStr } from '@/lib/date';
import type { Transaction } from '@/types/budget';

function escapeCsvCell(raw: string | number | null | undefined): string {
  const str = String(raw ?? '');
  // Excel 수식 인젝션 방지: 문자열 셀이 =, +, -, @ 로 시작할 경우 앞에 작은따옴표 추가
  const safe = typeof raw === 'string' && /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

// 거래 내역 CSV 내보내기 (월별 / 기간별 / 호주 회계연도 정산용)
export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const user = searchParams.get('user');
    const type = searchParams.get('type');

    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: string[] = [];

    if (month && isValidMonthStr(month)) {
      query += " AND strftime('%Y-%m', date) = ?";
      params.push(month);
    } else {
      if (startDate && isValidDateStr(startDate)) {
        query += ' AND date >= ?';
        params.push(startDate);
      }
      if (endDate && isValidDateStr(endDate)) {
        query += ' AND date <= ?';
        params.push(endDate);
      }
    }

    if (user && user !== 'all') {
      query += ' AND user_name = ?';
      params.push(user);
    }
    if (type === 'income' || type === 'expense') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY date ASC, id ASC';

    const rows = db.prepare(query).all(...params) as unknown as Transaction[];
    const header = ['날짜', '구분', '카테고리', '금액(AUD)', '부호포함금액', '작성자', '결제수단', '내용/메모'];
    const lines = [header.map(escapeCsvCell).join(',')];

    for (const row of rows) {
      const signed = row.type === 'expense' ? -Math.abs(row.amount) : Math.abs(row.amount);
      lines.push(
        [
          row.date,
          row.type === 'income' ? '수입' : '지출',
          row.category,
          row.amount.toFixed(2),
          signed.toFixed(2),
          row.user_name,
          row.payment_method,
          row.memo || '',
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }

    // Excel에서 한글이 깨지지 않도록 UTF-8 BOM 포함
    const csvContent = `\uFEFF${lines.join('\r\n')}`;
    const label = month || (startDate && endDate ? `${startDate}_to_${endDate}` : getLocalDateStr());
    const filename = `home_budget_${label}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
