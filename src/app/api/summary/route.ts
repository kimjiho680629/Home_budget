import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getLocalMonthStr, getRecentMonthKeys, isValidMonthStr } from '@/lib/date';

// 월별 요약, 최근 6개월 추이 및 통계 조회 (선택적 구성원 필터 지원)
export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const requestedMonth = searchParams.get('month') || getLocalMonthStr();
    if (!isValidMonthStr(requestedMonth)) {
      return NextResponse.json({ success: false, error: '올바른 월 형식(YYYY-MM)이 아닙니다.' }, { status: 400 });
    }
    const month = requestedMonth;
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

    // 최근 6개월 수입/지출 추이
    const trendMonths = getRecentMonthKeys(month, 6);
    const firstTrendMonth = trendMonths[0];
    const trendParams: string[] = hasUserFilter
      ? [firstTrendMonth, month, user as string]
      : [firstTrendMonth, month];

    const trendRows = db
      .prepare(`
        SELECT strftime('%Y-%m', date) as ym,
               COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
               COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense
        FROM transactions
        WHERE strftime('%Y-%m', date) >= ? AND strftime('%Y-%m', date) <= ?${userClause}
        GROUP BY ym
      `)
      .all(...trendParams) as { ym: string; totalIncome: number; totalExpense: number }[];

    const trendMap = new Map(trendRows.map((r) => [r.ym, r]));
    const monthlyTrend = trendMonths.map((ym) => {
      const hit = trendMap.get(ym);
      const inc = hit ? hit.totalIncome : 0;
      const exp = hit ? hit.totalExpense : 0;
      return {
        month: ym,
        totalIncome: inc,
        totalExpense: exp,
        balance: inc - exp,
      };
    });

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
        monthlyTrend,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
