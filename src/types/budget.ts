// 가계부 애플리케이션 공통 타입 정의

export type TransactionType = 'expense' | 'income';

export type TabType = 'dashboard' | 'list' | 'add' | 'stats' | 'settings';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category: string;
  user_name: string;
  date: string; // 'YYYY-MM-DD'
  memo: string;
  payment_method: string;
  created_at?: string;
}

export interface CategoryAmount {
  category: string;
  total: number;
}

export interface UserAmount {
  user_name: string;
  total: number;
}

export interface MonthlyTrendPoint {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface SummaryData {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  budgetAmount: number;
  categoryExpenses: CategoryAmount[];
  categoryIncomes: CategoryAmount[];
  userExpenses: UserAmount[];
  monthlyTrend: MonthlyTrendPoint[];
}

export interface RecurringTemplate {
  id: number;
  title: string;
  type: TransactionType;
  amount: number;
  category: string;
  user_name: string;
  payment_method: string;
  memo: string;
  day_of_month: number;
  created_at?: string;
}

export interface User {
  id: number;
  name: string;
  color: string;
  created_at?: string;
  tx_count?: number;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  tx_count?: number;
}
