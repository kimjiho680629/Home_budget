import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import QRCode from 'qrcode';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 현재 머신의 사설 IPv4 주소 목록 조회
function getLocalUrls(port: string): string[] {
  const interfaces = os.networkInterfaces();
  const urls: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const entries = interfaces[name];
    if (!entries) continue;
    for (const info of entries) {
      if (info.family === 'IPv4' && !info.internal) {
        urls.push(`http://${info.address}:${port}`);
      }
    }
  }
  return urls;
}

// cloudflared 터널 프로세스 실행 여부 확인
function isCloudflaredRunning(): boolean {
  try {
    execSync('pgrep -f "cloudflared tunnel"', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  try {
    const port = process.env.PORT || '3000';
    const localUrls = getLocalUrls(port);
    const primaryLocalUrl = localUrls[0] || `http://localhost:${port}`;

    const isTunnelRunning = isCloudflaredRunning();
    const configuredUrl = (process.env.PUBLIC_URL || '').trim();

    let fileUrl = '';
    const urlFilePath = path.join(process.cwd(), 'CURRENT_URL.txt');
    if (fs.existsSync(urlFilePath)) {
      fileUrl = fs.readFileSync(urlFilePath, 'utf-8').trim();
    }

    // 고정 PUBLIC_URL 또는 실행 중인 터널의 CURRENT_URL 사용
    const externalUrl = configuredUrl || (isTunnelRunning ? fileUrl : '');
    const isFixedUrl = Boolean(configuredUrl);

    const [externalQr, localQr] = await Promise.all([
      externalUrl
        ? QRCode.toDataURL(externalUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
          })
        : Promise.resolve(''),
      QRCode.toDataURL(primaryLocalUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        isTunnelRunning,
        isFixedUrl,
        externalUrl,
        externalQr,
        localUrls,
        primaryLocalUrl,
        localQr,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
