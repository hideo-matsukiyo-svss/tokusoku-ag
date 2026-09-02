const MOCK_INVOICES = [
  {
    // 優良（遅延ゼロの常連）× まだ期日前 → 予告リマインド
    invoiceNo: "INV-2026-101",
    partnerName: "\u30B5\u30F3\u30D7\u30EB\u5546\u4E8B\u682A\u5F0F\u4F1A\u793E",
    partnerEmail: "keiri@sample-shoji.example.com",
    amount: 33e4,
    dueDate: "2026-09-04",
    paid: false,
    history: { pastInvoices: 12, lateCount: 0 }
  },
  {
    // 通常 × 超過+5日 → 1回目督促
    invoiceNo: "INV-2026-102",
    partnerName: "\u5408\u540C\u4F1A\u793E\u30DF\u30C9\u30EA\u5236\u4F5C\u6240",
    partnerEmail: "accounts@midori.example.com",
    amount: 165e3,
    dueDate: "2026-08-28",
    paid: false,
    history: { pastInvoices: 4, lateCount: 1 }
  },
  {
    // 要注意（遅延常習）× 超過+13日 → 2回目督促（要承認）
    invoiceNo: "INV-2026-103",
    partnerName: "\u682A\u5F0F\u4F1A\u793E\u304A\u304F\u308C\u304C\u3061\u5DE5\u696D",
    partnerEmail: "shiharai@okuregachi.example.com",
    amount: 55e4,
    dueDate: "2026-08-20",
    paid: false,
    history: { pastInvoices: 8, lateCount: 4 }
  },
  {
    // 通常 × 超過+25日 → 最終督促（代表名・要承認）
    invoiceNo: "INV-2026-104",
    partnerName: "\u30C6\u30B9\u30C8\u7269\u7523\u682A\u5F0F\u4F1A\u793E",
    partnerEmail: "keiri@test-bussan.example.com",
    amount: 88e4,
    dueDate: "2026-08-08",
    paid: false,
    history: { pastInvoices: 6, lateCount: 2 }
  },
  {
    // 入金済み → 対象外（スキップされることの確認用）
    invoiceNo: "INV-2026-105",
    partnerName: "\u682A\u5F0F\u4F1A\u793E\u304D\u3061\u3093\u3068\u30DA\u30A4",
    partnerEmail: "keiri@kichinto.example.com",
    amount: 22e4,
    dueDate: "2026-08-25",
    paid: true,
    history: { pastInvoices: 20, lateCount: 0 }
  },
  {
    // まだ期日まで日がある → 何もしない（対象外）
    invoiceNo: "INV-2026-106",
    partnerName: "\u521D\u56DE\u53D6\u5F15\u682A\u5F0F\u4F1A\u793E",
    partnerEmail: "info@shokai.example.com",
    amount: 132e3,
    dueDate: "2026-09-30",
    paid: false,
    history: { pastInvoices: 0, lateCount: 0 }
  }
];

async function fetchInvoiceCandidates() {
  return MOCK_INVOICES;
}

export { fetchInvoiceCandidates };
