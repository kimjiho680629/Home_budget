import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getLocalDateStr } from '@/lib/date';

export const dynamic = 'force-dynamic';

function getLatestBackupInfo(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) return { count: 0, latestFile: '' };
    const files = fs
      .readdirSync(dirPath)
      .filter((f) => /^budget_\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .sort()
      .reverse();
    return { count: files.length, latestFile: files[0] || '' };
  } catch {
    return { count: 0, latestFile: '' };
  }
}

// SQLite DB 상태 조회(?info=1) 또는 WAL-안전 스냅샷 백업 파일 다운로드 (VACUUM INTO)
export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  if (searchParams.get('info') === '1') {
    try {
      const db = getDb();
      const integrity = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string } | undefined;
      const userVer = db.prepare('PRAGMA user_version').get() as { user_version: number } | undefined;
      const txCount = (db.prepare('SELECT COUNT(*) AS cnt FROM transactions').get() as { cnt: number }).cnt;
      const localBackup = getLatestBackupInfo(path.join(process.cwd(), 'data', 'backups'));
      const icloudBackup = getLatestBackupInfo(
        path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Home_Budget_Backups')
      );

      return NextResponse.json({
        success: true,
        data: {
          healthy: integrity?.integrity_check === 'ok',
          schemaVersion: userVer?.user_version ?? 0,
          txCount,
          localBackupCount: localBackup.count,
          latestLocalBackup: localBackup.latestFile,
          icloudBackupCount: icloudBackup.count,
          latestIcloudBackup: icloudBackup.latestFile,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

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
