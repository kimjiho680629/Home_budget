import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
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
const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.kimjiho.home-budget-server.plist');

function printAvailableBackups() {
  const dirs = [
    ['로컬 백업', BACKUP_DIR],
    ['iCloud 백업', ICLOUD_BACKUP_DIR],
  ];
  console.log('사용 가능한 백업 파일 목록:');
  for (const [label, dir] of dirs) {
    console.log(`\n[${label}: ${dir}]`);
    if (!fs.existsSync(dir)) {
      console.log('  (폴더 없음)');
      continue;
    }
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.db'))
      .sort()
      .reverse();
    if (files.length === 0) {
      console.log('  (백업 파일 없음)');
      continue;
    }
    for (const f of files) {
      const full = path.join(dir, f);
      const kb = (fs.statSync(full).size / 1024).toFixed(1);
      console.log(`  - ${full} (${kb} KB)`);
    }
  }
  console.log('\n복구 실행 방법:');
  console.log('  node scripts/restore-db.mjs <백업파일경로> --yes');
}

function inspectBackupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`백업 파일을 찾을 수 없습니다: ${filePath}`);
  }
  const header = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (!header.toString('utf8').startsWith('SQLite format 3')) {
    throw new Error('올바른 SQLite 3 데이터베이스 파일이 아닙니다.');
  }

  const checkDb = new DatabaseSync(filePath, { readOnly: true });
  try {
    const integrity = checkDb.prepare('PRAGMA integrity_check').get();
    if (!integrity || integrity.integrity_check !== 'ok') {
      throw new Error(`백업 파일 무결성 검사 실패: ${JSON.stringify(integrity)}`);
    }
    const tables = checkDb
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => r.name);
    for (const required of ['users', 'categories', 'transactions', 'app_meta']) {
      if (!tables.includes(required)) {
        throw new Error(`필수 테이블('${required}')이 없는 백업 파일입니다.`);
      }
    }
    const txCnt = checkDb.prepare('SELECT COUNT(*) AS cnt FROM transactions').get().cnt;
    const userCnt = checkDb.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
    return { txCnt, userCnt };
  } finally {
    checkDb.close();
  }
}

function isServerAgentLoaded() {
  try {
    const out = execFileSync('launchctl', ['list'], { encoding: 'utf8' });
    return out.includes('com.kimjiho.home-budget-server');
  } catch {
    return false;
  }
}

function getDbLockHolders() {
  if (!fs.existsSync(DB_PATH)) return '';
  try {
    return execFileSync('lsof', [DB_PATH], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const args = process.argv.slice(2);
const yesFlag = args.includes('--yes');
const listFlag = args.includes('--list');
const targetArg = args.find((a) => !a.startsWith('-'));

if (listFlag || !targetArg) {
  printAvailableBackups();
  process.exit(0);
}

const sourcePath = path.resolve(BASE_DIR, targetArg);
const info = inspectBackupFile(sourcePath);

console.log('==========================================');
console.log('🔁 백업 파일 검증 결과');
console.log(`- 대상 파일 : ${sourcePath}`);
console.log(`- 무결성    : ✓ ok`);
console.log(`- 포함된 데이터: 구성원 ${info.userCnt}명, 거래 내역 ${info.txCnt}건`);
console.log('==========================================');

if (!yesFlag) {
  console.log('\n안전을 위해 미리보기만 수행했습니다.');
  console.log('실제로 복구하려면 아래처럼 --yes 옵션을 붙여 실행하세요:');
  console.log(`  node scripts/restore-db.mjs "${targetArg}" --yes`);
  process.exit(0);
}

let unloadedAgent = false;
if (process.platform === 'darwin' && fs.existsSync(PLIST_PATH) && isServerAgentLoaded()) {
  console.log('• 가계부 서버를 잠시 중지하는 중...');
  execFileSync('launchctl', ['unload', PLIST_PATH], { stdio: 'inherit' });
  unloadedAgent = true;
}

try {
  const holders = getDbLockHolders();
  if (holders) {
    throw new Error(`다른 프로세스가 아직 budget.db를 사용 중입니다. 먼저 종료해 주세요:\n${holders}`);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 덮어쓰기 직전 현재 DB 안전 대피
  if (fs.existsSync(DB_PATH)) {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
      now.getMinutes()
    ).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const preRestorePath = path.join(BACKUP_DIR, `pre_restore_${stamp}.db`);
    const curDb = new DatabaseSync(DB_PATH);
    try {
      curDb.exec(`VACUUM INTO '${preRestorePath.replace(/'/g, "''")}';`);
    } finally {
      curDb.close();
    }
    console.log(`• 복구 전 기존 DB 안전 보관 완료: ${preRestorePath}`);
  }

  for (const suffix of ['', '-wal', '-shm']) {
    const p = `${DB_PATH}${suffix}`;
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  }

  fs.copyFileSync(sourcePath, DB_PATH);
  const verify = inspectBackupFile(DB_PATH);
  console.log(`✓ DB 복구 완료! (구성원 ${verify.userCnt}명, 거래 ${verify.txCnt}건)`);
} finally {
  if (unloadedAgent) {
    console.log('• 가계부 서버를 다시 시작하는 중...');
    execFileSync('launchctl', ['load', '-w', PLIST_PATH], { stdio: 'inherit' });
  }
}
