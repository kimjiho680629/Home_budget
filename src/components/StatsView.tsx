'use client';

import React, { useState } from 'react';
import { PieChart, Users, TrendingUp, BarChart3, Download } from 'lucide-react';
import type { Category, SummaryData, User } from '@/types/budget';
import { formatAUD } from '@/lib/currency';
import { getAustralianFyRange, getLocalDateStr } from '@/lib/date';
import { apiFetch } from '@/lib/api-client';
import { CategoryIcon } from './CategoryIcon';

interface StatsViewProps {
  summary: SummaryData;
  users: User[];
  categories: Category[];
  selectedUser: string;
  currentMonthStr: string;
}

// 통계 분석 뷰 (최근 6개월 추이 + CSV 정산 내보내기 + 카테고리/구성원 분석)
export function StatsView({
  summary,
  users,
  categories,
  selectedUser,
  currentMonthStr,
}: StatsViewProps) {
  const fyInfo = getAustralianFyRange();
  const [exportStart, setExportStart] = useState(fyInfo.startDate);
  const [exportEnd, setExportEnd] = useState(getLocalDateStr());
  const [exporting, setExporting] = useState(false);

  const getUserColor = (name: string) => users.find((u) => u.name === name)?.color || '#3b82f6';
  const getCategoryMeta = (name: string, type: string) =>
    categories.find((c) => c.name === name && c.type === type);

  const totalFamilyExpense = summary.userExpenses.reduce((acc, cur) => acc + cur.total, 0);
  const monthlyTrend = summary.monthlyTrend || [];
  const maxTrendValue = Math.max(
    1,
    ...monthlyTrend.map((m) => Math.max(m.totalIncome, m.totalExpense))
  );

  const downloadCsv = async (params: Record<string, string>, fallbackName: string) => {
    try {
      setExporting(true);
      const search = new URLSearchParams({
        ...params,
        user: selectedUser,
      });
      const res = await apiFetch(`/api/export?${search.toString()}`);
      if (res.status === 401) return;
      if (!res.ok) {
        alert('CSV 내보내기에 실패했습니다.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('CSV 다운로드 중 오류가 발생했습니다.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 최근 6개월 수입 · 지출 · 순수익 추이 */}
      <section className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500" />
            최근 6개월 수입 · 지출 추이
          </h2>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> 수입
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> 지출
            </span>
          </div>
        </div>

        {monthlyTrend.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">표시할 월별 추이 데이터가 없습니다.</div>
        ) : (
          <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end pt-3">
            {monthlyTrend.map((point) => {
              const incPct = Math.round((point.totalIncome / maxTrendValue) * 100);
              const expPct = Math.round((point.totalExpense / maxTrendValue) * 100);
              const isCurrent = point.month === currentMonthStr;
              return (
                <div key={point.month} className="flex flex-col items-center gap-2">
                  <div className="w-full h-36 flex items-end justify-center gap-1 sm:gap-1.5 px-1 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl py-2">
                    <div
                      className="w-3 sm:w-4 bg-emerald-500/90 rounded-t-md transition-all duration-500"
                      style={{ height: `${point.totalIncome > 0 ? Math.max(incPct, 6) : 2}%` }}
                      title={`수입 ${formatAUD(point.totalIncome)}`}
                    />
                    <div
                      className="w-3 sm:w-4 bg-rose-500/90 rounded-t-md transition-all duration-500"
                      style={{ height: `${point.totalExpense > 0 ? Math.max(expPct, 6) : 2}%` }}
                      title={`지출 ${formatAUD(point.totalExpense)}`}
                    />
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-[11px] font-bold ${
                        isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {point.month.slice(2)}
                    </div>
                    <div
                      className={`text-[10px] font-semibold hidden sm:block ${
                        point.balance >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {point.balance >= 0 ? '+' : ''}
                      {formatAUD(point.balance)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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

      {/* CSV 정산 내보내기 (호주 회계연도 FY / 월별 / 기간 지정) */}
      <section className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Download size={18} className="text-emerald-500" />
            엑셀 · CSV 정산 내보내기
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Excel에서 한글이 깨지지 않는 UTF-8 BOM CSV 파일로 내려받습니다. (현재 선택된 구성원 필터 반영)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={() =>
              downloadCsv({ month: currentMonthStr }, `home_budget_${currentMonthStr}.csv`)
            }
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} />
            <span>이번 달 ({currentMonthStr}) CSV</span>
          </button>

          <button
            type="button"
            disabled={exporting}
            onClick={() =>
              downloadCsv(
                { startDate: fyInfo.startDate, endDate: fyInfo.endDate },
                `home_budget_${fyInfo.startDate}_to_${fyInfo.endDate}.csv`
              )
            }
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-xs font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} />
            <span>호주 회계연도 {fyInfo.label}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">시작일</label>
            <input
              type="date"
              value={exportStart}
              onChange={(e) => setExportStart(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">종료일</label>
            <input
              type="date"
              value={exportEnd}
              onChange={(e) => setExportEnd(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none"
            />
          </div>
          <button
            type="button"
            disabled={exporting || !exportStart || !exportEnd}
            onClick={() =>
              downloadCsv(
                { startDate: exportStart, endDate: exportEnd },
                `home_budget_${exportStart}_to_${exportEnd}.csv`
              )
            }
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} />
            <span>선택 기간 CSV 다운로드</span>
          </button>
        </div>
      </section>
    </div>
  );
}
