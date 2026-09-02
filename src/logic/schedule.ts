// ★Step3 の肝：営業日ベースの督促タイミング判定（ルールで確定）。
// 図の「1営業日 正午＝初回」「2〜5営業日 毎日＝リマインド」「5営業日終了＝確定」に対応。
// ここの営業日の区切りを変えたいときは THRESHOLD をいじればOK。

import { businessDayOfMonth } from './businessDays.js';
import { COMPANY_HOLIDAYS } from '../config/holidays.js';

export type ContactStage = '初回' | 'リマインド' | '締め' | '対象外日';

export type RunSchedule = {
  businessDay: number;        // 今日は今月の第何営業日か
  todayIsBusinessDay: boolean;
  stage: ContactStage;        // 今日やること
  note: string;               // 説明
};

// 何営業日目で何をするか
export const SCHEDULE_THRESHOLD = {
  firstDay: 1,       // 第1営業日 → 初回連絡
  remindFrom: 2,     // 第2営業日から
  remindTo: 5,       // 第5営業日まで リマインド
  // 第5営業日を過ぎたら「締め」（最終ステータス確定、督促は止める）
};

/** 今日の督促ステージを決める */
export function decideSchedule(today: string): RunSchedule {
  const holidays = new Set(COMPANY_HOLIDAYS);
  const { businessDay, todayIsBusinessDay } = businessDayOfMonth(today, holidays);
  const t = SCHEDULE_THRESHOLD;

  let stage: ContactStage;
  let note: string;

  if (!todayIsBusinessDay) {
    stage = '対象外日';
    note = '今日は営業日ではないため連絡しない';
  } else if (businessDay === t.firstDay) {
    stage = '初回';
    note = '第1営業日：初回連絡（本日までに送付できそうか＋請求書作成代行の要否を確認）';
  } else if (businessDay >= t.remindFrom && businessDay <= t.remindTo) {
    stage = 'リマインド';
    note = `第${businessDay}営業日：未提出者へリマインド`;
  } else {
    stage = '締め';
    note = `第${businessDay}営業日：第${t.remindTo}営業日を過ぎたため督促は締め。最終ステータスを確定`;
  }

  return { businessDay, todayIsBusinessDay, stage, note };
}
