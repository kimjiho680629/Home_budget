import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'budget.db');

// Singleton database instance
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initTables(dbInstance);
  }
  return dbInstance;
}

function initTables(db: DatabaseSync) {
  // WAL 모드 설정
  db.exec('PRAGMA journal_mode = WAL;');

  // 가족 구성원 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 카테고리 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'expense' or 'income'
      icon TEXT DEFAULT 'tag',
      color TEXT DEFAULT '#64748b',
      UNIQUE(name, type)
    );
  `);

  // 거래 내역 테이블 (수입/지출, 호주달러 센트 단위 소수 지원)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'expense' or 'income'
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      user_name TEXT NOT NULL,
      date TEXT NOT NULL, -- 'YYYY-MM-DD'
      memo TEXT,
      payment_method TEXT DEFAULT '카드', -- '카드', '현금', '계좌이체'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 월별 목표 예산 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE, -- 'YYYY-MM'
      amount REAL NOT NULL DEFAULT 0
    );
  `);

  // 앱 메타 설정 테이블 (초기 데이터 시딩 여부 등 관리)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 고정 지출 · 정기 수입 반복 템플릿 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL, -- 'expense' or 'income'
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      user_name TEXT NOT NULL,
      payment_method TEXT DEFAULT '카드',
      memo TEXT DEFAULT '',
      day_of_month INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const seededRow = db.prepare("SELECT value FROM app_meta WHERE key = 'seeded_defaults'").get() as
    | { value: string }
    | undefined;

  if (!seededRow) {
    // 최초 실행 시 기본 데이터가 비어 있는 경우에만 초기값 삽입
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
    if (userCount.cnt === 0) {
      const insertUser = db.prepare('INSERT INTO users (name, color) VALUES (?, ?)');
      insertUser.run('아빠', '#3b82f6');
      insertUser.run('엄마', '#ec4899');
      insertUser.run('공동', '#10b981');
    }

    const catCount = db.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number };
    if (catCount.cnt === 0) {
      const insertCat = db.prepare('INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)');
      // 지출 카테고리
      insertCat.run('식비', 'expense', 'utensils', '#ef4444');
      insertCat.run('카페/간식', 'expense', 'coffee', '#f97316');
      insertCat.run('교통/차량', 'expense', 'car', '#06b6d4');
      insertCat.run('주거/통신', 'expense', 'home', '#8b5cf6');
      insertCat.run('쇼핑/생활', 'expense', 'shopping-bag', '#3b82f6');
      insertCat.run('의료/건강', 'expense', 'heart-pulse', '#10b981');
      insertCat.run('문화/여가', 'expense', 'film', '#f59e0b');
      insertCat.run('교육/육아', 'expense', 'book-open', '#6366f1');
      insertCat.run('기타지출', 'expense', 'more-horizontal', '#64748b');

      // 수입 카테고리 (청소대행 업체 자영업자 수입 기준)
      insertCat.run('정기청소', 'income', 'building-2', '#10b981');
      insertCat.run('이사/입주청소', 'income', 'key-round', '#059669');
      insertCat.run('일반/단건청소', 'income', 'sparkles', '#14b8a6');
      insertCat.run('특수/추가청소', 'income', 'spray-can', '#06b6d4');
      insertCat.run('사업정산/환급', 'income', 'receipt', '#3b82f6');
      insertCat.run('기타사업수입', 'income', 'briefcase', '#64748b');
    }

    db.prepare("INSERT OR IGNORE INTO app_meta (key, value) VALUES ('seeded_defaults', '1')").run();
  }

  // 기존 직장인 기본 수입 카테고리가 남아있고 아직 마이그레이션되지 않은 경우 청소대행 자영업 수입으로 전환
  const migratedIncome = db
    .prepare("SELECT value FROM app_meta WHERE key = 'migrated_cleaning_income'")
    .get() as { value: string } | undefined;

  if (!migratedIncome) {
    const legacyNames = ['월급/급여', '상여금', '부수입', '용돈', '기타수입'];
    const currentIncomeRows = db
      .prepare("SELECT name FROM categories WHERE type = 'income'")
      .all() as { name: string }[];
    const hasOnlyLegacy =
      currentIncomeRows.length > 0 &&
      currentIncomeRows.every((row) => legacyNames.includes(row.name));

    if (hasOnlyLegacy) {
      db.exec('BEGIN');
      try {
        db.prepare("DELETE FROM categories WHERE type = 'income'").run();
        const insertCat = db.prepare('INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)');
        insertCat.run('정기청소', 'income', 'building-2', '#10b981');
        insertCat.run('이사/입주청소', 'income', 'key-round', '#059669');
        insertCat.run('일반/단건청소', 'income', 'sparkles', '#14b8a6');
        insertCat.run('특수/추가청소', 'income', 'spray-can', '#06b6d4');
        insertCat.run('사업정산/환급', 'income', 'receipt', '#3b82f6');
        insertCat.run('기타사업수입', 'income', 'briefcase', '#64748b');
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }

    db.prepare("INSERT OR IGNORE INTO app_meta (key, value) VALUES ('migrated_cleaning_income', '1')").run();
  }
}
