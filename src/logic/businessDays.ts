// 営業日の計算（純ロジック・AI不要）。土日と会社休業日を除いて数えます。

/** "YYYY-MM-DD" 形式に整える */
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 土日か */
export function isWeekend(d: Date): boolean {
  const g = d.getDay(); // 0=日, 6=土
  return g === 0 || g === 6;
}

/** 営業日か（土日でも祝日でもない） */
export function isBusinessDay(d: Date, holidays: Set<string>): boolean {
  return !isWeekend(d) && !holidays.has(ymd(d));
}

/**
 * その月の「第何営業日か」を返す（today を含めて月初から数える）。
 * today 自身が営業日でなければ todayIsBusinessDay=false。
 */
export function businessDayOfMonth(
  today: string,
  holidays: Set<string>,
): { businessDay: number; todayIsBusinessDay: boolean } {
  const t = new Date(today + 'T00:00:00');
  const year = t.getFullYear();
  const mon = t.getMonth();
  const lastDate = t.getDate();

  let count = 0;
  let todayIsBusinessDay = false;

  for (let day = 1; day <= lastDate; day++) {
    const d = new Date(year, mon, day);
    if (isBusinessDay(d, holidays)) {
      count++;
      if (day === lastDate) todayIsBusinessDay = true;
    }
  }
  return { businessDay: count, todayIsBusinessDay };
}
