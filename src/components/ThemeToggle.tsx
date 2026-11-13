'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  compact?: boolean;
}

// 라이트/다크 모드 전환 버튼 (localStorage 유지)
export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    try {
      localStorage.setItem('home-budget-theme', nextDark ? 'dark' : 'light');
    } catch {
      // 스토리지 접근 불가 환경 무시
    }
  };

  if (!mounted) {
    return (
      <div
        className={
          compact
            ? 'w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800'
            : 'w-full h-10 rounded-xl bg-slate-100 dark:bg-slate-800'
        }
      />
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
      >
        {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-sm font-semibold transition cursor-pointer"
    >
      <span className="flex items-center gap-2.5">
        {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
        <span>{isDark ? '라이트 모드' : '다크 모드'}</span>
      </span>
      <span
        className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
          isDark ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
        }`}
      >
        <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
      </span>
    </button>
  );
}
