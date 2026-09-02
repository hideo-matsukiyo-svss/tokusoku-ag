// ★モック（ダミー）の請求データ。実際のMFデータではありません。
// 将来ここを「MFから取得したデータ」に差し替えれば、AGはそのまま本番で動きます。
// いろんな督促段階・セグメントを試せるよう、わざと状況を散らしてあります。
// 日付は run.ts の「今日」を 2026-09-02 と仮定して作っています。

import type { Invoice } from '../logic/types.js';

export const MOCK_INVOICES: Invoice[] = [
  {
    // 優良（遅延ゼロの常連）× まだ期日前 → 予告リマインド
    invoiceNo: 'INV-2026-101',
    partnerName: 'サンプル商事株式会社',
    partnerEmail: 'keiri@sample-shoji.example.com',
    amount: 330000,
    dueDate: '2026-09-04',
    paid: false,
    history: { pastInvoices: 12, lateCount: 0 },
  },
  {
    // 通常 × 超過+5日 → 1回目督促
    invoiceNo: 'INV-2026-102',
    partnerName: '合同会社ミドリ制作所',
    partnerEmail: 'accounts@midori.example.com',
    amount: 165000,
    dueDate: '2026-08-28',
    paid: false,
    history: { pastInvoices: 4, lateCount: 1 },
  },
  {
    // 要注意（遅延常習）× 超過+13日 → 2回目督促（要承認）
    invoiceNo: 'INV-2026-103',
    partnerName: '株式会社おくれがち工業',
    partnerEmail: 'shiharai@okuregachi.example.com',
    amount: 550000,
    dueDate: '2026-08-20',
    paid: false,
    history: { pastInvoices: 8, lateCount: 4 },
  },
  {
    // 通常 × 超過+25日 → 最終督促（代表名・要承認）
    invoiceNo: 'INV-2026-104',
    partnerName: 'テスト物産株式会社',
    partnerEmail: 'keiri@test-bussan.example.com',
    amount: 880000,
    dueDate: '2026-08-08',
    paid: false,
    history: { pastInvoices: 6, lateCount: 2 },
  },
  {
    // 入金済み → 対象外（スキップされることの確認用）
    invoiceNo: 'INV-2026-105',
    partnerName: '株式会社きちんとペイ',
    partnerEmail: 'keiri@kichinto.example.com',
    amount: 220000,
    dueDate: '2026-08-25',
    paid: true,
    history: { pastInvoices: 20, lateCount: 0 },
  },
  {
    // まだ期日まで日がある → 何もしない（対象外）
    invoiceNo: 'INV-2026-106',
    partnerName: '初回取引株式会社',
    partnerEmail: 'info@shokai.example.com',
    amount: 132000,
    dueDate: '2026-09-30',
    paid: false,
    history: { pastInvoices: 0, lateCount: 0 },
  },
];
