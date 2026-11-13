import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const password = process.argv[2];

if (!password || password.length < 4) {
  console.error('사용법: node scripts/set-password.mjs <비밀번호(4자 이상)>');
  process.exit(1);
}

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(path.join(dataDir, 'budget.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const salt = crypto.randomBytes(16).toString('hex');
const derived = crypto.scryptSync(password, salt, 64).toString('hex');
const hashed = `scrypt$${salt}$${derived}`;
const nextVersion = crypto.randomBytes(8).toString('hex');

const upsert = db.prepare(
  'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
);
upsert.run('auth_password_hash', hashed);
upsert.run('auth_version', nextVersion);

console.log('✓ 가계부 로그인 비밀번호가 성공적으로 설정/변경되었습니다.');
