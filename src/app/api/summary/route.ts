import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// 월별 요약 및 통계 조회 (선택적 구성원 필터 지원)
export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month') || currentMonthStr;
    const user = searchParams.get('user');

    const hasUserFilter = Boolean(user && user !== 'all');
    const userClause = hasUserFilter ? ' AND user_name = ?' : '';
    const baseParams: string[] = hasUserFilter ? [month, user as string] : [month];

    const totalIncomeRow = db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'income' AND strftime('%Y-%m', date) = ?${userClause}
      `)
      .get(...baseParams) as { total: number };

    const totalExpenseRow = db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'expense' AND strftime('%Y-%m', date) = ?${userClause}
      `)
      .get(...baseParams) as { total: number };

    const totalIncome = totalIncomeRow ? totalIncomeRow.total : 0;
    const totalExpense = totalExpenseRow ? totalExpenseRow.total : 0;
    const balance = totalIncome - totalExpense;

    // 카테고리별 지출 통계
    const categoryExpenses = db
      .prepare(`
        SELECT category, SUM(amount) as total
        FROM transactions
        WHERE type = 'expense' AND strftime('%Y-%m', date) = ?${userClause}
        GROUP BY category
        ORDER BY total DESC
      `)
      .all(...baseParams);

    // 카테고리별 수입 통계
    const categoryIncomes = db
      .prepare(`
        SELECT category, SUM(amount) as total
        FROM transactions
        WHERE type = 'income' AND strftime('%Y-%m', date) = ?${userClause}
        GROUP BY category
        ORDER BY total DESC
      `)
      .all(...baseParams);

    // 가족 구성원별 지출 통계 (전체 가족 비교용으로 항상 해당 월 전체 기준 조회)
    const userExpenses = db
      .prepare(`
        SELECT user_name, SUM(amount) as total
        FROM transactions
        WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
        GROUP BY user_name
        ORDER BY total DESC
      `)
      .all(month);

    const budgetRow = db
      .prepare('SELECT amount FROM budgets WHERE month = ?')
      .get(month) as { amount: number } | undefined;
    const budgetAmount = budgetRow ? budgetRow.amount : 0;

    return NextResponse.json({
      success: true,
      data: {
        month,
        totalIncome,
        totalExpense,
        balance,
        budgetAmount,
        categoryExpenses,
        categoryIncomes,
        userExpenses,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
