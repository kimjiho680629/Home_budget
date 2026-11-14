'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import {
  X,
  QrCode,
  Copy,
  Check,
  Share2,
  Globe,
  Wifi,
  RefreshCw,
  Smartphone,
} from 'lucide-react';

interface ConnectionInfo {
  isTunnelRunning: boolean;
  isFixedUrl: boolean;
  externalUrl: string;
  externalQr: string;
  localUrls: string[];
  primaryLocalUrl: string;
  localQr: string;
}

interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
}

// 다른 기기(스마트폰/태블릿/PC)에서 QR 코드·복사·공유로 쉽게 접속하는 모달
export function ConnectModal({ open, onClose }: ConnectModalProps) {
  const [info, setInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'external' | 'local'>('external');
  const [copied, setCopied] = useState(false);

  const loadInfo = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/connection');
      if (res.status === 401) return;
      const json = await res.json();
      if (json.success) {
        setInfo(json.data);
        // 외부 터널이 꺼져 있으면 자동으로 집 안 와이파이 탭을 기본 선택
        if (!json.data.externalUrl) {
          setMode('local');
        }
      }
    } catch {
      // 무시
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadInfo();
    }
  }, [open]);

  if (!open) return null;

  const activeUrl = mode === 'external' ? info?.externalUrl || '' : info?.primaryLocalUrl || '';
  const activeQr = mode === 'external' ? info?.externalQr || '' : info?.localQr || '';

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert(`아래 주소를 복사해 주세요:\n${text}`);
    }
  };

  const handleShare = async (url: string) => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: '우리집 가계부',
          text: '우리집 가계부 접속 링크입니다.',
          url,
        });
      } catch {
        // 사용자 취소 무시
      }
    } else {
      handleCopy(url);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <QrCode size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">다른 기기 간편 연결</h2>
              <p className="text-[11px] text-slate-400">긴 주소 입력 없이 QR 스캔으로 바로 접속하세요</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-4">
          {/* 접속 방식 선택 탭 */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('external')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'external'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Globe size={14} /> 외부 접속 (LTE/5G)
            </button>
            <button
              type="button"
              onClick={() => setMode('local')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'local'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Wifi size={14} /> 집 안 와이파이
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">접속 정보를 불러오는 중...</div>
          ) : mode === 'external' && !info?.externalUrl ? (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-center space-y-2">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                현재 외부 접속 터널이 실행 중이 아닙니다.
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                터미널에서 <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">./start.sh</code>를 실행하면 외부 주소와 QR 코드가 자동으로 활성화됩니다.
              </p>
              <button
                type="button"
                onClick={() => setMode('local')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 underline cursor-pointer"
              >
                집 안 와이파이 주소로 연결하기 →
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              {/* QR 코드 */}
              {activeQr && (
                <div className="p-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
                  <img src={activeQr} alt="접속 QR 코드" className="w-48 h-48 rounded-xl" />
                </div>
              )}

              {/* 주소 표시 + 복사/공유 */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    {mode === 'external'
                      ? info?.isFixedUrl
                        ? '고정 외부 주소'
                        : '임시 외부 주소 (Cloudflare)'
                      : '같은 공유기 내부 짧은 주소'}
                  </span>
                  <button
                    type="button"
                    onClick={loadInfo}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw size={11} /> 새로고침
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-xs font-mono text-slate-700 dark:text-slate-200 break-all text-center select-all">
                  {activeUrl}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(activeUrl)}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check size={15} /> 복사 완료
                      </>
                    ) : (
                      <>
                        <Copy size={15} /> 주소 복사
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(activeUrl)}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Share2 size={15} /> 가족에게 공유
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 사용 팁 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Smartphone size={13} className="text-blue-500" /> 더 편하게 쓰는 팁
            </div>
            <p>• 스마트폰 카메라로 위 QR 코드를 비추면 타이핑 없이 바로 열립니다.</p>
            <p>• 한 번 연 뒤 브라우저 메뉴에서 <strong>[홈 화면에 추가]</strong>를 누르면 앱 아이콘으로 바로 실행됩니다.</p>
            <p className="text-slate-400 dark:text-slate-400">
              • 집 안 와이파이에서는 <code className="font-mono">{info?.primaryLocalUrl || 'http://192.168.x.x:3000'}</code> 주소가 바뀌지 않아 즐겨찾기해 두고 쓰기 좋습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
