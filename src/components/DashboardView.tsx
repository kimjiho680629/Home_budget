'use client';

import React, { useEffect, useState } from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Users,
  ListOrdered,
  PlusCircle,
  PieChart,
  Pencil,
  Target,
  Check,
  X,
  Repeat,
} from 'lucide-react';
import type { Category, RecurringTemplate, SummaryData, Transaction, User } from '@/types/budget';
import { formatAUD, formatSignedAUD } from '@/lib/currency';
import { apiFetch } from '@/lib/api-client';
import { CategoryIcon } from './CategoryIcon';

interface DashboardViewProps {
  summary: SummaryData;
  transactions: Transaction[];
  users: User[];
  categories: Category[];
  templates: RecurringTemplate[];
  selectedUser: string;
  currentMonthStr: string;
  onOpenAdd: () => void;
  onViewAll: () => void;
  onEditTx: (tx: Transaction) => void;
  onRefresh: () => Promise<void>;
}

// 대시보드 뷰 (모바일 1열 / PC 멀티컬럼 카드 그리드 + 목표 예산 게이지)
export function DashboardView({
  summary,
  transactions,
  users,
  categories,
  templates,
  selectedUser,
  currentMonthStr,
  onOpenAdd,
  onViewAll,
  onEditTx,
  onRefresh,
}: DashboardViewProps) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    summary.budgetAmount > 0 ? String(summary.budgetAmount) : ''
  );
  const [savingBudget, setSavingBudget] = useState(false);
  const [applyingTemplates, setApplyingTemplates] = useState(false);

  useEffect(() => {
    setBudgetInput(summary.budgetAmount > 0 ? String(summary.budgetAmount) : '');
    setEditingBudget(false);
  }, [summary.month, summary.budgetAmount]);

  const getUserColor = (name: string) => users.find((u) => u.name === name)?.color || '#3b82f6';
  const getCategoryMeta = (name: string, type: string) =>
    categories.find((c) => c.name === name && c.type === type);

  const totalFamilyExpense = summary.userExpenses.reduce((acc, cur) => acc + cur.total, 0);

  const budgetAmount = summary.budgetAmount || 0;
  const budgetRatio =
    budgetAmount > 0 ? Math.round((summary.totalExpense / budgetAmount) * 100) : 0;
  const budgetBarWidth = Math.min(budgetRatio, 100);
  const budgetRemaining = budgetAmount - summary.totalExpense;
  const isOverBudget = budgetAmount > 0 && summary.totalExpense > budgetAmount;

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = budgetInput.trim() === '' ? 0 : Number(budgetInput);
    if (!Number.isFinite(numeric) || numeric < 0) {
      alert('목표 예산 금액을 0 이상으로 입력하세요.');
      return;
    }
    try {
      setSavingBudget(true);
      const res = await apiFetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: currentMonthStr, amount: numeric }),
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success) {
        setEditingBudget(false);
        await onRefresh();
      } else {
        alert(data.error || '예산 저장에 실패했습니다.');
      }
    } catch {
      alert('예산 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleApplyAllTemplates = async () => {
    if (templates.length === 0) return;
    if (!confirm(`저장된 ${templates.length}건의 고정·정기 내역을 ${currentMonthStr} 가계부에 등록할까요?`)) {
      return;
    }
    try {
      setApplyingTemplates(true);
      const res = await apiFetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', applyAll: true, month: currentMonthStr }),
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success) {
        await onRefresh();
        alert(data.message || '정기 내역이 등록되었습니다.');
      } else {
        alert(data.error || '등록에 실패했습니다.');
      }
    } catch {
      alert('정기 내역 등록 중 오류가 발생했습니다.');
    } finally {
      setApplyingTemplates(false);
    }
  };

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

      {/* 월별 목표 예산 진행률 카드 */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target size={16} className={isOverBudget ? 'text-rose-500' : 'text-blue-500'} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {currentMonthStr} 월간 목표 예산
            </h3>
            {budgetAmount > 0 && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isOverBudget
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                    : budgetRatio >= 80
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {budgetRatio}% 사용
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <button
                type="button"
                disabled={applyingTemplates}
                onClick={handleApplyAllTemplates}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                <Repeat size={13} />
                <span>{applyingTemplates ? '등록 중...' : `정기 내역 일괄 등록 (${templates.length})`}</span>
              </button>
            )}

            {!editingBudget && (
              <button
                type="button"
                onClick={() => setEditingBudget(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <Pencil size={12} />
                <span>{budgetAmount > 0 ? '예산 수정' : '예산 설정'}</span>
              </button>
            )}
          </div>
        </div>

        {editingBudget ? (
          <form onSubmit={handleSaveBudget} className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                A$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="예: 3500"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={savingBudget}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <Check size={14} /> 저장
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingBudget(false);
                setBudgetInput(budgetAmount > 0 ? String(budgetAmount) : '');
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <X size={14} /> 취소
            </button>
          </form>
        ) : budgetAmount > 0 ? (
          <div className="mt-3 space-y-2">
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget
                    ? 'bg-rose-500'
                    : budgetRatio >= 80
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                }`}
                style={{ width: `${budgetBarWidth}%` }}
              />
            </div>
            <div className="flex flex-wrap justify-between items-center text-xs text-slate-500 dark:text-slate-400 gap-2">
              <span>
                지출 <strong className="text-slate-800 dark:text-slate-200">{formatAUD(summary.totalExpense)}</strong> / 목표{' '}
                <strong className="text-slate-800 dark:text-slate-200">{formatAUD(budgetAmount)}</strong>
              </span>
              <span className={isOverBudget ? 'text-rose-600 dark:text-rose-400 font-bold' : 'font-semibold'}>
                {isOverBudget
                  ? `${formatAUD(Math.abs(budgetRemaining))} 초과`
                  : `남은 예산 ${formatAUD(budgetRemaining)}`}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            이번 달 목표 예산을 설정하면 지출 진행률과 초과 여부를 바로 확인할 수 있습니다.
          </p>
        )}
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
