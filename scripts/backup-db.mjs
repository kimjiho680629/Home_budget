import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const BASE_DIR = process.cwd();
const DB_PATH = path.join(BASE_DIR, 'data', 'budget.db');
const BACKUP_DIR = path.join(BASE_DIR, 'data', 'backups');
const MAX_BACKUPS = 14;

if (!fs.existsSync(DB_PATH)) {
  console.log('백업할 budget.db 파일이 아직 없습니다.');
  process.exit(0);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const now = new Date();
const y = now.getFullYear();
const m = String(now.getMonth() + 1).padStart(2, '0');
const d = String(now.getDate()).padStart(2, '0');
const filename = `budget_${y}-${m}-${d}.db`;
const targetPath = path.join(BACKUP_DIR, filename);

if (fs.existsSync(targetPath)) {
  fs.unlinkSync(targetPath);
}

const db = new DatabaseSync(DB_PATH);
const escaped = targetPath.replace(/'/g, "''");
db.exec(`VACUUM INTO '${escaped}';`);
db.close();

// 최신 MAX_BACKUPS개만 유지
const files = fs
  .readdirSync(BACKUP_DIR)
  .filter((f) => /^budget_\d{4}-\d{2}-\d{2}\.db$/.test(f))
  .sort()
  .reverse();

for (const oldFile of files.slice(MAX_BACKUPS)) {
  fs.unlinkSync(path.join(BACKUP_DIR, oldFile));
}

console.log(`✓ 가계부 DB 백업 완료: ${targetPath}`);
