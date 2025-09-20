import { format, subDays } from 'date-fns';

/**
 * 日付範囲の生成
 */
export const getDateRange = (daysBack: number = 1) => {
  const to = new Date();
  const from = subDays(to, daysBack);
  
  return {
    from: format(from, 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd'),
    fromISO: from.toISOString(),
    toISO: to.toISOString(),
  };
};

/**
 * NYT用の日付フォーマット（YYYYMMDD）
 */
export const formatNYTDate = (date: Date): string => 
  format(date, 'yyyyMMdd');