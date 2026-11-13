'use client';

import React from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Users,
  ListOrdered,
  PlusCircle,
  PieChart,
  Pencil,
} from 'lucide-react';
import type { Category, SummaryData, Transaction, User } from '@/types/budget';
import { formatAUD, formatSignedAUD } from '@/lib/currency';
import { CategoryIcon } from './CategoryIcon';

interface DashboardViewProps {
  summary: SummaryData;
  transactions: Transaction[];
  users: User[];
  categories: Category[];
  selectedUser: string;
  onOpenAdd: () => void;
  onViewAll: () => void;
  onEditTx: (tx: Transaction) => void;
}

// 대시보드 뷰 (모바일 1열 / PC 멀티컬럼 카드 그리드)
export function DashboardView({
  summary,
  transactions,
  users,
  categories,
  selectedUser,
  onOpenAdd,
  onViewAll,
  onEditTx,
}: DashboardViewProps) {
  const getUserColor = (name: string) => users.find((u) => u.name === name)?.color || '#3b82f6';
  const getCategoryMeta = (name: string, type: string) =>
    categories.find((c) => c.name === name && c.type === type);

  const totalFamilyExpense = summary.userExpenses.reduce((acc, cur) => acc + cur.total, 0);

  return (
    <div className="space-y-5">
      {/* 상단 요약 카드: 모바일 통합 그라데이션 카드 / PC 3열 KPI 카드 */}
      <div className="lg:hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-700 dark:via-indigo-800 dark:to-slate-900 text-white p-5 rounded-3xl shadow-lg">
        <div className="text-xs font-medium text-blue-100 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Wallet size={14} /> {selectedUser === 'all' ? '이번 달 우리집 잔액' : `${selectedUser}님 잔액`}
          </span>
          <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">
            거래 {transactions.length}건
          </span>
        </div>
        <div className="text-3xl font-extrabold tracking-tight mb-4">
          {formatAUD(summary.balance)}
          <span className="text-sm font-semibold text-blue-100/80 ml-1.5">AUD</span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
          <div>
            <div className="text-xs text-blue-100 flex items-center gap-1 mb-0.5">
              <TrendingDown size={13} className="text-rose-300" /> 총 지출
            </div>
            <div className="font-bold text-base text-rose-200">{formatAUD(summary.totalExpense)}</div>
          </div>
          <div>
            <div className="text-xs text-blue-100 flex items-center gap-1 mb-0.5">
              <TrendingUp size={13} className="text-emerald-300" /> 총 수입
            </div>
            <div className="font-bold text-base text-emerald-200">{formatAUD(summary.totalIncome)}</div>
          </div>
        </div>
      </div>

      {/* PC 3열 KPI 카드 */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 text-white p-5 rounded-3xl shadow-md">
          <div className="flex items-center justify-between text-xs text-blue-100 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Wallet size={15} /> {selectedUser === 'all' ? '이번 달 총 잔액' : `${selectedUser}님 잔액`}
            </span>
            <span className="bg-white/15 px-2.5 py-0.5 rounded-full text-[11px]">
              {transactions.length}건
            </span>
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {formatAUD(summary.balance)}
            <span className="text-sm font-semibold text-blue-100/80 ml-1.5">AUD</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <TrendingDown size={15} className="text-rose-500" /> 이번 달 총 지출
            </span>
            {summary.totalIncome > 0 && (
              <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                수입 대비 {Math.round((summary.totalExpense / summary.totalIncome) * 100)}%
              </span>
            )}
          </div>
          <div className="text-2xl xl:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {formatAUD(summary.totalExpense)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <TrendingUp size={15} className="text-emerald-500" /> 이번 달 총 수입
            </span>
          </div>
          <div className="text-2xl xl:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatAUD(summary.totalIncome)}
          </div>
        </div>
      </div>

      {/* 모바일 빠른 입력 버튼 */}
      <button
        type="button"
        onClick={onOpenAdd}
        className="lg:hidden w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 border border-blue-200/70 dark:border-blue-800/70 active:scale-[0.99] transition cursor-pointer"
      >
        <PlusCircle size={20} />
        <span>새 내역 입력하기</span>
      </button>

      {/* 본문 2컬럼 그리드 (PC 7:5, 모바일 1컬럼) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 최근 내역 */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <ListOrdered size={16} className="text-indigo-500" /> 최근 거래 내역
            </h3>
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              전체보기 ({transactions.length})
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs space-y-2">
              <p>이번 달 등록된 내역이 없습니다.</p>
              <button
                type="button"
                onClick={onOpenAdd}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                <PlusCircle size={14} /> 첫 내역 등록하기
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.slice(0, 6).map((tx) => {
                const cat = getCategoryMeta(tx.category, tx.type);
                const userColor = getUserColor(tx.user_name);
                return (
                  <div
                    key={tx.id}
                    className="py-3 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{
                          backgroundColor: cat?.color || (tx.type === 'expense' ? '#ef4444' : '#10b981'),
                        }}
                      >
                        <CategoryIcon name={cat?.icon || 'tag'} size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {tx.memo || tx.category}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
                          <span>{tx.date.slice(5)}</span>
                          <span>•</span>
                          <span>{tx.category}</span>
                          <span>•</span>
                          <span
                            className="font-semibold px-1.5 py-0.2 rounded-md text-[10px]"
                            style={{
                              backgroundColor: `${userColor}20`,
                              color: userColor,
                            }}
                          >
                            {tx.user_name}
                          </span>
                          <span>•</span>
                          <span>{tx.payment_method}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`font-bold text-sm ${
                          tx.type === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatSignedAUD(tx.amount, tx.type)}
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditTx(tx)}
                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="내역 수정"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 우측 요약: 가족별 지출 비중 + 상위 지출 카테고리 */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
              <Users size={16} className="text-blue-500" /> 가족별 지출 현황
            </h3>
            {summary.userExpenses.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                이번 달 지출 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {summary.userExpenses.map((u) => {
                  const ratio =
                    totalFamilyExpense > 0 ? Math.round((u.total / totalFamilyExpense) * 100) : 0;
                  const color = getUserColor(u.user_name);
                  return (
                    <div key={u.user_name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          {u.user_name}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {formatAUD(u.total)} ({ratio}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
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
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
              <PieChart size={16} className="text-indigo-500" /> 지출 카테고리 TOP 5
            </h3>
            {summary.categoryExpenses.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                표시할 지출 통계가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {summary.categoryExpenses.slice(0, 5).map((cat) => {
                  const ratio =
                    summary.totalExpense > 0 ? Math.round((cat.total / summary.totalExpense) * 100) : 0;
                  const meta = getCategoryMeta(cat.category, 'expense');
                  const barColor = meta?.color || '#6366f1';
                  return (
                    <div key={cat.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <CategoryIcon name={meta?.icon || 'tag'} size={13} />
                          {cat.category}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {formatAUD(cat.total)} ({ratio}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${ratio}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
