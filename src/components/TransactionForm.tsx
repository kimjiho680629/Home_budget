'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, Check, UserPlus, Repeat } from 'lucide-react';
import type { Category, RecurringTemplate, Transaction, TransactionType, User } from '@/types/budget';
import { CATEGORY_ICON_OPTIONS, COLOR_PALETTE, PAYMENT_METHODS } from '@/lib/constants';
import { getLocalDateStr } from '@/lib/date';
import { apiFetch } from '@/lib/api-client';
import { formatAUD } from '@/lib/currency';
import { CategoryIcon } from './CategoryIcon';

interface TransactionFormProps {
  users: User[];
  categories: Category[];
  templates?: RecurringTemplate[];
  editingTx?: Transaction | null;
  duplicatingTx?: Transaction | null;
  onSaved: () => void;
  onCancel?: () => void;
  onGoToSettings: () => void;
  onCategoryAdded: () => Promise<void>;
}

// 내역 등록 및 수정 공용 폼 (인라인 카테고리 추가 + 정기 템플릿 불러오기/저장)
export function TransactionForm({
  users,
  categories,
  templates = [],
  editingTx,
  duplicatingTx,
  onSaved,
  onCancel,
  onGoToSettings,
  onCategoryAdded,
}: TransactionFormProps) {
  const initialSource = editingTx || duplicatingTx || null;

  const [type, setType] = useState<TransactionType>(initialSource?.type || 'expense');
  const [amount, setAmount] = useState(initialSource ? String(initialSource.amount) : '');
  const [category, setCategory] = useState(initialSource?.category || '');
  const [userName, setUserName] = useState(initialSource?.user_name || '');
  const [date, setDate] = useState(editingTx?.date || getLocalDateStr());
  const [memo, setMemo] = useState(initialSource?.memo || '');
  const [paymentMethod, setPaymentMethod] = useState(initialSource?.payment_method || '카드');
  const [submitting, setSubmitting] = useState(false);

  // 정기 템플릿으로도 저장 옵션 (신규 입력 시)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');

  // 인라인 새 카테고리 빠른 추가 상태
  const [showQuickCat, setShowQuickCat] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatColor, setQuickCatColor] = useState(COLOR_PALETTE[0].value);
  const [quickCatIcon, setQuickCatIcon] = useState('tag');
  const [addingCat, setAddingCat] = useState(false);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  // 수정/복사 대상이 바뀌거나 초기 목록 로드 시 기본값 동기화
  useEffect(() => {
    if (editingTx) {
      setType(editingTx.type);
      setAmount(String(editingTx.amount));
      setCategory(editingTx.category);
      setUserName(editingTx.user_name);
      setDate(editingTx.date);
      setMemo(editingTx.memo || '');
      setPaymentMethod(editingTx.payment_method || '카드');
      setSaveAsTemplate(false);
    } else if (duplicatingTx) {
      setType(duplicatingTx.type);
      setAmount(String(duplicatingTx.amount));
      setCategory(duplicatingTx.category);
      setUserName(duplicatingTx.user_name);
      setDate(getLocalDateStr());
      setMemo(duplicatingTx.memo || '');
      setPaymentMethod(duplicatingTx.payment_method || '카드');
      setSaveAsTemplate(false);
    } else {
      if (!userName && users.length > 0) {
        setUserName(users[0].name);
      }
      if (filteredCategories.length > 0 && !filteredCategories.some((c) => c.name === category)) {
        setCategory(filteredCategories[0].name);
      }
    }
  }, [editingTx, duplicatingTx, users, filteredCategories, userName, category]);

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextCats = categories.filter((c) => c.type === nextType);
    setCategory(nextCats[0]?.name || '');
  };

  const applyTemplateToForm = (tpl: RecurringTemplate) => {
    setType(tpl.type);
    setAmount(String(tpl.amount));
    setCategory(tpl.category);
    setUserName(tpl.user_name);
    setPaymentMethod(tpl.payment_method || '카드');
    setMemo(tpl.memo || tpl.title);
  };

  const addQuickAmount = (delta: number) => {
    const current = Number(amount) || 0;
    const next = Math.round((current + delta) * 100) / 100;
    setAmount(String(next));
  };

  const handleQuickAddCategory = async () => {
    const trimmed = quickCatName.trim();
    if (!trimmed) {
      alert('카테고리 이름을 입력하세요.');
      return;
    }
    try {
      setAddingCat(true);
      const res = await apiFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          type,
          color: quickCatColor,
          icon: quickCatIcon,
        }),
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (!data.success) {
        alert(data.error || '카테고리 추가에 실패했습니다.');
        return;
      }
      await onCategoryAdded();
      setCategory(trimmed);
      setQuickCatName('');
      setShowQuickCat(false);
    } catch {
      alert('카테고리 추가 중 오류가 발생했습니다.');
    } finally {
      setAddingCat(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert('올바른 금액을 입력하세요.');
      return;
    }
    if (!userName) {
      alert('작성자를 선택하세요. 가족 구성원이 없다면 먼저 설정에서 추가해 주세요.');
      return;
    }
    if (!category) {
      alert('카테고리를 선택하거나 새로 추가하세요.');
      return;
    }

    try {
      setSubmitting(true);
      const isEdit = Boolean(editingTx);
      const res = await apiFetch('/api/transactions', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingTx!.id } : {}),
          type,
          amount: numericAmount,
          category,
          user_name: userName,
          date,
          memo: memo.trim(),
          payment_method: paymentMethod,
        }),
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success) {
        if (!isEdit && saveAsTemplate) {
          const dayNum = Number(date.split('-')[2]) || 1;
          await apiFetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: templateTitle.trim() || memo.trim() || category,
              type,
              amount: numericAmount,
              category,
              user_name: userName,
              payment_method: paymentMethod,
              memo: memo.trim(),
              day_of_month: dayNum,
            }),
          });
        }

        if (!isEdit) {
          setAmount('');
          setMemo('');
          setDate(getLocalDateStr());
          setSaveAsTemplate(false);
          setTemplateTitle('');
        }
        onSaved();
      } else {
        alert(data.error || '저장에 실패했습니다.');
      }
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 정기 템플릿 빠른 불러오기 (신규 입력 시에만 표시) */}
      {!editingTx && templates.length > 0 && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Repeat size={13} className="text-indigo-500" />
            자주 쓰는 정기 내역 불러오기
          </div>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplateToForm(tpl)}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    tpl.type === 'expense' ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                />
                <span>{tpl.title}</span>
                <span className="text-slate-400 font-semibold">{formatAUD(tpl.amount)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 지출 / 수입 전환 */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => handleTypeChange('expense')}
          className={`py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
            type === 'expense'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
          }`}
        >
          지출 (-)
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
            type === 'income'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
          }`}
        >
          수입 (+)
        </button>
      </div>

      {/* 금액 입력 + 빠른 추가 버튼 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">금액</label>
          {amount && (
            <button
              type="button"
              onClick={() => setAmount('')}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              초기화
            </button>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-lg text-slate-400">A$</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full text-2xl font-extrabold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 pl-12 pr-14 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">AUD</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[5, 10, 20, 50, 100].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => addQuickAmount(v)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              +A${v}
            </button>
          ))}
        </div>
      </div>

      {/* 작성자 선택 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            작성자 (누가 사용했나요?)
          </label>
          <button
            type="button"
            onClick={onGoToSettings}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <UserPlus size={12} /> 가족 설정
          </button>
        </div>

        {users.length === 0 ? (
          <div className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
            등록된 가족 구성원이 없습니다.{' '}
            <button
              type="button"
              onClick={onGoToSettings}
              className="text-blue-600 dark:text-blue-400 font-bold underline cursor-pointer"
            >
              가족 구성원 추가하기
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {users.map((u) => {
              const active = userName === u.name;
              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => setUserName(u.name)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
                  <span>{u.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 카테고리 선택 + 인라인 추가 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">카테고리</label>
          <button
            type="button"
            onClick={() => setShowQuickCat((prev) => !prev)}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            {showQuickCat ? (
              <>
                <X size={12} /> 닫기
              </>
            ) : (
              <>
                <Plus size={12} /> 새 카테고리 추가
              </>
            )}
          </button>
        </div>

        {/* 인라인 빠른 카테고리 추가 박스 */}
        {showQuickCat && (
          <div className="mb-2.5 p-3 rounded-2xl bg-blue-50/70 dark:bg-slate-800/90 border border-blue-200 dark:border-slate-700 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              새 {type === 'expense' ? '지출' : '수입'} 카테고리 추가
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="예: 반려동물, 구독료, 부업"
                value={quickCatName}
                onChange={(e) => setQuickCatName(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                disabled={addingCat}
                onClick={handleQuickAddCategory}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <Check size={14} /> 추가
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {COLOR_PALETTE.slice(0, 8).map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setQuickCatColor(c.value)}
                  className={`w-5 h-5 rounded-full transition cursor-pointer ${
                    quickCatColor === c.value ? 'ring-2 ring-offset-2 ring-slate-700 dark:ring-white dark:ring-offset-slate-800 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {CATEGORY_ICON_OPTIONS.slice(0, 12).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setQuickCatIcon(opt.id)}
                  className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                    quickCatIcon === opt.id
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                  }`}
                  title={opt.label}
                >
                  <CategoryIcon name={opt.id} size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredCategories.length === 0 ? (
          <div className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
            카테고리가 없습니다. 위 &quot;새 카테고리 추가&quot;를 눌러 만들어 주세요.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            {filteredCategories.map((c) => {
              const active = category === c.name;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategory(c.name)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 truncate transition cursor-pointer ${
                    active
                      ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: c.color || '#64748b' }}
                  >
                    <CategoryIcon name={c.icon} size={12} />
                  </span>
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 결제 수단 & 날짜 (PC에서는 2컬럼 배치) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
            결제 수단
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PAYMENT_METHODS.map((method) => (
              <button
                type="button"
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  paymentMethod === method
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">내용 / 메모</label>
        <input
          type="text"
          placeholder="예: 마트 장보기, 주유, 외식"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 정기 템플릿으로도 저장 (신규 입력 시) */}
      {!editingTx && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>이 내역을 &quot;고정·정기 템플릿&quot;으로도 저장해 두기</span>
          </label>
          {saveAsTemplate && (
            <input
              type="text"
              placeholder="템플릿 이름 (예: 주간 정기청소 A거래처, 월세)"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl active:scale-[0.99] transition shadow-md disabled:opacity-60 cursor-pointer"
        >
          {submitting ? '저장 중...' : editingTx ? '수정 내용 저장' : '가계부에 저장하기'}
        </button>
      </div>
    </form>
  );
}
