'use client';

import React from 'react';
import { PieChart, Users, TrendingUp } from 'lucide-react';
import type { Category, SummaryData, User } from '@/types/budget';
import { formatAUD } from '@/lib/currency';
import { CategoryIcon } from './CategoryIcon';

interface StatsViewProps {
  summary: SummaryData;
  users: User[];
  categories: Category[];
}

// 통계 분석 뷰 (PC 2컬럼 / 모바일 1컬럼)
export function StatsView({ summary, users, categories }: StatsViewProps) {
  const getUserColor = (name: string) => users.find((u) => u.name === name)?.color || '#3b82f6';
  const getCategoryMeta = (name: string, type: string) =>
    categories.find((c) => c.name === name && c.type === type);

  const totalFamilyExpense = summary.userExpenses.reduce((acc, cur) => acc + cur.total, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* 카테고리별 지출 분석 */}
      <section className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <PieChart size={18} className="text-indigo-500" />
            카테고리별 지출 분석
          </h2>
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
            총 {formatAUD(summary.totalExpense)}
          </span>
        </div>

        {summary.categoryExpenses.length === 0 ? (
          <div className="text-center py-14 text-slate-400 dark:text-slate-500 text-sm">
            이번 달 지출 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-3.5">
            {summary.categoryExpenses.map((cat, idx) => {
              const ratio =
                summary.totalExpense > 0 ? Math.round((cat.total / summary.totalExpense) * 100) : 0;
              const meta = getCategoryMeta(cat.category, 'expense');
              const color = meta?.color || '#6366f1';
              return (
                <div key={cat.category}>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: color }}
                      >
                        <CategoryIcon name={meta?.icon || 'tag'} size={13} />
                      </span>
                      <span>
                        {idx + 1}. {cat.category}
                      </span>
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {formatAUD(cat.total)}{' '}
                      <span className="text-slate-400 dark:text-slate-500">({ratio}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${ratio}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 가족 구성원별 지출 & 카테고리별 수입 */}
      <div className="space-y-5">
        <section className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              구성원별 지출 비교 (전체 가족 기준)
            </h2>
          </div>

          {summary.userExpenses.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              지출 데이터가 없습니다.
            </div>
          ) : (
            <div className="space-y-3.5">
              {summary.userExpenses.map((u) => {
                const ratio =
                  totalFamilyExpense > 0 ? Math.round((u.total / totalFamilyExpense) * 100) : 0;
                const color = getUserColor(u.user_name);
                return (
                  <div key={u.user_name}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        {u.user_name}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {formatAUD(u.total)}{' '}
                        <span className="text-slate-400 dark:text-slate-500">({ratio}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${ratio}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              카테고리별 수입 분석
            </h2>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              총 {formatAUD(summary.totalIncome)}
            </span>
          </div>

          {summary.categoryIncomes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              이번 달 수입 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-3.5">
              {summary.categoryIncomes.map((cat) => {
                const ratio =
                  summary.totalIncome > 0 ? Math.round((cat.total / summary.totalIncome) * 100) : 0;
                const meta = getCategoryMeta(cat.category, 'income');
                const color = meta?.color || '#10b981';
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: color }}
                        >
                          <CategoryIcon name={meta?.icon || 'wallet'} size={13} />
                        </span>
                        {cat.category}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {formatAUD(cat.total)}{' '}
                        <span className="text-slate-400 dark:text-slate-500">({ratio}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${ratio}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
