// ★モック（ダミー）の稼働者リスト＝Silver(マスタ層) 相当。実データではありません。
// 将来ここを「Notion の稼働者リストから取得したデータ」に差し替えれば、AGはそのまま動きます。
// いろんな状況（未提出・提出済み・対象外・未稼働）を試せるよう、わざと散らしてあります。

import type { Worker } from '../logic/types.js';

export const MOCK_WORKERS: Worker[] = [
  {
    // 今月稼働あり × まだ提出なし → 未提出（督促対象）
    id: 'w001',
    name: '田中 太郎',
    email: 'tanaka@example.com',
    workedThisMonth: true,
    excluded: false,
    lastContactedAt: undefined,
  },
  {
    // 今月稼働あり × 提出済み（submissions.mockに一致あり）→ 提出済み
    id: 'w002',
    name: '佐藤 花子',
    email: 'sato.hanako@example.com',
    workedThisMonth: true,
    excluded: false,
    lastContactedAt: undefined,
  },
  {
    // 今月稼働あり × 未提出 × 既に1回連絡済み → 未提出（2回目以降のリマインド対象）
    id: 'w003',
    name: '鈴木 一郎',
    email: 'suzuki@example.com',
    workedThisMonth: true,
    excluded: false,
    lastContactedAt: '2026-09-01',
  },
  {
    // 対象外フラグ（今月は請求不要）→ 対象外
    id: 'w004',
    name: '高橋 みどり',
    email: 'takahashi@example.com',
    workedThisMonth: true,
    excluded: true,
    excludedReason: '今月は稼働分を来月まとめて請求予定',
    lastContactedAt: undefined,
  },
  {
    // 今月は稼働なし → 対象外（請求書を出す必要がない）
    id: 'w005',
    name: '伊藤 健',
    email: 'ito.ken@example.com',
    workedThisMonth: false,
    excluded: false,
    lastContactedAt: undefined,
  },
  {
    // 今月稼働あり × 提出済み（別名で一致）→ 提出済み
    id: 'w006',
    name: '渡辺 陽子',
    email: 'watanabe.yoko@example.com',
    workedThisMonth: true,
    excluded: false,
    lastContactedAt: undefined,
  },
];
