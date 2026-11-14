import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getLocalMonthStr, isValidMonthStr } from '@/lib/date';

// 월별 목표 예산 조회
export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month') || getLocalMonthStr();
    if (!isValidMonthStr(monthParam)) {
      return NextResponse.json({ success: false, error: '올바른 월 형식(YYYY-MM)이 아닙니다.' }, { status: 400 });
    }

    const row = db.prepare('SELECT month, amount FROM budgets WHERE month = ?').get(monthParam) as
      | { month: string; amount: number }
      | undefined;

    return NextResponse.json({
      success: true,
      data: { month: monthParam, amount: row ? row.amount : 0 },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 월별 목표 예산 설정 및 수정
export async function PUT(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const body = await request.json().catch(() => ({}));
    const month = typeof body.month === 'string' && body.month ? body.month : getLocalMonthStr();
    const rawAmount = Number(body.amount);

    if (!isValidMonthStr(month)) {
      return NextResponse.json({ success: false, error: '올바른 월 형식(YYYY-MM)이 아닙니다.' }, { status: 400 });
    }
    if (!Number.isFinite(rawAmount) || rawAmount < 0) {
      return NextResponse.json({ success: false, error: '예산 금액은 0 이상이어야 합니다.' }, { status: 400 });
    }

    const normalizedAmount = Math.round(rawAmount * 100) / 100;
    db.prepare(
      'INSERT INTO budgets (month, amount) VALUES (?, ?) ON CONFLICT(month) DO UPDATE SET amount = excluded.amount'
    ).run(month, normalizedAmount);

    return NextResponse.json({
      success: true,
      message: '목표 예산이 저장되었습니다.',
      data: { month, amount: normalizedAmount },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
