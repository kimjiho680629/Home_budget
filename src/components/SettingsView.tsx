'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Check, X, Plus, Users, Tag, Lock, LogOut } from 'lucide-react';
import type { Category, TransactionType, User } from '@/types/budget';
import { CATEGORY_ICON_OPTIONS, COLOR_PALETTE } from '@/lib/constants';
import { CategoryIcon } from './CategoryIcon';

interface SettingsViewProps {
  users: User[];
  categories: Category[];
  envManagedAuth?: boolean;
  onRefresh: () => Promise<void>;
  onLogout: () => Promise<void>;
}

// 가족 구성원 및 카테고리 직접 관리 화면 (PC 2컬럼 / 모바일 1컬럼·서브탭)
export function SettingsView({
  users,
  categories,
  envManagedAuth = false,
  onRefresh,
  onLogout,
}: SettingsViewProps) {
  const [mobileSection, setMobileSection] = useState<'family' | 'category' | 'security'>('family');

  // --- 비밀번호 변경 상태 ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // --- 가족 구성원 추가 상태 ---
  const [newUserName, setNewUserName] = useState('');
  const [newUserColor, setNewUserColor] = useState(COLOR_PALETTE[0].value);
  const [addingUser, setAddingUser] = useState(false);

  // --- 가족 구성원 수정 상태 ---
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserColor, setEditUserColor] = useState(COLOR_PALETTE[0].value);

  // --- 카테고리 추가 상태 ---
  const [catTab, setCatTab] = useState<TransactionType>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE[4].value);
  const [newCatIcon, setNewCatIcon] = useState('tag');
  const [addingCat, setAddingCat] = useState(false);

  // --- 카테고리 수정 상태 ---
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState(COLOR_PALETTE[0].value);
  const [editCatIcon, setEditCatIcon] = useState('tag');

  // 가족 추가
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUserName.trim();
    if (!trimmed) return;
    try {
      setAddingUser(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, color: newUserColor }),
      });
      const data = await res.json();
      if (data.success) {
        setNewUserName('');
        await onRefresh();
      } else {
        alert(data.error || '추가에 실패했습니다.');
      }
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setAddingUser(false);
    }
  };

  // 가족 수정 시작
  const startEditUser = (u: User) => {
    setEditingUserId(u.id);
    setEditUserName(u.name);
    setEditUserColor(u.color);
  };

  // 가족 수정 저장
  const handleSaveUser = async (id: number) => {
    const trimmed = editUserName.trim();
    if (!trimmed) {
      alert('이름을 입력하세요.');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: trimmed, color: editUserColor }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingUserId(null);
        await onRefresh();
      } else {
        alert(data.error || '수정에 실패했습니다.');
      }
    } catch {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  // 가족 삭제
  const handleDeleteUser = async (u: User) => {
    const countMsg =
      u.tx_count && u.tx_count > 0
        ? `'${u.name}' 구성원에는 ${u.tx_count}건의 거래 내역이 있습니다.\n구성원 목록에서 삭제할까요? (기존 거래 기록 자체는 유지됩니다)`
        : `'${u.name}' 구성원을 삭제하시겠습니까?`;
    if (!confirm(countMsg)) return;

    try {
      const res = await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await onRefresh();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 카테고리 추가
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    try {
      setAddingCat(true);
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          type: catTab,
          color: newCatColor,
          icon: newCatIcon,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCatName('');
        await onRefresh();
      } else {
        alert(data.error || '카테고리 추가에 실패했습니다.');
      }
    } catch {
      alert('카테고리 추가 중 오류가 발생했습니다.');
    } finally {
      setAddingCat(false);
    }
  };

  // 카테고리 수정 시작
  const startEditCategory = (c: Category) => {
    setEditingCatId(c.id);
    setEditCatName(c.name);
    setEditCatColor(c.color || '#64748b');
    setEditCatIcon(c.icon || 'tag');
  };

  // 카테고리 수정 저장
  const handleSaveCategory = async (id: number) => {
    const trimmed = editCatName.trim();
    if (!trimmed) {
      alert('카테고리 이름을 입력하세요.');
      return;
    }
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: trimmed,
          color: editCatColor,
          icon: editCatIcon,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingCatId(null);
        await onRefresh();
      } else {
        alert(data.error || '수정에 실패했습니다.');
      }
    } catch {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (c: Category) => {
    const countMsg =
      c.tx_count && c.tx_count > 0
        ? `'${c.name}' 카테고리에 ${c.tx_count}건의 내역이 있습니다.\n카테고리를 삭제할까요? (기존 내역의 카테고리명 텍스트는 유지됩니다)`
        : `'${c.name}' 카테고리를 삭제하시겠습니까?`;
    if (!confirm(countMsg)) return;

    try {
      const res = await fetch(`/api/categories?id=${c.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await onRefresh();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const visibleCategories = categories.filter((c) => c.type === catTab);

  // 비밀번호 변경
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'err', text: '현재 비밀번호와 새 비밀번호를 입력하세요.' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg({ type: 'err', text: '새 비밀번호는 최소 4자 이상이어야 합니다.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: '새 비밀번호 확인이 일치하지 않습니다.' });
      return;
    }
    try {
      setChangingPassword(true);
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordMsg({ type: 'ok', text: data.message || '비밀번호가 변경되었습니다.' });
      } else {
        setPasswordMsg({ type: 'err', text: data.error || '비밀번호 변경에 실패했습니다.' });
      }
    } catch {
      setPasswordMsg({ type: 'err', text: '비밀번호 변경 중 오류가 발생했습니다.' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 모바일 전용 서브 탭 전환 */}
      <div className="lg:hidden grid grid-cols-3 gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setMobileSection('family')}
          className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
            mobileSection === 'family'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Users size={14} /> 구성원
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('category')}
          className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
            mobileSection === 'category'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Tag size={14} /> 카테고리
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('security')}
          className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
            mobileSection === 'security'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Lock size={14} /> 비밀번호
        </button>
      </div>

      {/* PC 2컬럼 / 모바일 조건부 표시 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* 1. 가족 구성원 관리 패널 */}
        <section
          className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 ${
            mobileSection === 'family' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              가족 구성원 직접 설정
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              구성원 이름과 색상을 자유롭게 추가·수정·삭제할 수 있습니다. 이름을 수정하면 기존 내역에도 반영됩니다.
            </p>
          </div>

          {/* 구성원 목록 */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            {users.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                등록된 구성원이 없습니다. 아래에서 새 가족 구성원을 추가해 주세요.
              </div>
            ) : (
              users.map((u) => {
                const isEditing = editingUserId === u.id;
                return (
                  <div key={u.id} className="p-3 bg-white dark:bg-slate-900">
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editUserName}
                            onChange={(e) => setEditUserName(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="구성원 이름"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveUser(u.id)}
                            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                            title="저장"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                            title="취소"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {COLOR_PALETTE.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditUserColor(c.value)}
                              className={`w-6 h-6 rounded-full transition cursor-pointer ${
                                editUserColor === c.value
                                  ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white dark:ring-offset-slate-900 scale-110'
                                  : ''
                              }`}
                              style={{ backgroundColor: c.value }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                            style={{ backgroundColor: u.color }}
                          >
                            {u.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                              {u.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              등록 내역 {u.tx_count ?? 0}건
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditUser(u)}
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                            title="수정"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 새 구성원 추가 폼 */}
          <form
            onSubmit={handleAddUser}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
          >
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">새 구성원 추가</div>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                style={{ backgroundColor: newUserColor }}
              >
                {newUserName.trim() ? newUserName.trim().slice(0, 1) : '?'}
              </div>
              <input
                type="text"
                placeholder="예: 첫째, 남편, 아내, 생활비"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                disabled={addingUser}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1 transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Plus size={16} /> 추가
              </button>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">프로필 색상</div>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewUserColor(c.value)}
                    className={`w-6 h-6 rounded-full transition cursor-pointer ${
                      newUserColor === c.value
                        ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white dark:ring-offset-slate-800 scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </form>
        </section>

        {/* 2. 카테고리 직접 관리 패널 */}
        <section
          className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 ${
            mobileSection === 'category' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag size={18} className="text-indigo-500" />
              카테고리 직접 설정
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              우리 집에 맞는 지출/수입 카테고리를 직접 추가하고 아이콘과 색상을 설정하세요.
            </p>
          </div>

          {/* 지출 / 수입 전환 */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setCatTab('expense');
                setEditingCatId(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                catTab === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              지출 카테고리 ({categories.filter((c) => c.type === 'expense').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setCatTab('income');
                setEditingCatId(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                catTab === 'income'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              수입 카테고리 ({categories.filter((c) => c.type === 'income').length})
            </button>
          </div>

          {/* 카테고리 목록 */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl max-h-80 overflow-y-auto">
            {visibleCategories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                등록된 {catTab === 'expense' ? '지출' : '수입'} 카테고리가 없습니다.
              </div>
            ) : (
              visibleCategories.map((c) => {
                const isEditing = editingCatId === c.id;
                return (
                  <div key={c.id} className="p-3 bg-white dark:bg-slate-900">
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategory(c.id)}
                            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                            title="저장"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                            title="취소"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {COLOR_PALETTE.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setEditCatColor(p.value)}
                              className={`w-5 h-5 rounded-full cursor-pointer ${
                                editCatColor === p.value
                                  ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white dark:ring-offset-slate-900 scale-110'
                                  : ''
                              }`}
                              style={{ backgroundColor: p.value }}
                              title={p.name}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {CATEGORY_ICON_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setEditCatIcon(opt.id)}
                              className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                                editCatIcon === opt.id
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                              title={opt.label}
                            >
                              <CategoryIcon name={opt.id} size={14} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: c.color || '#64748b' }}
                          >
                            <CategoryIcon name={c.icon} size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              사용 {c.tx_count ?? 0}건
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditCategory(c)}
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                            title="수정"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 새 카테고리 추가 폼 */}
          <form
            onSubmit={handleAddCategory}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
          >
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              새 {catTab === 'expense' ? '지출' : '수입'} 카테고리 추가
            </div>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: newCatColor }}
              >
                <CategoryIcon name={newCatIcon} size={18} />
              </div>
              <input
                type="text"
                placeholder={catTab === 'expense' ? '예: 반려동물, 구독서비스, 경조사' : '예: 에어비앤비 청소, 유리창 청소, 팁/보너스'}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                disabled={addingCat}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1 transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Plus size={16} /> 추가
              </button>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">색상</div>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setNewCatColor(p.value)}
                    className={`w-6 h-6 rounded-full transition cursor-pointer ${
                      newCatColor === p.value
                        ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white dark:ring-offset-slate-800 scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: p.value }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">아이콘</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewCatIcon(opt.id)}
                    className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                      newCatIcon === opt.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={opt.label}
                  >
                    <CategoryIcon name={opt.id} size={15} />
                  </button>
                ))}
              </div>
            </div>
          </form>
        </section>
      </div>

      {/* 3. 보안 · 로그인 비밀번호 관리 패널 */}
      <section
        className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 ${
          mobileSection === 'security' ? 'block' : 'hidden lg:block'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock size={18} className="text-emerald-500" />
              로그인 비밀번호 · 잠금 설정
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              외부 접속 보안을 위해 로그인 비밀번호를 변경하거나 현재 브라우저를 잠글 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer shrink-0"
          >
            <LogOut size={15} />
            <span>로그아웃 (잠금)</span>
          </button>
        </div>

        {envManagedAuth ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
            현재 <code className="font-mono font-bold">.env.local</code>의{' '}
            <code className="font-mono font-bold">APP_PASSWORD</code> 환경 변수로 비밀번호가 관리되고 있습니다.
            비밀번호를 바꾸려면 <code className="font-mono">.env.local</code>을 수정한 뒤 서버를 재시작하세요.
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호"
                autoComplete="current-password"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                새 비밀번호 (4자 이상)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호"
                autoComplete="new-password"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 확인"
                autoComplete="new-password"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition disabled:opacity-50 cursor-pointer h-[38px]"
            >
              {changingPassword ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}

        {passwordMsg && (
          <div
            className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl border ${
              passwordMsg.type === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60'
            }`}
          >
            {passwordMsg.text}
          </div>
        )}
      </section>
    </div>
  );
}
