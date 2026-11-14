import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getLocalDateStr, getLocalMonthStr, isValidDateStr, isValidMonthStr } from '@/lib/date';
import type { RecurringTemplate } from '@/types/budget';

function buildDateForMonth(month: string, dayOfMonth: number): string {
  const [year, mon] = month.split('-').map(Number);
  const maxDays = new Date(year, mon, 0).getDate();
  const safeDay = Math.min(Math.max(1, dayOfMonth), maxDays);
  return `${month}-${String(safeDay).padStart(2, '0')}`;
}

// 고정 지출 · 정기 수입 반복 템플릿 목록 조회
export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM recurring_templates ORDER BY type ASC, day_of_month ASC, id ASC')
      .all();
    return NextResponse.json({ success: true, data: rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 템플릿 생성 또는 가계부에 즉시 반영(apply)
export async function POST(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'create';

    if (action === 'apply') {
      const targetMonth =
        typeof body.month === 'string' && body.month ? body.month : getLocalMonthStr();
      if (!isValidMonthStr(targetMonth)) {
        return NextResponse.json({ success: false, error: '올바른 월 형식(YYYY-MM)이 아닙니다.' }, { status: 400 });
      }
      const overrideDate = isValidDateStr(body.date) ? body.date : '';
      const applyAll = Boolean(body.applyAll);
      const id = Number(body.id);

      let templates: RecurringTemplate[] = [];
      if (applyAll) {
        templates = db
          .prepare('SELECT * FROM recurring_templates ORDER BY id ASC')
          .all() as unknown as RecurringTemplate[];
      } else if (id > 0) {
        const one = db
          .prepare('SELECT * FROM recurring_templates WHERE id = ?')
          .get(id) as unknown as RecurringTemplate | undefined;
        if (one) templates = [one];
      }

      if (templates.length === 0) {
        return NextResponse.json(
          { success: false, error: '반영할 정기 템플릿이 없습니다.' },
          { status: 404 }
        );
      }

      const insertTx = db.prepare(`
        INSERT INTO transactions (type, amount, category, user_name, date, memo, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      db.exec('BEGIN');
      try {
        for (const tpl of templates) {
          const txDate = overrideDate || (tpl.day_of_month ? buildDateForMonth(targetMonth, tpl.day_of_month) : getLocalDateStr());
          const memoText = tpl.memo || tpl.title;
          insertTx.run(
            tpl.type,
            tpl.amount,
            tpl.category,
            tpl.user_name,
            txDate,
            memoText,
            tpl.payment_method || '카드'
          );
        }
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      return NextResponse.json({
        success: true,
        message: `${templates.length}건의 정기 내역을 가계부에 등록했습니다.`,
        count: templates.length,
      });
    }

    // 새 템플릿 저장
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const type = body.type === 'income' ? 'income' : body.type === 'expense' ? 'expense' : '';
    const rawAmount = Number(body.amount);
    const amount = Number.isFinite(rawAmount) ? Math.round(rawAmount * 100) / 100 : 0;
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const userName = typeof body.user_name === 'string' ? body.user_name.trim() : '';
    const paymentMethod =
      typeof body.payment_method === 'string' && body.payment_method.trim()
        ? body.payment_method.trim()
        : '카드';
    const memo = typeof body.memo === 'string' ? body.memo.trim() : '';
    const dayRaw = Number(body.day_of_month);
    const dayOfMonth = Number.isInteger(dayRaw) ? Math.min(Math.max(dayRaw, 1), 31) : 1;

    if (!title || !type || amount <= 0 || !category || !userName) {
      return NextResponse.json(
        { success: false, error: '템플릿 이름, 구분, 금액, 카테고리, 작성자를 모두 입력하세요.' },
        { status: 400 }
      );
    }

    const result = db
      .prepare(
        `INSERT INTO recurring_templates (title, type, amount, category, user_name, payment_method, memo, day_of_month)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(title, type, amount, category, userName, paymentMethod, memo, dayOfMonth);

    const created = db
      .prepare('SELECT * FROM recurring_templates WHERE id = ?')
      .get(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      message: '정기 템플릿이 저장되었습니다.',
      data: created,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 템플릿 삭제
export async function DELETE(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 템플릿 ID가 없습니다.' }, { status: 400 });
    }

    const info = db.prepare('DELETE FROM recurring_templates WHERE id = ?').run(id);
    if (info.changes === 0) {
      return NextResponse.json({ success: false, error: '템플릿을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '정기 템플릿이 삭제되었습니다.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
