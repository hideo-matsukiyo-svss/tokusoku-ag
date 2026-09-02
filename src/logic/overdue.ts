// 期日超過の判定と、「今この請求はどの督促段階か」を決める純ロジック。
// AI（LLM）は一切使いません。ここは機械判定なので、いつ動かしても同じ答えになります。

import type { Invoice, LadderStage } from './types.js';
import { LADDER_THRESHOLDS } from './ladder.js';

/** 2つの日付の差を「日数」で返す（today - dueDate）。プラスなら超過。 */
export function overdueDays(dueDate: string, today: Date): number {
  const due = new Date(dueDate + 'T00:00:00');
  const base = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const ms = base.getTime() - due.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * この請求書が「今日、督促対象か」を判定し、該当する段階を返す。
 * 対象外なら null。
 */
export function decideStage(invoice: Invoice, today: Date): LadderStage | null {
  if (invoice.paid) return null; // 入金済みは対象外

  const days = overdueDays(invoice.dueDate, today);
  const t = LADDER_THRESHOLDS;

  // 超過が大きい順にチェック（最終 → 2回目 → 1回目 → 予告）
  if (days >= t.finalAfterDays) return 'final';
  if (days >= t.secondAfterDays) return 'second';
  if (days >= t.firstAfterDays) return 'first';
  if (days >= -t.preReminderDaysBefore && days < 0) return 'pre'; // 期日の少し前
  return null; // まだ何もしない
}
