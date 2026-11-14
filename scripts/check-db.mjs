import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const BASE_DIR = process.cwd();
const DATA_DIR = path.join(BASE_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'budget.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const ICLOUD_BACKUP_DIR = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'com~apple~CloudDocs',
  'Home_Budget_Backups'
);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileSize(filePath) {
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}

if (!fs.existsSync(DB_PATH)) {
  console.log('✗ data/budget.db 파일이 존재하지 않습니다.');
  process.exit(1);
}

console.log('==========================================');
console.log('🗄️  우리집 가계부 데이터베이스(SQLite) 점검');
console.log('==========================================');
console.log(`- 본체 파일 : ${DB_PATH} (${formatBytes(getFileSize(DB_PATH))})`);
console.log(`- WAL 로그  : ${formatBytes(getFileSize(`${DB_PATH}-wal`))}`);
console.log(`- SHM 인덱스: ${formatBytes(getFileSize(`${DB_PATH}-shm`))}`);

const db = new DatabaseSync(DB_PATH, { readOnly: true });
try {
  const integrity = db.prepare('PRAGMA integrity_check').get();
  const journal = db.prepare('PRAGMA journal_mode').get();
  const userVer = db.prepare('PRAGMA user_version').get();
  const indexes = db
    .prepare("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex_%' ORDER BY name")
    .all();

  console.log(`- 무결성 검사: ${integrity?.integrity_check === 'ok' ? '✓ 정상 (ok)' : `✗ 오류 (${JSON.stringify(integrity)})`}`);
  console.log(`- 저널 모드  : ${journal?.journal_mode}`);
  console.log(`- 스키마 버전: v${userVer?.user_version ?? 0}`);
  console.log(`- 커스텀 인덱스: ${indexes.length}개 (${indexes.map((i) => i.name).join(', ') || '없음'})`);

  console.log('\n[테이블 데이터 현황]');
  for (const tbl of ['users', 'categories', 'transactions', 'budgets', 'recurring_templates', 'app_meta']) {
    const cnt = db.prepare(`SELECT COUNT(*) AS cnt FROM ${tbl}`).get();
    console.log(`  • ${tbl.padEnd(20)}: ${cnt.cnt}건`);
  }
} finally {
  db.close();
}

const listBackups = (label, dir) => {
  console.log(`\n[${label}]`);
  if (!fs.existsSync(dir)) {
    console.log('  (폴더 없음)');
    return;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.db'))
    .sort()
    .reverse();
  if (files.length === 0) {
    console.log('  (백업 파일 없음)');
    return;
  }
  for (const f of files.slice(0, 5)) {
    const stat = fs.statSync(path.join(dir, f));
    console.log(`  • ${f} (${formatBytes(stat.size)})`);
  }
  if (files.length > 5) {
    console.log(`  ... 외 ${files.length - 5}개`);
  }
};

listBackups('로컬 백업 (data/backups)', BACKUP_DIR);
listBackups('iCloud 백업 (Home_Budget_Backups)', ICLOUD_BACKUP_DIR);
console.log('==========================================');
