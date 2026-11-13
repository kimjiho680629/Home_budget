import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// 거래 내역 목록 조회 (월, 구성원 필터 지원)
export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const user = searchParams.get('user');

    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: string[] = [];

    if (month) {
      query += " AND strftime('%Y-%m', date) = ?";
      params.push(month);
    }
    if (user && user !== 'all') {
      query += ' AND user_name = ?';
      params.push(user);
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

// 새 거래 내역 등록
export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { type, amount, category, user_name, date, memo, payment_method } = body;
    const normalizedAmount = normalizeAudAmount(amount);

    if (!type || normalizedAmount <= 0 || !category || !user_name || !date) {
      return NextResponse.json({ success: false, error: '필수 입력 항목이 누락되었거나 금액이 올바르지 않습니다.' }, { status: 400 });
    }

    db.prepare(`
      INSERT INTO transactions (type, amount, category, user_name, date, memo, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type, normalizedAmount, category, user_name, date, memo || '', payment_method || '카드');

    return NextResponse.json({ success: true, message: '저장되었습니다.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 기존 거래 내역 수정
export async function PUT(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const id = Number(body.id);
    const { type, amount, category, user_name, date, memo, payment_method } = body;
    const normalizedAmount = normalizeAudAmount(amount);

    if (!id || !type || normalizedAmount <= 0 || !category || !user_name || !date) {
      return NextResponse.json({ success: false, error: '수정할 항목의 필수 값이 올바르지 않습니다.' }, { status: 400 });
    }

    const info = db
      .prepare(`
        UPDATE transactions
        SET type = ?, amount = ?, category = ?, user_name = ?, date = ?, memo = ?, payment_method = ?
        WHERE id = ?
      `)
      .run(type, normalizedAmount, category, user_name, date, memo || '', payment_method || '카드', id);

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
