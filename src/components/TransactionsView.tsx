'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, Pencil, PlusCircle, Copy, CalendarRange } from 'lucide-react';
import type { Category, Transaction, User } from '@/types/budget';
import { PAYMENT_METHODS } from '@/lib/constants';
import { formatSignedAUD } from '@/lib/currency';
import { apiFetch } from '@/lib/api-client';
import { CategoryIcon } from './CategoryIcon';

interface TransactionsViewProps {
  transactions: Transaction[];
  users: User[];
  categories: Category[];
  selectedUser: string;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (id: number) => void;
  onOpenAdd: () => void;
}

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

// 거래 내역 전체 목록 (결제수단/구분 필터 + 정렬 + 전체기간 검색 + 복사 등록)
export function TransactionsView({
  transactions,
  users,
  categories,
  selectedUser,
  onEdit,
  onDuplicate,
  onDelete,
  onOpenAdd,
}: TransactionsViewProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [allMonthsMode, setAllMonthsMode] = useState(false);
  const [allMonthsRows, setAllMonthsRows] = useState<Transaction[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    if (!allMonthsMode) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingAll(true);
        const res = await apiFetch(
          `/api/transactions?allMonths=1&user=${encodeURIComponent(selectedUser)}`
        );
        if (res.status === 401) return;
        const data = await res.json();
        if (!cancelled && data.success) {
          setAllMonthsRows(data.data);
        }
      } catch {
        // 무시
      } finally {
        if (!cancelled) setLoadingAll(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allMonthsMode, selectedUser, transactions]);

  const getUserColor = (name: string) => users.find((u) => u.name === name)?.color || '#3b82f6';
  const getCategoryMeta = (name: string, type: string) =>
    categories.find((c) => c.name === name && c.type === type);

  const sourceList = allMonthsMode ? allMonthsRows : transactions;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sourceList.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (paymentFilter !== 'all' && tx.payment_method !== paymentFilter) return false;
      if (!q) return true;
      return (
        tx.category.toLowerCase().includes(q) ||
        (tx.memo || '').toLowerCase().includes(q) ||
        tx.user_name.toLowerCase().includes(q) ||
        tx.payment_method.toLowerCase().includes(q) ||
        tx.date.includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'date_asc') {
        return a.date.localeCompare(b.date) || a.id - b.id;
      }
      if (sortBy === 'amount_desc') {
        return b.amount - a.amount || b.date.localeCompare(a.date);
      }
      if (sortBy === 'amount_asc') {
        return a.amount - b.amount || b.date.localeCompare(a.date);
      }
      return b.date.localeCompare(a.date) || b.id - a.id;
    });
  }, [sourceList, search, typeFilter, paymentFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* 상단 필터/검색 바 */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  typeFilter === t
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t === 'all' ? '전체' : t === 'expense' ? '지출' : '수입'}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setAllMonthsMode((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                allMonthsMode
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="선택된 월뿐만 아니라 전체 기간 내역에서 검색"
            >
              <CalendarRange size={13} />
              <span>{allMonthsMode ? '전체 기간 보기 중' : '전체 기간 검색'}</span>
            </button>

            <span className="text-xs text-slate-400 ml-1 font-medium">
              {loadingAll ? '불러오는 중...' : `${filtered.length}건`}
            </span>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="내용, 카테고리, 작성자, 날짜 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 결제수단 필터 & 정렬 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">결제수단:</span>
            {['all', ...PAYMENT_METHODS].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentFilter(method)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  paymentFilter === method
                    ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {method === 'all' ? '전체' : method}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="정렬 순서"
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-2.5 py-1.5 rounded-xl outline-none"
          >
            <option value="date_desc">최신순</option>
            <option value="date_asc">오래된순</option>
            <option value="amount_desc">금액 높은순</option>
            <option value="amount_asc">금액 낮은순</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center py-16 text-slate-400 dark:text-slate-500 text-sm space-y-2">
          <p>{loadingAll ? '전체 기간 내역을 불러오는 중입니다...' : '조건에 맞는 내역이 없습니다.'}</p>
          <button
            type="button"
            onClick={onOpenAdd}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            <PlusCircle size={15} /> 새 내역 등록하기
          </button>
        </div>
      ) : (
        <>
          {/* 모바일 카드 리스트 */}
          <div className="lg:hidden space-y-2">
            {filtered.map((tx) => {
              const cat = getCategoryMeta(tx.category, tx.type);
              const userColor = getUserColor(tx.user_name);
              return (
                <div
                  key={tx.id}
                  className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
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
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span>{tx.category}</span>
                        <span>•</span>
                        <span className="font-semibold" style={{ color: userColor }}>
                          {tx.user_name}
                        </span>
                        <span>•</span>
                        <span>{tx.payment_method}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div
                      className={`font-bold text-sm mr-1 ${
                        tx.type === 'expense'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatSignedAUD(tx.amount, tx.type)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDuplicate(tx)}
                      className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg cursor-pointer"
                      title="복사해서 새로 입력"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(tx)}
                      className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg cursor-pointer"
                      title="수정"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(tx.id)}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PC 테이블 뷰 */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="py-3.5 px-5">날짜</th>
                  <th className="py-3.5 px-4">카테고리</th>
                  <th className="py-3.5 px-4">내용 / 메모</th>
                  <th className="py-3.5 px-4">작성자</th>
                  <th className="py-3.5 px-4">결제수단</th>
                  <th className="py-3.5 px-4 text-right">금액</th>
                  <th className="py-3.5 px-5 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((tx) => {
                  const cat = getCategoryMeta(tx.category, tx.type);
                  const userColor = getUserColor(tx.user_name);
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200 text-xs">
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                            style={{
                              backgroundColor:
                                cat?.color || (tx.type === 'expense' ? '#ef4444' : '#10b981'),
                            }}
                          >
                            <CategoryIcon name={cat?.icon || 'tag'} size={13} />
                          </span>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-100 font-medium max-w-xs truncate">
                        {tx.memo || <span className="text-slate-400 dark:text-slate-600">-</span>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: `${userColor}20`,
                            color: userColor,
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: userColor }} />
                          {tx.user_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.payment_method}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-extrabold whitespace-nowrap ${
                          tx.type === 'expense'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatSignedAUD(tx.amount, tx.type)}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onDuplicate(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                            title="복사해서 새로 입력"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                            title="수정"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(tx.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
