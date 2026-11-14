import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// 가족 구성원 목록 조회 (각 구성원의 총 거래 건수 포함)
export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  try {
    const db = getDb();
    const users = db
      .prepare(
        `SELECT u.id, u.name, u.color, u.created_at,
                COUNT(t.id) AS tx_count
         FROM users u
         LEFT JOIN transactions t ON t.user_name = u.name
         GROUP BY u.id
         ORDER BY u.id ASC`
      )
      .all();
    return NextResponse.json({ success: true, data: users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 새 가족 구성원 추가
export async function POST(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  try {
    const db = getDb();
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const color = typeof body.color === 'string' && body.color ? body.color : '#3b82f6';

    if (!name) {
      return NextResponse.json({ success: false, error: '구성원 이름을 입력하세요.' }, { status: 400 });
    }

    const exists = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
    if (exists) {
      return NextResponse.json({ success: false, error: '이미 등록된 구성원 이름입니다.' }, { status: 409 });
    }

    const result = db.prepare('INSERT INTO users (name, color) VALUES (?, ?)').run(name, color);
    const created = db.prepare('SELECT id, name, color, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({ success: true, message: '추가되었습니다.', data: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 가족 구성원 이름/색상 수정 (이름 변경 시 기존 거래 내역의 작성자도 함께 갱신)
export async function PUT(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  try {
    const db = getDb();
    const body = await request.json();
    const id = Number(body.id);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const color = typeof body.color === 'string' && body.color ? body.color : '#3b82f6';

    if (!id || !name) {
      return NextResponse.json({ success: false, error: '구성원 ID와 이름이 필요합니다.' }, { status: 400 });
    }

    const current = db.prepare('SELECT id, name FROM users WHERE id = ?').get(id) as
      | { id: number; name: string }
      | undefined;
    if (!current) {
      return NextResponse.json({ success: false, error: '구성원을 찾을 수 없습니다.' }, { status: 404 });
    }

    const duplicate = db.prepare('SELECT id FROM users WHERE name = ? AND id != ?').get(name, id);
    if (duplicate) {
      return NextResponse.json({ success: false, error: '이미 사용 중인 구성원 이름입니다.' }, { status: 409 });
    }

    db.exec('BEGIN');
    try {
      db.prepare('UPDATE users SET name = ?, color = ? WHERE id = ?').run(name, color, id);
      if (current.name !== name) {
        db.prepare('UPDATE transactions SET user_name = ? WHERE user_name = ?').run(name, current.name);
        db.prepare('UPDATE recurring_templates SET user_name = ? WHERE user_name = ?').run(name, current.name);
      }
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }

    return NextResponse.json({ success: true, message: '수정되었습니다.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 가족 구성원 삭제
export async function DELETE(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 구성원 ID가 없습니다.' }, { status: 400 });
    }

    const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (info.changes === 0) {
      return NextResponse.json({ success: false, error: '구성원을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '삭제되었습니다.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
