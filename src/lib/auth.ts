import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { DatabaseSync } from 'node:sqlite';
import { getDb } from './db';

export const SESSION_COOKIE_NAME = 'home-budget-session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

interface SessionPayload {
  iat: number;
  exp: number;
  ver: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10분
const BLOCK_DURATION_MS = 60 * 1000; // 60초

/**
 * 요청 헤더에서 클라이언트 식별용 IP 키를 추출한다.
 */
export function getClientIpKey(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'local';
}

/**
 * 로그인 실패 횟수에 따른 잠금 여부를 확인한다.
 */
export function checkLoginRateLimit(clientKey: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = loginAttempts.get(clientKey);
  if (!entry) return { allowed: true, retryAfterSec: 0 };

  if (entry.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  if (entry.resetAt <= now) {
    loginAttempts.delete(clientKey);
  }
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * 로그인 실패를 기록하고 임계치 초과 시 일시 잠금을 건다.
 */
export function recordLoginFailure(clientKey: string): void {
  const now = Date.now();
  const existing = loginAttempts.get(clientKey);
  if (!existing || existing.resetAt <= now) {
    loginAttempts.set(clientKey, {
      count: 1,
      resetAt: now + ATTEMPT_WINDOW_MS,
      blockedUntil: 0,
    });
    return;
  }

  const nextCount = existing.count + 1;
  loginAttempts.set(clientKey, {
    count: nextCount,
    resetAt: existing.resetAt,
    blockedUntil: nextCount >= MAX_FAILED_ATTEMPTS ? now + BLOCK_DURATION_MS : 0,
  });
}

/**
 * 로그인 성공 시 실패 카운터를 초기화한다.
 */
export function clearLoginFailures(clientKey: string): void {
  loginAttempts.delete(clientKey);
}

/**
 * scrypt 기반 솔트 해시를 생성한다.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/**
 * 저장된 scrypt 해시와 입력 비밀번호를 상수 시간 비교로 검증한다.
 */
export function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexHash] = parts;
  if (!salt || !hexHash) return false;

  const expected = Buffer.from(hexHash, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function getMetaValue(db: DatabaseSync, key: string): string {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : '';
}

function setMetaValue(db: DatabaseSync, key: string, value: string): void {
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

function getAuthSecret(db: DatabaseSync): string {
  const envSecret = (process.env.AUTH_SECRET || '').trim();
  if (envSecret) return envSecret;

  const existing = getMetaValue(db, 'auth_secret');
  if (existing) return existing;

  const generated = crypto.randomBytes(32).toString('hex');
  setMetaValue(db, 'auth_secret', generated);
  return generated;
}

function getAuthVersion(db: DatabaseSync): string {
  const existing = getMetaValue(db, 'auth_version');
  if (existing) return existing;
  setMetaValue(db, 'auth_version', '1');
  return '1';
}

/**
 * 현재 비밀번호 설정 상태를 반환한다.
 */
export function getAuthStatus(): {
  needsSetup: boolean;
  envManaged: boolean;
  version: string;
} {
  const db = getDb();
  const envPassword = (process.env.APP_PASSWORD || '').trim();
  const dbHash = getMetaValue(db, 'auth_password_hash');
  const version = getAuthVersion(db);
  return {
    needsSetup: !envPassword && !dbHash,
    envManaged: Boolean(envPassword),
    version,
  };
}

/**
 * 입력된 비밀번호가 설정된 비밀번호와 일치하는지 확인한다.
 */
export function verifyPassword(password: string): boolean {
  if (!password) return false;
  const db = getDb();
  const envPassword = (process.env.APP_PASSWORD || '').trim();
  if (envPassword) {
    return constantTimeStringEqual(password, envPassword);
  }
  const dbHash = getMetaValue(db, 'auth_password_hash');
  if (!dbHash) return false;
  return verifyPasswordHash(password, dbHash);
}

/**
 * DB에 새 비밀번호 해시를 저장하고 세션 버전을 갱신해 기존 세션을 무효화한다.
 */
export function setAppPassword(newPassword: string): void {
  const db = getDb();
  const hashed = hashPassword(newPassword);
  const nextVersion = crypto.randomBytes(8).toString('hex');
  setMetaValue(db, 'auth_password_hash', hashed);
  setMetaValue(db, 'auth_version', nextVersion);
}

/**
 * 서명된 세션 토큰을 발급한다.
 */
export function createSessionToken(): string {
  const db = getDb();
  const secret = getAuthSecret(db);
  const version = getAuthVersion(db);
  const now = Date.now();
  const payload: SessionPayload = {
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000,
    ver: version,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/**
 * 요청 쿠키의 세션 토큰이 유효한지 검증한다.
 */
export function isAuthenticatedRequest(request: Request): boolean {
  const status = getAuthStatus();
  if (status.needsSetup) return false;

  const token = parseCookie(request.headers.get('cookie'), SESSION_COOKIE_NAME);
  if (!token) return false;

  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return false;

  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64) return false;

  const db = getDb();
  const secret = getAuthSecret(db);
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

  const sigBuf = Buffer.from(sigB64, 'utf-8');
  const expectedBuf = Buffer.from(expectedSig, 'utf-8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as SessionPayload;
    if (!parsed || typeof parsed.exp !== 'number' || typeof parsed.ver !== 'string') {
      return false;
    }
    if (parsed.exp <= Date.now()) return false;
    return parsed.ver === status.version;
  } catch {
    return false;
  }
}

/**
 * API 라우트 보호용 헬퍼: 미인증 요청이면 401 응답을 반환한다.
 */
export function requireAuth(request: Request): NextResponse | null {
  if (isAuthenticatedRequest(request)) return null;
  return NextResponse.json(
    { success: false, error: '로그인이 필요합니다.', code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

/**
 * HTTPS(Cloudflare 터널 등) 요청 여부로 Secure 쿠키 플래그를 결정한다.
 */
export function shouldUseSecureCookie(request: Request): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return request.url.startsWith('https://');
}

/**
 * 응답에 로그인 세션 쿠키를 설정한다.
 */
export function attachSessionCookie(response: NextResponse, request: Request): void {
  const token = createSessionToken();
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * 응답에서 로그인 세션 쿠키를 제거한다.
 */
export function clearSessionCookie(response: NextResponse, request: Request): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request),
    path: '/',
    maxAge: 0,
  });
}
