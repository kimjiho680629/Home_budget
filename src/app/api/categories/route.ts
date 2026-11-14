import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// 카테고리 목록 조회 (유형 필터 및 거래 건수 포함)
export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = `
      SELECT c.id, c.name, c.type, c.icon, c.color,
             COUNT(t.id) AS tx_count
      FROM categories c
      LEFT JOIN transactions t ON t.category = c.name AND t.type = c.type
    `;
    const params: string[] = [];
    if (type === 'expense' || type === 'income') {
      query += ' WHERE c.type = ?';
      params.push(type);
    }
    query += ' GROUP BY c.id ORDER BY c.type ASC, c.id ASC';

    const categories = db.prepare(query).all(...params);
    return NextResponse.json({ success: true, data: categories });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 새 카테고리 추가
export async function POST(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  try {
    const db = getDb();
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const type = body.type === 'income' ? 'income' : body.type === 'expense' ? 'expense' : '';
    const icon = typeof body.icon === 'string' && body.icon ? body.icon : 'tag';
    const color = typeof body.color === 'string' && body.color ? body.color : '#64748b';

    if (!name || !type) {
      return NextResponse.json({ success: false, error: '카테고리 이름과 구분(지출/수입)을 입력하세요.' }, { status: 400 });
    }

    const exists = db.prepare('SELECT id FROM categories WHERE name = ? AND type = ?').get(name, type);
    if (exists) {
      return NextResponse.json({ success: false, error: '같은 구분에 이미 존재하는 카테고리입니다.' }, { status: 409 });
    }

    const result = db
      .prepare('INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)')
      .run(name, type, icon, color);

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ success: true, message: '카테고리가 추가되었습니다.', data: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 카테고리 수정 (이름 변경 시 기존 거래 내역의 카테고리명도 함께 갱신)
export async function PUT(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  try {
    const db = getDb();
    const body = await request.json();
    const id = Number(body.id);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const icon = typeof body.icon === 'string' && body.icon ? body.icon : 'tag';
    const color = typeof body.color === 'string' && body.color ? body.color : '#64748b';

    if (!id || !name) {
      return NextResponse.json({ success: false, error: '카테고리 ID와 이름이 필요합니다.' }, { status: 400 });
    }

    const current = db.prepare('SELECT id, name, type FROM categories WHERE id = ?').get(id) as
      | { id: number; name: string; type: string }
      | undefined;
    if (!current) {
      return NextResponse.json({ success: false, error: '카테고리를 찾을 수 없습니다.' }, { status: 404 });
    }

    const duplicate = db
      .prepare('SELECT id FROM categories WHERE name = ? AND type = ? AND id != ?')
      .get(name, current.type, id);
    if (duplicate) {
      return NextResponse.json({ success: false, error: '같은 구분에 이미 존재하는 카테고리 이름입니다.' }, { status: 409 });
    }

    db.exec('BEGIN');
    try {
      db.prepare('UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?').run(name, icon, color, id);
      if (current.name !== name) {
        db.prepare('UPDATE transactions SET category = ? WHERE category = ? AND type = ?').run(
          name,
          current.name,
          current.type
        );
        db.prepare('UPDATE recurring_templates SET category = ? WHERE category = ? AND type = ?').run(
          name,
          current.name,
          current.type
        );
      }
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }

    return NextResponse.json({ success: true, message: '카테고리가 수정되었습니다.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 카테고리 삭제
export async function DELETE(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 카테고리 ID가 없습니다.' }, { status: 400 });
    }

    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    if (info.changes === 0) {
      return NextResponse.json({ success: false, error: '카테고리를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '카테고리가 삭제되었습니다.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
