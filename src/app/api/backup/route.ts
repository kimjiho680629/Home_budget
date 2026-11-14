import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getLocalDateStr } from '@/lib/date';

export const dynamic = 'force-dynamic';

// SQLite WAL-안전 스냅샷 백업 파일 다운로드 (VACUUM INTO 사용)
export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  const tempPath = path.join(os.tmpdir(), `home_budget_backup_${crypto.randomBytes(6).toString('hex')}.db`);

  try {
    const db = getDb();
    const escapedPath = tempPath.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${escapedPath}';`);
    const fileBuffer = fs.readFileSync(tempPath);
    const filename = `home_budget_backup_${getLocalDateStr()}.db`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileBuffer.byteLength),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}
