import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const BASE_DIR = process.cwd();
const DB_PATH = path.join(BASE_DIR, 'data', 'budget.db');
const BACKUP_DIR = path.join(BASE_DIR, 'data', 'backups');
const ENV_LOCAL_PATH = path.join(BASE_DIR, '.env.local');
const MAX_BACKUPS = 14;

function loadEnvLocal() {
  if (!fs.existsSync(ENV_LOCAL_PATH)) return {};
  const result = {};
  const lines = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function getLocalDateStr(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pruneOldBackups(dirPath, keepCount) {
  const files = fs
    .readdirSync(dirPath)
    .filter((f) => /^budget_\d{4}-\d{2}-\d{2}\.db$/.test(f))
    .sort()
    .reverse();

  for (const oldFile of files.slice(keepCount)) {
    fs.unlinkSync(path.join(dirPath, oldFile));
  }
}

function verifySqliteBackup(filePath) {
  const checkDb = new DatabaseSync(filePath, { readOnly: true });
  try {
    const row = checkDb.prepare('PRAGMA integrity_check').get();
    if (!row || row.integrity_check !== 'ok') {
      throw new Error(`백업 무결성 검사 실패: ${JSON.stringify(row)}`);
    }
  } finally {
    checkDb.close();
  }
}

if (!fs.existsSync(DB_PATH)) {
  console.log('백업할 budget.db 파일이 아직 없습니다.');
  process.exit(0);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const dateStr = getLocalDateStr();
const filename = `budget_${dateStr}.db`;
const targetPath = path.join(BACKUP_DIR, filename);
const tempPath = path.join(BACKUP_DIR, `.${filename}.tmp_${process.pid}`);

if (fs.existsSync(tempPath)) {
  fs.unlinkSync(tempPath);
}

const db = new DatabaseSync(DB_PATH);
try {
  db.exec('PRAGMA busy_timeout = 5000;');
  const escaped = tempPath.replace(/'/g, "''");
  db.exec(`VACUUM INTO '${escaped}';`);
} finally {
  db.close();
}

verifySqliteBackup(tempPath);
if (fs.existsSync(targetPath)) {
  fs.unlinkSync(targetPath);
}
fs.renameSync(tempPath, targetPath);
pruneOldBackups(BACKUP_DIR, MAX_BACKUPS);

console.log(`✓ 가계부 DB 백업 및 무결성 검증 완료: ${targetPath}`);

// 오프사이트 클라우드 사본 동기화 (iCloud Drive 또는 .env.local의 BACKUP_MIRROR_DIR)
const envVars = loadEnvLocal();
const mirrorDirs = new Set();

const configuredMirror = (process.env.BACKUP_MIRROR_DIR || envVars.BACKUP_MIRROR_DIR || '').trim();
if (configuredMirror) {
  mirrorDirs.add(configuredMirror);
}

const icloudRoot = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
if (fs.existsSync(icloudRoot)) {
  mirrorDirs.add(path.join(icloudRoot, 'Home_Budget_Backups'));
}

for (const mirrorDir of mirrorDirs) {
  try {
    if (!fs.existsSync(mirrorDir)) {
      fs.mkdirSync(mirrorDir, { recursive: true });
    }
    const mirrorTarget = path.join(mirrorDir, filename);
    fs.copyFileSync(targetPath, mirrorTarget);
    pruneOldBackups(mirrorDir, MAX_BACKUPS);
    console.log(`✓ 클라우드 사본 저장 완료: ${mirrorTarget}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`⚠ 클라우드 사본 저장 건너뜀 (${mirrorDir}): ${msg}`);
  }
}
