'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  PieChart,
  ListOrdered,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Plus,
  QrCode,
} from 'lucide-react';
import type { Category, SummaryData, TabType, Transaction, User } from '@/types/budget';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ConnectModal } from '@/components/ConnectModal';
import { DashboardView } from '@/components/DashboardView';
import { TransactionsView } from '@/components/TransactionsView';
import { TransactionForm } from '@/components/TransactionForm';
import { StatsView } from '@/components/StatsView';
import { SettingsView } from '@/components/SettingsView';

export default function BudgetApp() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [tab, setTab] = useState<TabType>('dashboard');
  const [previousTab, setPreviousTab] = useState<TabType>('dashboard');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const [summary, setSummary] = useState<SummaryData>({
    month: '',
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    budgetAmount: 0,
    categoryExpenses: [],
    categoryIncomes: [],
    userExpenses: [],
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const userQuery = encodeURIComponent(selectedUser);
      const [sumRes, txRes, userRes, catRes] = await Promise.all([
        fetch(`/api/summary?month=${monthStr}&user=${userQuery}`).then((r) => r.json()),
        fetch(`/api/transactions?month=${monthStr}&user=${userQuery}`).then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (txRes.success) setTransactions(txRes.data);
      if (userRes.success) {
        setUsers(userRes.data);
        // 선택되어 있던 구성원이 삭제되거나 이름이 바뀐 경우 전체 보기로 안전하게 복귀
        if (
          selectedUser !== 'all' &&
          !userRes.data.some((u: User) => u.name === selectedUser)
        ) {
          setSelectedUser('all');
        }
      }
      if (catRes.success) setCategories(catRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [monthStr, selectedUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changeMonth = (offset: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + offset);
      return d;
    });
  };

  const openAddTab = (tx: Transaction | null = null) => {
    setPreviousTab(tab === 'add' ? 'dashboard' : tab);
    setEditingTx(tx);
    setTab('add');
  };

  const handleSaved = () => {
    setEditingTx(null);
    setTab(previousTab === 'add' ? 'dashboard' : previousTab);
    fetchData();
  };

  const handleDeleteTx = async (id: number) => {
    if (!confirm('이 내역을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '대시보드', icon: <Wallet size={19} /> },
    { id: 'list', label: '내역목록', icon: <ListOrdered size={19} /> },
    { id: 'stats', label: '통계분석', icon: <PieChart size={19} /> },
    { id: 'settings', label: '가족·카테고리 설정', icon: <SlidersHorizontal size={19} /> },
  ];

  const pageTitleMap: Record<TabType, string> = {
    dashboard: '대시보드',
    list: '거래 내역',
    add: editingTx ? '내역 수정' : '새 내역 입력',
    stats: '통계 분석',
    settings: '가족 · 카테고리 설정',
  };

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* PC 좌측 사이드바 */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 flex-col sticky top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-5 shrink-0">
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              우리집 가계부
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">스마트 가족 재정 관리</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openAddTab(null)}
          className="w-full mb-5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-[0.98] transition cursor-pointer"
        >
          <Plus size={18} />
          <span>새 내역 입력</span>
        </button>

        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setEditingTx(null);
                  setTab(item.id);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setConnectOpen(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-bold transition cursor-pointer"
          >
            <QrCode size={18} />
            <span>기기 연결 · QR 코드</span>
          </button>
          <ThemeToggle />
          <div className="text-[11px] text-center text-slate-400 dark:text-slate-600 pt-1">
            PC · 모바일 반응형 지원
          </div>
        </div>
      </aside>

      {/* 우측 메인 컨테이너 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 lg:px-8 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            {/* 좌측: 월 이동 + 현재 화면명(PC) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition text-slate-600 dark:text-slate-300 cursor-pointer"
                  aria-label="이전 달"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  title="이번 달로 이동"
                  className="font-extrabold text-sm lg:text-base px-2 text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition text-slate-600 dark:text-slate-300 cursor-pointer"
                  aria-label="다음 달"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <span className="hidden xl:inline-block text-sm font-bold text-slate-400 dark:text-slate-500">
                / {pageTitleMap[tab]}
              </span>
            </div>

            {/* 우측: PC 구성원 칩 필터 / 모바일 다크모드 + 드롭다운 */}
            <div className="flex items-center gap-2">
              {/* PC 구성원 칩 필터 */}
              <div className="hidden lg:flex items-center gap-1.5 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedUser('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedUser === 'all'
                      ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  전체 가족
                </button>
                {users.map((u) => {
                  const active = selectedUser === u.name;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUser(u.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        active
                          ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} />
                      {u.name}
                    </button>
                  );
                })}
              </div>

              {/* 모바일 기기연결 + 다크모드 토글 + 구성원 필터 */}
              <div className="flex lg:hidden items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConnectOpen(true)}
                  aria-label="다른 기기 연결 QR 코드"
                  title="다른 기기 연결 QR 코드"
                  className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer"
                >
                  <QrCode size={18} />
                </button>
                <ThemeToggle compact />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  aria-label="가족 구성원 필터"
                  className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold px-2.5 py-2 rounded-xl border border-transparent focus:border-blue-400 outline-none"
                >
                  <option value="all">전체 가족</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* 본문 콘텐츠 */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-10">
          <div className="max-w-6xl mx-auto">
            {loading && transactions.length === 0 && users.length === 0 ? (
              <div className="py-20 text-center text-sm text-slate-400">데이터를 불러오는 중...</div>
            ) : (
              <>
                {tab === 'dashboard' && (
                  <DashboardView
                    summary={summary}
                    transactions={transactions}
                    users={users}
                    categories={categories}
                    selectedUser={selectedUser}
                    onOpenAdd={() => openAddTab(null)}
                    onViewAll={() => setTab('list')}
                    onEditTx={(tx) => openAddTab(tx)}
                  />
                )}

                {tab === 'list' && (
                  <TransactionsView
                    transactions={transactions}
                    users={users}
                    categories={categories}
                    onEdit={(tx) => openAddTab(tx)}
                    onDelete={handleDeleteTx}
                    onOpenAdd={() => openAddTab(null)}
                  />
                )}

                {tab === 'add' && (
                  <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-5 lg:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {editingTx ? '거래 내역 수정' : '새 내역 등록'}
                      </h2>
                      <span className="text-xs text-slate-400">
                        카테고리도 바로 추가할 수 있어요
                      </span>
                    </div>
                    <TransactionForm
                      users={users}
                      categories={categories}
                      editingTx={editingTx}
                      onSaved={handleSaved}
                      onCancel={() => {
                        setEditingTx(null);
                        setTab(previousTab === 'add' ? 'dashboard' : previousTab);
                      }}
                      onGoToSettings={() => {
                        setEditingTx(null);
                        setTab('settings');
                      }}
                      onCategoryAdded={fetchData}
                    />
                  </div>
                )}

                {tab === 'stats' && (
                  <StatsView summary={summary} users={users} categories={categories} />
                )}

                {tab === 'settings' && (
                  <SettingsView users={users} categories={categories} onRefresh={fetchData} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* 모바일 전용 하단 네비게이션 바 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-2 flex justify-around items-center z-40">
        <button
          type="button"
          onClick={() => {
            setEditingTx(null);
            setTab('dashboard');
          }}
          className={`flex flex-col items-center gap-1 p-1.5 transition cursor-pointer ${
            tab === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <Wallet size={20} />
          <span className="text-[10px]">대시보드</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingTx(null);
            setTab('list');
          }}
          className={`flex flex-col items-center gap-1 p-1.5 transition cursor-pointer ${
            tab === 'list'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <ListOrdered size={20} />
          <span className="text-[10px]">내역목록</span>
        </button>

        <button
          type="button"
          onClick={() => openAddTab(null)}
          className="flex flex-col items-center -mt-5 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 active:scale-90 transition">
            <PlusCircle size={26} />
          </div>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">입력</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingTx(null);
            setTab('stats');
          }}
          className={`flex flex-col items-center gap-1 p-1.5 transition cursor-pointer ${
            tab === 'stats'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <PieChart size={20} />
          <span className="text-[10px]">통계분석</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingTx(null);
            setTab('settings');
          }}
          className={`flex flex-col items-center gap-1 p-1.5 transition cursor-pointer ${
            tab === 'settings'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <SlidersHorizontal size={20} />
          <span className="text-[10px]">설정</span>
        </button>
      </nav>

      {/* 기기 간편 연결 모달 */}
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </div>
  );
}
