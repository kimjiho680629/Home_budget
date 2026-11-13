import { NextResponse } from 'next/server';
import {
  attachSessionCookie,
  checkLoginRateLimit,
  clearLoginFailures,
  clearSessionCookie,
  getAuthStatus,
  getClientIpKey,
  isAuthenticatedRequest,
  recordLoginFailure,
  requireAuth,
  setAppPassword,
  verifyPassword,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MIN_PASSWORD_LENGTH = 4;

// 현재 로그인 상태 및 비밀번호 설정 여부 조회
export async function GET(request: Request) {
  try {
    const status = getAuthStatus();
    const authenticated = isAuthenticatedRequest(request);
    return NextResponse.json({
      success: true,
      data: {
        authenticated,
        needsSetup: status.needsSetup,
        envManaged: status.envManaged,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 로그인 / 최초 비밀번호 설정 / 로그아웃
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'login';

    if (action === 'logout') {
      const res = NextResponse.json({ success: true, message: '로그아웃되었습니다.' });
      clearSessionCookie(res, request);
      return res;
    }

    const status = getAuthStatus();

    if (action === 'setup') {
      if (!status.needsSetup) {
        return NextResponse.json(
          { success: false, error: '이미 비밀번호가 설정되어 있습니다.' },
          { status: 409 }
        );
      }
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { success: false, error: `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` },
          { status: 400 }
        );
      }
      setAppPassword(password);
      const res = NextResponse.json({ success: true, message: '비밀번호가 설정되었습니다.' });
      attachSessionCookie(res, request);
      return res;
    }

    if (status.needsSetup) {
      return NextResponse.json(
        { success: false, error: '최초 비밀번호 설정이 필요합니다.', code: 'NEEDS_SETUP' },
        { status: 400 }
      );
    }

    const clientKey = getClientIpKey(request);
    const rate = checkLoginRateLimit(clientKey);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `로그인 시도가 너무 많습니다. ${rate.retryAfterSec}초 후 다시 시도하세요.`,
        },
        { status: 429 }
      );
    }

    const password = typeof body.password === 'string' ? body.password : '';
    if (!verifyPassword(password)) {
      recordLoginFailure(clientKey);
      return NextResponse.json(
        { success: false, error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    clearLoginFailures(clientKey);
    const res = NextResponse.json({ success: true, message: '로그인되었습니다.' });
    attachSessionCookie(res, request);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 로그인 상태에서 비밀번호 변경
export async function PATCH(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const status = getAuthStatus();
    if (status.envManaged) {
      return NextResponse.json(
        {
          success: false,
          error: '.env.local의 APP_PASSWORD로 관리 중입니다. 해당 파일에서 변경 후 서버를 재시작하세요.',
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!verifyPassword(currentPassword)) {
      return NextResponse.json(
        { success: false, error: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, error: `새 비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` },
        { status: 400 }
      );
    }

    setAppPassword(newPassword);
    const res = NextResponse.json({
      success: true,
      message: '비밀번호가 변경되었습니다. 다른 기기에서는 새 비밀번호로 다시 로그인해야 합니다.',
    });
    attachSessionCookie(res, request);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 로그아웃
export async function DELETE(request: Request) {
  const res = NextResponse.json({ success: true, message: '로그아웃되었습니다.' });
  clearSessionCookie(res, request);
  return res;
}
