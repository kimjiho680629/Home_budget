'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Wallet, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface LoginScreenProps {
  needsSetup: boolean;
  onSuccess: () => void;
}

// 가족 공용 가계부 비밀번호 로그인 / 최초 비밀번호 설정 화면
export function LoginScreen({ needsSetup, onSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('비밀번호를 입력하세요.');
      return;
    }

    if (needsSetup) {
      if (password.length < 4) {
        setError('비밀번호는 최소 4자 이상이어야 합니다.');
        return;
      }
      if (password !== confirmPassword) {
        setError('비밀번호 확인이 일치하지 않습니다.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: needsSetup ? 'setup' : 'login',
          password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPassword('');
        setConfirmPassword('');
        onSuccess();
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch {
      setError('서버와 통신할 수 없습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="absolute top-4 right-4">
        <ThemeToggle compact />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 mb-4">
            {needsSetup ? <ShieldCheck size={28} /> : <Wallet size={28} />}
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            우리집 가계부
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            {needsSetup
              ? '외부 접속 보호를 위해 사용할 비밀번호를 먼저 설정하세요.'
              : '가족 가계부에 접속하려면 비밀번호를 입력하세요.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
              {needsSetup ? '새 비밀번호 (4자 이상)' : '비밀번호'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={needsSetup ? '사용할 비밀번호 입력' : '비밀번호 입력'}
                autoFocus
                autoComplete={needsSetup ? 'new-password' : 'current-password'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-11 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {needsSetup && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                비밀번호 확인
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 다시 입력"
                  autoComplete="new-password"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/70 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-sm shadow-md shadow-blue-600/20 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? '확인 중...'
              : needsSetup
                ? '비밀번호 설정 후 시작하기'
                : '잠금 해제 및 로그인'}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-5">
          로그인 상태는 브라우저에 안전하게 30일간 유지됩니다.
        </p>
      </div>
    </div>
  );
}
