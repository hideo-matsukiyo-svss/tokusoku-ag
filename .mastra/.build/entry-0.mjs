import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

"use strict";
const model = process.env.TONE_MODEL ?? "openai/gpt-5-mini";
const toneAgent = new Agent({
  id: "tone-agent",
  name: "\u7763\u4FC3\u30C8\u30FC\u30F3\u8ABF\u6574AG",
  model,
  instructions: [
    "\u3042\u306A\u305F\u306FSVSS\u682A\u5F0F\u4F1A\u793E\u306E\u7D4C\u7406\u62C5\u5F53\u3068\u3057\u3066\u3001\u8ACB\u6C42\u66F8\u306E\u7763\u4FC3\u30E1\u30FC\u30EB\u306E\u300C\u30C8\u30FC\u30F3\u300D\u3092\u6574\u3048\u307E\u3059\u3002",
    "\u5B88\u308B\u3053\u3068:",
    "- \u4E8B\u5B9F\uFF08\u8ACB\u6C42\u66F8\u756A\u53F7\u30FB\u91D1\u984D\u30FB\u671F\u65E5\uFF09\u306F\u7D76\u5BFE\u306B\u5909\u3048\u306A\u3044\u3002",
    "- \u65E5\u672C\u306E\u30D3\u30B8\u30CD\u30B9\u30E1\u30FC\u30EB\u3068\u3057\u3066\u81EA\u7136\u3067\u3001\u5931\u793C\u306E\u306A\u3044\u656C\u8A9E\u306B\u3059\u308B\u3002",
    "- \u6307\u5B9A\u3055\u308C\u305F\u30C8\u30FC\u30F3\u6307\u793A\u3068\u9867\u5BA2\u30BB\u30B0\u30E1\u30F3\u30C8\u306E\u30CB\u30E5\u30A2\u30F3\u30B9\u3092\u53CD\u6620\u3059\u308B\u3002",
    "- \u8A87\u5F35\u30FB\u8105\u3057\u30FB\u904E\u5EA6\u306A\u8B1D\u7F6A\u306F\u3057\u306A\u3044\u3002\u7C21\u6F54\u306B\u3002",
    "\u51FA\u529B\u306F\u672C\u6587\u30C6\u30AD\u30B9\u30C8\u306E\u307F\u3002\u524D\u7F6E\u304D\u3084\u89E3\u8AAC\u306F\u66F8\u304B\u306A\u3044\u3002"
  ].join("\n")
});

"use strict";
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

"use strict";
async function fetchInvoiceCandidates() {
  return MOCK_INVOICES;
}

"use strict";
const LADDER_THRESHOLDS = {
  preReminderDaysBefore: 3,
  // 期日の3営業日前に予告リマインド
  firstAfterDays: 3,
  // 超過+3営業日で1回目
  secondAfterDays: 10,
  // 超過+10日で2回目
  finalAfterDays: 20
  // 超過+20日で最終
};
const LADDER_RULES = {
  pre: {
    stage: "pre",
    label: "\u4E88\u544A\u30EA\u30DE\u30A4\u30F3\u30C9",
    fromLabel: "SVSS\u7D4C\u7406",
    needsApproval: false,
    // 期日前の優しい予告は自動送信でOK
    tone: "\u3084\u308F\u3089\u304B\u304F\u3001\u6050\u7E2E\u3057\u306A\u304C\u3089\u671F\u65E5\u3092\u305D\u3063\u3068\u601D\u3044\u51FA\u3055\u305B\u308B\u3002\u7763\u4FC3\u611F\u3092\u51FA\u3055\u306A\u3044\u3002"
  },
  first: {
    stage: "first",
    label: "1\u56DE\u76EE\u7763\u4FC3",
    fromLabel: "SVSS\u7D4C\u7406",
    needsApproval: false,
    // 行き違い前提の柔らかい確認は自動でOK
    tone: "\u300C\u884C\u304D\u9055\u3044\u3067\u3057\u305F\u3089\u7533\u3057\u8A33\u3042\u308A\u307E\u305B\u3093\u300D\u306E\u59FF\u52E2\u3002\u8CAC\u3081\u305A\u306B\u78BA\u8A8D\u3092\u304A\u9858\u3044\u3059\u308B\u3002"
  },
  second: {
    stage: "second",
    label: "2\u56DE\u76EE\u7763\u4FC3",
    fromLabel: "SVSS\u7D4C\u7406",
    needsApproval: true,
    // 2回目からは代表が中身を確認してから
    tone: "\u4E01\u5BE7\u3060\u304C\u4E8B\u5B9F\u3092\u660E\u78BA\u306B\u3002\u5165\u91D1\u671F\u65E5\u3092\u6539\u3081\u3066\u660E\u793A\u3057\u3001\u78BA\u8A8D\u3092\u4F9D\u983C\u3059\u308B\u3002"
  },
  final: {
    stage: "final",
    label: "\u6700\u7D42\u7763\u4FC3",
    fromLabel: "SVSS\u4EE3\u8868",
    needsApproval: true,
    // 最終は必ず代表承認
    tone: "\u6BC5\u7136\u3068\u3001\u3057\u304B\u3057\u95A2\u4FC2\u3092\u58CA\u3055\u306A\u3044\u3002\u4EE3\u8868\u540D\u3067\u3001\u4ECA\u5F8C\u306E\u5BFE\u5FDC\u306B\u3082\u89E6\u308C\u308B\u3002"
  }
};

"use strict";
function overdueDays(dueDate, today) {
  const due = /* @__PURE__ */ new Date(dueDate + "T00:00:00");
  const base = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const ms = base.getTime() - due.getTime();
  return Math.round(ms / (1e3 * 60 * 60 * 24));
}
function decideStage(invoice, today) {
  if (invoice.paid) return null;
  const days = overdueDays(invoice.dueDate, today);
  const t = LADDER_THRESHOLDS;
  if (days >= t.finalAfterDays) return "final";
  if (days >= t.secondAfterDays) return "second";
  if (days >= t.firstAfterDays) return "first";
  if (days >= -t.preReminderDaysBefore && days < 0) return "pre";
  return null;
}

"use strict";
function decideSegment(invoice) {
  const { pastInvoices, lateCount } = invoice.history;
  if (pastInvoices < 3) return "\u901A\u5E38";
  const lateRate = lateCount / pastInvoices;
  if (lateRate >= 0.3) return "\u8981\u6CE8\u610F";
  if (lateCount === 0) return "\u512A\u826F";
  return "\u901A\u5E38";
}
function segmentToneHint(segment) {
  switch (segment) {
    case "\u512A\u826F":
      return "\u9577\u5E74\u304D\u3061\u3093\u3068\u304A\u652F\u6255\u3044\u3044\u305F\u3060\u3044\u3066\u3044\u308B\u5927\u5207\u306A\u53D6\u5F15\u5148\u3002\u7279\u306B\u4E01\u91CD\u306B\u3001\u6050\u7E2E\u306E\u59FF\u52E2\u3067\u3002";
    case "\u8981\u6CE8\u610F":
      return "\u904E\u53BB\u306B\u9045\u5EF6\u304C\u76EE\u7ACB\u3064\u76F8\u624B\u3002\u4E01\u5BE7\u3055\u306F\u4FDD\u3061\u3064\u3064\u3001\u671F\u65E5\u3068\u4E8B\u5B9F\u306F\u66D6\u6627\u306B\u305B\u305A\u660E\u78BA\u306B\u3002";
    default:
      return "\u6A19\u6E96\u7684\u306A\u53D6\u5F15\u5148\u3002\u4E01\u5BE7\u304B\u3064\u7C21\u6F54\u306B\u3002";
  }
}

"use strict";
const yen = (n) => "\xA5" + n.toLocaleString("ja-JP");
function buildSubject(stage, invoice) {
  const map = {
    pre: `\u3010\u3054\u6848\u5185\u3011\u304A\u652F\u6255\u671F\u65E5\u306E\u3054\u78BA\u8A8D\uFF08\u8ACB\u6C42\u66F8 ${invoice.invoiceNo}\uFF09`,
    first: `\u3010\u3054\u78BA\u8A8D\u306E\u304A\u9858\u3044\u3011\u3054\u5165\u91D1\u72B6\u6CC1\u306B\u3064\u3044\u3066\uFF08\u8ACB\u6C42\u66F8 ${invoice.invoiceNo}\uFF09`,
    second: `\u3010\u518D\u5EA6\u306E\u3054\u9023\u7D61\u3011\u3054\u5165\u91D1\u306E\u3054\u78BA\u8A8D\uFF08\u8ACB\u6C42\u66F8 ${invoice.invoiceNo}\uFF09`,
    final: `\u3010\u91CD\u8981\u3011\u304A\u652F\u6255\u3044\u306B\u95A2\u3059\u308B\u3054\u9023\u7D61\uFF08\u8ACB\u6C42\u66F8 ${invoice.invoiceNo}\uFF09`
  };
  return map[stage];
}
function buildBody(stage, invoice) {
  const rule = LADDER_RULES[stage];
  const head = `${invoice.partnerName} \u3054\u62C5\u5F53\u8005\u69D8

\u3044\u3064\u3082\u5927\u5909\u304A\u4E16\u8A71\u306B\u306A\u3063\u3066\u304A\u308A\u307E\u3059\u3002${rule.fromLabel}\u3067\u3054\u3056\u3044\u307E\u3059\u3002`;
  const detail = `

\u25BC\u5BFE\u8C61\u306E\u3054\u8ACB\u6C42
\u30FB\u8ACB\u6C42\u66F8\u756A\u53F7: ${invoice.invoiceNo}
\u30FB\u5FA1\u8ACB\u6C42\u984D: ${yen(invoice.amount)}
\u30FB\u304A\u652F\u6255\u671F\u65E5: ${invoice.dueDate}`;
  let main = "";
  switch (stage) {
    case "pre":
      main = `

\u8868\u984C\u306E\u3054\u8ACB\u6C42\u306B\u3064\u304D\u307E\u3057\u3066\u3001\u304A\u652F\u6255\u671F\u65E5\u304C\u8FD1\u3065\u3044\u3066\u307E\u3044\u308A\u307E\u3057\u305F\u306E\u3067\u3054\u6848\u5185\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002\u3054\u591A\u5FD9\u306E\u3068\u3053\u308D\u6050\u308C\u5165\u308A\u307E\u3059\u304C\u3001\u3054\u78BA\u8A8D\u3044\u305F\u3060\u3051\u307E\u3059\u3068\u5E78\u3044\u3067\u3059\u3002`;
      break;
    case "first":
      main = `

\u5148\u822C\u304A\u9001\u308A\u3057\u305F\u4E0A\u8A18\u3054\u8ACB\u6C42\u306B\u3064\u304D\u307E\u3057\u3066\u3001\u672C\u65E5\u6642\u70B9\u3067\u3054\u5165\u91D1\u306E\u78BA\u8A8D\u304C\u53D6\u308C\u3066\u304A\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u884C\u304D\u9055\u3044\u3067\u306E\u3054\u9001\u91D1\u3067\u3057\u305F\u3089\u4F55\u5352\u3054\u5BB9\u8D66\u304F\u3060\u3055\u3044\u3002\u304A\u624B\u6570\u3067\u3059\u304C\u3054\u78BA\u8A8D\u3044\u305F\u3060\u3051\u307E\u3059\u3068\u5E78\u3044\u3067\u3059\u3002`;
      break;
    case "second":
      main = `

\u4E0A\u8A18\u3054\u8ACB\u6C42\u306B\u3064\u304D\u307E\u3057\u3066\u3001\u304A\u652F\u6255\u671F\u65E5\u3092\u904E\u304E\u3066\u3082\u3054\u5165\u91D1\u306E\u78BA\u8A8D\u304C\u53D6\u308C\u3066\u304A\u308A\u307E\u305B\u3093\u3002\u6050\u308C\u5165\u308A\u307E\u3059\u304C\u3001\u304A\u652F\u6255\u3044\u72B6\u6CC1\u3092\u3054\u78BA\u8A8D\u306E\u3046\u3048\u3001\u3054\u5BFE\u5FDC\u3044\u305F\u3060\u3051\u307E\u3059\u3088\u3046\u304A\u9858\u3044\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002`;
      break;
    case "final":
      main = `

\u4E0A\u8A18\u3054\u8ACB\u6C42\u306B\u3064\u304D\u307E\u3057\u3066\u3001\u8907\u6570\u56DE\u3054\u6848\u5185\u3092\u5DEE\u3057\u4E0A\u3052\u3066\u304A\u308A\u307E\u3059\u304C\u3001\u672C\u65E5\u6642\u70B9\u3067\u3054\u5165\u91D1\u3092\u78BA\u8A8D\u3067\u304D\u3066\u304A\u308A\u307E\u305B\u3093\u3002\u8AA0\u306B\u6050\u7E2E\u306A\u304C\u3089\u3001\u4ECA\u5F8C\u306E\u304A\u53D6\u5F15\u306B\u95A2\u308F\u308B\u4E8B\u9805\u3067\u3082\u3054\u3056\u3044\u307E\u3059\u305F\u3081\u3001\u81F3\u6025\u304A\u652F\u6255\u3044\u72B6\u6CC1\u3092\u3054\u78BA\u8A8D\u3044\u305F\u3060\u304D\u3001\u3054\u9023\u7D61\u3092\u8CDC\u308A\u307E\u3059\u3088\u3046\u304A\u9858\u3044\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002`;
      break;
  }
  const foot = `

\u4F55\u304B\u3054\u4E0D\u660E\u70B9\u3084\u884C\u304D\u9055\u3044\u304C\u3054\u3056\u3044\u307E\u3057\u305F\u3089\u3001\u672C\u30E1\u30FC\u30EB\u306B\u3054\u8FD4\u4FE1\u304F\u3060\u3055\u3044\u3002
\u5F15\u304D\u7D9A\u304D\u3069\u3046\u305E\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
SVSS\u682A\u5F0F\u4F1A\u793E \u7D4C\u7406
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`;
  return head + detail + main + foot;
}

"use strict";
const invoiceSchema = z.object({
  invoiceNo: z.string(),
  partnerName: z.string(),
  partnerEmail: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  paid: z.boolean(),
  history: z.object({
    pastInvoices: z.number(),
    lateCount: z.number()
  })
});
const draftSchema = z.object({
  invoiceNo: z.string(),
  partnerName: z.string(),
  partnerEmail: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  overdueDays: z.number(),
  segment: z.string(),
  stage: z.enum(["pre", "first", "second", "final"]),
  fromLabel: z.string(),
  needsApproval: z.boolean(),
  subject: z.string(),
  body: z.string()
});
const fetchStep = createStep({
  id: "fetch-invoices",
  inputSchema: z.object({ today: z.string() }),
  outputSchema: z.object({
    today: z.string(),
    invoices: z.array(invoiceSchema)
  }),
  execute: async ({ inputData }) => {
    const invoices = await fetchInvoiceCandidates();
    return { today: inputData.today, invoices };
  }
});
const buildDraftsStep = createStep({
  id: "build-drafts",
  inputSchema: z.object({
    today: z.string(),
    invoices: z.array(invoiceSchema)
  }),
  outputSchema: z.object({ drafts: z.array(draftSchema) }),
  execute: async ({ inputData }) => {
    const today = /* @__PURE__ */ new Date(inputData.today + "T00:00:00");
    const drafts = [];
    for (const inv of inputData.invoices) {
      const stage = decideStage(inv, today);
      if (!stage) continue;
      const rule = LADDER_RULES[stage];
      const segment = decideSegment(inv);
      drafts.push({
        invoiceNo: inv.invoiceNo,
        partnerName: inv.partnerName,
        partnerEmail: inv.partnerEmail,
        amount: inv.amount,
        dueDate: inv.dueDate,
        overdueDays: overdueDays(inv.dueDate, today),
        segment,
        stage,
        fromLabel: rule.fromLabel,
        needsApproval: rule.needsApproval,
        subject: buildSubject(stage, inv),
        body: buildBody(stage, inv)
      });
    }
    return { drafts };
  }
});
const tonePolishStep = createStep({
  id: "tone-polish",
  inputSchema: z.object({ drafts: z.array(draftSchema) }),
  outputSchema: z.object({ drafts: z.array(draftSchema) }),
  execute: async ({ inputData }) => {
    const hasKey = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
    if (!hasKey) {
      return { drafts: inputData.drafts };
    }
    const polished = [];
    for (const d of inputData.drafts) {
      const rule = LADDER_RULES[d.stage];
      const prompt = [
        `\u7763\u4FC3\u6BB5\u968E: ${rule.label}`,
        `\u30C8\u30FC\u30F3\u6307\u793A: ${rule.tone}`,
        `\u9867\u5BA2\u30BB\u30B0\u30E1\u30F3\u30C8: ${d.segment}\uFF08${segmentToneHint(d.segment)}\uFF09`,
        "",
        "\u4EE5\u4E0B\u306E\u7763\u4FC3\u30E1\u30FC\u30EB\u672C\u6587\u3092\u3001\u4E8B\u5B9F\u306F\u5909\u3048\u305A\u306B\u30C8\u30FC\u30F3\u3060\u3051\u6574\u3048\u3066\u304F\u3060\u3055\u3044:",
        "---",
        d.body
      ].join("\n");
      try {
        const res = await toneAgent.generate(prompt);
        polished.push({ ...d, body: res.text?.trim() || d.body });
      } catch {
        polished.push(d);
      }
    }
    return { drafts: polished };
  }
});
const tokusaiWorkflow = createWorkflow({
  id: "tokusai-workflow",
  inputSchema: z.object({ today: z.string() }),
  outputSchema: z.object({ drafts: z.array(draftSchema) })
}).then(fetchStep).then(buildDraftsStep).then(tonePolishStep).commit();

"use strict";
const mastra = new Mastra({
  agents: {
    toneAgent
  },
  workflows: {
    tokusaiWorkflow
  }
});

export { mastra };
