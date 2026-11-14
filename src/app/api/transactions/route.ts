import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { isValidDateStr, isValidMonthStr } from '@/lib/date';

// 거래 내역 목록 조회 (월/전체기간/날짜범위, 구성원, 구분, 결제수단, 검색어 필터 지원)
export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const allMonths = searchParams.get('allMonths') === '1';
    const month = searchParams.get('month');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const user = searchParams.get('user');
    const type = searchParams.get('type');
    const paymentMethod = searchParams.get('paymentMethod');
    const q = (searchParams.get('q') || '').trim();

    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: string[] = [];

    if (!allMonths) {
      if (month) {
        if (!isValidMonthStr(month)) {
          return NextResponse.json({ success: false, error: '올바른 월 형식(YYYY-MM)이 아닙니다.' }, { status: 400 });
        }
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
    }

    if (user && user !== 'all') {
      query += ' AND user_name = ?';
      params.push(user);
    }
    if (type === 'income' || type === 'expense') {
      query += ' AND type = ?';
      params.push(type);
    }
    if (paymentMethod && paymentMethod !== 'all') {
      query += ' AND payment_method = ?';
      params.push(paymentMethod);
    }
    if (q) {
      const like = `%${q}%`;
      query += ' AND (category LIKE ? OR memo LIKE ? OR user_name LIKE ? OR payment_method LIKE ?)';
      params.push(like, like, like, like);
    }

    query += ' ORDER BY date DESC, id DESC';

    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 센트 단위(소수점 2자리)까지 반올림 정규화
function normalizeAudAmount(raw: unknown): number {
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100) / 100;
}

function validateTxBody(body: Record<string, unknown>) {
  const type = body.type === 'income' ? 'income' : body.type === 'expense' ? 'expense' : '';
  const normalizedAmount = normalizeAudAmount(body.amount);
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const userName = typeof body.user_name === 'string' ? body.user_name.trim() : '';
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const memo = typeof body.memo === 'string' ? body.memo.trim() : '';
  const paymentMethod =
    typeof body.payment_method === 'string' && body.payment_method.trim()
      ? body.payment_method.trim()
      : '카드';

  if (!type || normalizedAmount <= 0 || !category || !userName || !isValidDateStr(date)) {
    return null;
  }

  return { type, normalizedAmount, category, userName, date, memo, paymentMethod };
}

// 새 거래 내역 등록
export async function POST(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = validateTxBody(body);

    if (!parsed) {
      return NextResponse.json(
        { success: false, error: '구분, 금액, 카테고리, 작성자 또는 날짜(YYYY-MM-DD)가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    db.prepare(`
      INSERT INTO transactions (type, amount, category, user_name, date, memo, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      parsed.type,
      parsed.normalizedAmount,
      parsed.category,
      parsed.userName,
      parsed.date,
      parsed.memo,
      parsed.paymentMethod
    );

    return NextResponse.json({ success: true, message: '저장되었습니다.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 기존 거래 내역 수정
export async function PUT(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = Number(body.id);
    const parsed = validateTxBody(body);

    if (!id || !parsed) {
      return NextResponse.json(
        { success: false, error: '수정할 항목의 ID 또는 필수 값이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const info = db
      .prepare(`
        UPDATE transactions
        SET type = ?, amount = ?, category = ?, user_name = ?, date = ?, memo = ?, payment_method = ?
        WHERE id = ?
      `)
      .run(
        parsed.type,
        parsed.normalizedAmount,
        parsed.category,
        parsed.userName,
        parsed.date,
        parsed.memo,
        parsed.paymentMethod,
        id
      );

    if (info.changes === 0) {
      return NextResponse.json({ success: false, error: '해당 내역을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '수정되었습니다.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 거래 내역 삭제
export async function DELETE(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 ID가 없습니다.' }, { status: 400 });
    }

    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: '삭제되었습니다.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
