import { Mastra } from '@mastra/core';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

"use strict";
const MOCK_WORKERS = [
  {
    // 今月稼働あり × まだ提出なし → 未提出（督促対象）
    id: "w001",
    name: "\u7530\u4E2D \u592A\u90CE",
    email: "tanaka@example.com",
    workedThisMonth: true,
    excluded: false,
    lastContactedAt: void 0
  },
  {
    // 今月稼働あり × 提出済み（submissions.mockに一致あり）→ 提出済み
    id: "w002",
    name: "\u4F50\u85E4 \u82B1\u5B50",
    email: "sato.hanako@example.com",
    workedThisMonth: true,
    excluded: false,
    lastContactedAt: void 0
  },
  {
    // 今月稼働あり × 未提出 × 既に1回連絡済み → 未提出（2回目以降のリマインド対象）
    id: "w003",
    name: "\u9234\u6728 \u4E00\u90CE",
    email: "suzuki@example.com",
    workedThisMonth: true,
    excluded: false,
    lastContactedAt: "2026-09-01"
  },
  {
    // 対象外フラグ（今月は請求不要）→ 対象外
    id: "w004",
    name: "\u9AD8\u6A4B \u307F\u3069\u308A",
    email: "takahashi@example.com",
    workedThisMonth: true,
    excluded: true,
    excludedReason: "\u4ECA\u6708\u306F\u7A3C\u50CD\u5206\u3092\u6765\u6708\u307E\u3068\u3081\u3066\u8ACB\u6C42\u4E88\u5B9A",
    lastContactedAt: void 0
  },
  {
    // 今月は稼働なし → 対象外（請求書を出す必要がない）
    id: "w005",
    name: "\u4F0A\u85E4 \u5065",
    email: "ito.ken@example.com",
    workedThisMonth: false,
    excluded: false,
    lastContactedAt: void 0
  },
  {
    // 今月稼働あり × 提出済み（別名で一致）→ 提出済み
    id: "w006",
    name: "\u6E21\u8FBA \u967D\u5B50",
    email: "watanabe.yoko@example.com",
    workedThisMonth: true,
    excluded: false,
    lastContactedAt: void 0
  }
];

"use strict";
async function fetchWorkers() {
  return MOCK_WORKERS;
}

"use strict";
const MOCK_SUBMISSIONS = [
  {
    // 佐藤さん(w002)：4条件そろう → 提出済み
    fromEmail: "sato.hanako@example.com",
    workerName: "\u4F50\u85E4 \u82B1\u5B50",
    receivedAt: "2026-08-31",
    subject: "8\u6708\u5206 \u8ACB\u6C42\u66F8\u9001\u4ED8\u306E\u4EF6",
    hasPdf: true,
    targetMonth: "2026-08"
  },
  {
    // 田中さん(w001)：メールは来たが PDFなし＆件名が請求書と言い切れない → 要確認
    fromEmail: "tanaka@example.com",
    workerName: "\u7530\u4E2D \u592A\u90CE",
    receivedAt: "2026-09-01",
    subject: "\u5148\u6708\u5206\u306E\u4EF6\u3067\u3054\u76F8\u8AC7\u3067\u3059",
    hasPdf: false,
    targetMonth: "2026-08"
  },
  {
    // 渡辺さん(w006)：8月分（正常）
    fromEmail: "watanabe.yoko@example.com",
    workerName: "\u30EF\u30BF\u30CA\u30D9\u30E8\u30A6\u30B3",
    receivedAt: "2026-09-01",
    subject: "\u3010\u8ACB\u6C42\u66F8\u30112026\u5E748\u6708",
    hasPdf: true,
    targetMonth: "2026-08"
  },
  {
    // 渡辺さん(w006)：7月分も再送 → 複数月分がまざる → 要確認
    fromEmail: "watanabe.yoko@example.com",
    workerName: "\u30EF\u30BF\u30CA\u30D9\u30E8\u30A6\u30B3",
    receivedAt: "2026-09-01",
    subject: "\u3010\u8ACB\u6C42\u66F8\u30112026\u5E747\u6708 \u518D\u9001",
    hasPdf: true,
    targetMonth: "2026-07"
  }
];

"use strict";
async function fetchSubmissions() {
  return MOCK_SUBMISSIONS;
}

"use strict";
function norm(s) {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, "");
}
function targetMonthOf(today) {
  const d = /* @__PURE__ */ new Date(today + "T00:00:00");
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function subjectLooksInvoice(subject) {
  const s = subject.toLowerCase();
  return s.includes("\u8ACB\u6C42") || s.includes("invoice");
}
function candidatesFor(worker, submissions) {
  return submissions.filter((s) => {
    const emailMatch = norm(s.fromEmail) === norm(worker.email);
    const nameMatch = norm(s.workerName) !== "" && norm(s.workerName) === norm(worker.name);
    return emailMatch || nameMatch;
  });
}
function reconcile(workers, submissions, today) {
  const month = targetMonthOf(today);
  const pending = [];
  const submitted = [];
  const excluded = [];
  const needsReview = [];
  for (const worker of workers) {
    if (worker.excluded || !worker.workedThisMonth) {
      excluded.push({ worker, status: "\u5BFE\u8C61\u5916" });
      continue;
    }
    const candidates = candidatesFor(worker, submissions);
    if (candidates.length === 0) {
      pending.push({ worker, status: "\u672A\u63D0\u51FA" });
      continue;
    }
    const valid = candidates.filter(
      (s) => subjectLooksInvoice(s.subject) && s.hasPdf && s.targetMonth === month
    );
    if (candidates.length === 1 && valid.length === 1) {
      submitted.push({
        worker,
        status: "\u63D0\u51FA\u6E08\u307F",
        matchedSubmission: valid[0]
      });
      continue;
    }
    const reasons = [];
    if (candidates.length > 1) reasons.push("\u8ACB\u6C42\u66F8\u30E1\u30FC\u30EB\u304C\u8907\u6570\u901A\u3042\u308B\uFF08\u8907\u6570\u6708\u5206\u306E\u53EF\u80FD\u6027\uFF09");
    if (candidates.some((s) => !s.hasPdf)) reasons.push("PDF\u6DFB\u4ED8\u304C\u7121\u3044\u30E1\u30FC\u30EB\u304C\u3042\u308B");
    if (candidates.some((s) => !subjectLooksInvoice(s.subject)))
      reasons.push("\u4EF6\u540D\u304B\u3089\u8ACB\u6C42\u66F8\u3068\u5224\u65AD\u3067\u304D\u306A\u3044\u30E1\u30FC\u30EB\u304C\u3042\u308B");
    if (!candidates.some((s) => s.targetMonth === month))
      reasons.push(`\u5BFE\u8C61\u6708(${month})\u5206\u306E\u8ACB\u6C42\u304C\u898B\u5F53\u305F\u3089\u306A\u3044`);
    if (reasons.length === 0) reasons.push("\u81EA\u52D5\u3067\u63D0\u51FA\u6E08\u307F\u3068\u78BA\u5B9A\u3067\u304D\u306A\u304B\u3063\u305F");
    needsReview.push({
      worker,
      status: "\u8981\u78BA\u8A8D",
      candidates,
      reviewReasons: reasons
    });
  }
  return { pending, submitted, excluded, needsReview };
}

"use strict";
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isWeekend(d) {
  const g = d.getDay();
  return g === 0 || g === 6;
}
function isBusinessDay(d, holidays) {
  return !isWeekend(d) && !holidays.has(ymd(d));
}
function businessDayOfMonth(today, holidays) {
  const t = /* @__PURE__ */ new Date(today + "T00:00:00");
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

"use strict";
const COMPANY_HOLIDAYS = [
  // 2026年 日本の祝日
  "2026-01-01",
  // 元日
  "2026-01-12",
  // 成人の日
  "2026-02-11",
  // 建国記念の日
  "2026-02-23",
  // 天皇誕生日
  "2026-03-20",
  // 春分の日
  "2026-04-29",
  // 昭和の日
  "2026-05-03",
  // 憲法記念日
  "2026-05-04",
  // みどりの日
  "2026-05-05",
  // こどもの日
  "2026-05-06",
  // 振替休日
  "2026-07-20",
  // 海の日
  "2026-08-11",
  // 山の日
  "2026-09-21",
  // 敬老の日
  "2026-09-22",
  // 国民の休日
  "2026-09-23",
  // 秋分の日
  "2026-10-12",
  // スポーツの日
  "2026-11-03",
  // 文化の日
  "2026-11-23"
  // 勤労感謝の日
];

"use strict";
const SCHEDULE_THRESHOLD = {
  firstDay: 1,
  // 第1営業日 → 初回連絡
  remindFrom: 2,
  // 第2営業日から
  remindTo: 5
  // 第5営業日まで リマインド
  // 第5営業日を過ぎたら「締め」（最終ステータス確定、督促は止める）
};
function decideSchedule(today) {
  const holidays = new Set(COMPANY_HOLIDAYS);
  const { businessDay, todayIsBusinessDay } = businessDayOfMonth(today, holidays);
  const t = SCHEDULE_THRESHOLD;
  let stage;
  let note;
  if (!todayIsBusinessDay) {
    stage = "\u5BFE\u8C61\u5916\u65E5";
    note = "\u4ECA\u65E5\u306F\u55B6\u696D\u65E5\u3067\u306F\u306A\u3044\u305F\u3081\u9023\u7D61\u3057\u306A\u3044";
  } else if (businessDay === t.firstDay) {
    stage = "\u521D\u56DE";
    note = "\u7B2C1\u55B6\u696D\u65E5\uFF1A\u521D\u56DE\u9023\u7D61\uFF08\u672C\u65E5\u307E\u3067\u306B\u9001\u4ED8\u3067\u304D\u305D\u3046\u304B\uFF0B\u8ACB\u6C42\u66F8\u4F5C\u6210\u4EE3\u884C\u306E\u8981\u5426\u3092\u78BA\u8A8D\uFF09";
  } else if (businessDay >= t.remindFrom && businessDay <= t.remindTo) {
    stage = "\u30EA\u30DE\u30A4\u30F3\u30C9";
    note = `\u7B2C${businessDay}\u55B6\u696D\u65E5\uFF1A\u672A\u63D0\u51FA\u8005\u3078\u30EA\u30DE\u30A4\u30F3\u30C9`;
  } else {
    stage = "\u7DE0\u3081";
    note = `\u7B2C${businessDay}\u55B6\u696D\u65E5\uFF1A\u7B2C${t.remindTo}\u55B6\u696D\u65E5\u3092\u904E\u304E\u305F\u305F\u3081\u7763\u4FC3\u306F\u7DE0\u3081\u3002\u6700\u7D42\u30B9\u30C6\u30FC\u30BF\u30B9\u3092\u78BA\u5B9A`;
  }
  return { businessDay, todayIsBusinessDay, stage, note };
}

"use strict";
function formatMonth(ym) {
  const [y, m] = ym.split("-");
  return `${y}\u5E74${Number(m)}\u6708`;
}
function buildMessage(worker, targetMonth, stage, opts) {
  const m = formatMonth(targetMonth);
  const head = `${worker.name} \u69D8

\u3044\u3064\u3082\u5927\u5909\u304A\u4E16\u8A71\u306B\u306A\u3063\u3066\u304A\u308A\u307E\u3059\u3002SVSS\u7D4C\u7406\u3067\u3054\u3056\u3044\u307E\u3059\u3002`;
  const foot = `

\u304A\u624B\u6570\u3092\u304A\u304B\u3051\u3057\u307E\u3059\u304C\u3001\u4F55\u5352\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
SVSS\u682A\u5F0F\u4F1A\u793E \u7D4C\u7406
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`;
  let subject = "";
  let main = "";
  switch (stage) {
    case "\u521D\u56DE":
      subject = `\u3010\u3054\u78BA\u8A8D\u306E\u304A\u9858\u3044\u3011${m}\u5206 \u3054\u8ACB\u6C42\u66F8\u306E\u3054\u9001\u4ED8\u306B\u3064\u3044\u3066`;
      main = `

${m}\u5206\u306E\u3054\u7A3C\u50CD\u306B\u3064\u304D\u307E\u3057\u3066\u3001\u3054\u8ACB\u6C42\u66F8\u306E\u3054\u9001\u4ED8\u3092\u304A\u9858\u3044\u3057\u3066\u304A\u308A\u307E\u3059\u3002
\u672C\u65E5\u4E2D\u306B\u3054\u9001\u4ED8\u3044\u305F\u3060\u3051\u305D\u3046\u304B\u3001\u3054\u78BA\u8A8D\u3044\u305F\u3060\u3051\u307E\u3059\u3067\u3057\u3087\u3046\u304B\u3002
\u306A\u304A\u3001\u3054\u8ACB\u6C42\u66F8\u306E\u4F5C\u6210\u304C\u96E3\u3057\u3044\u5834\u5408\u306F\u3001\u5F53\u793E\u306B\u3066\u4F5C\u6210\u3092\u4EE3\u884C\u3059\u308B\u3053\u3068\u3082\u53EF\u80FD\u3067\u3059\u3002\u4EE3\u884C\u3092\u3054\u5E0C\u671B\u306E\u969B\u306F\u3001\u305D\u306E\u65E8\u3054\u8FD4\u4FE1\u304F\u3060\u3055\u3044\u3002`;
      break;
    case "\u30EA\u30DE\u30A4\u30F3\u30C9":
      subject = `\u3010\u518D\u5EA6\u306E\u3054\u9023\u7D61\u3011${m}\u5206 \u3054\u8ACB\u6C42\u66F8\u306E\u3054\u9001\u4ED8\u306B\u3064\u3044\u3066`;
      main = `

${m}\u5206\u306E\u3054\u8ACB\u6C42\u66F8\u306B\u3064\u304D\u307E\u3057\u3066\u3001\u672C\u65E5\u6642\u70B9\u3067\u3054\u9001\u4ED8\u306E\u78BA\u8A8D\u304C\u53D6\u308C\u3066\u304A\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u884C\u304D\u9055\u3044\u3067\u306E\u3054\u9001\u4ED8\u3067\u3057\u305F\u3089\u7533\u3057\u8A33\u3054\u3056\u3044\u307E\u305B\u3093\u3002
\u3054\u591A\u5FD9\u306E\u3068\u3053\u308D\u6050\u308C\u5165\u308A\u307E\u3059\u304C\u3001\u3054\u9001\u4ED8\u72B6\u6CC1\u3092\u3054\u78BA\u8A8D\u3044\u305F\u3060\u3051\u307E\u3059\u3067\u3057\u3087\u3046\u304B\u3002\u4F5C\u6210\u4EE3\u884C\u304C\u5FC5\u8981\u306A\u5834\u5408\u306F\u3001\u304A\u6C17\u8EFD\u306B\u304A\u7533\u3057\u4ED8\u3051\u304F\u3060\u3055\u3044\u3002`;
      break;
    case "\u7D4C\u7406\u6307\u793A\u53CD\u6620":
      subject = `\u3010\u3054\u9023\u7D61\u3011${m}\u5206 \u3054\u8ACB\u6C42\u66F8\u306B\u3064\u3044\u3066`;
      main = `

${m}\u5206\u306E\u3054\u8ACB\u6C42\u66F8\u306B\u3064\u304D\u307E\u3057\u3066\u3001\u3054\u9023\u7D61\u3044\u305F\u3057\u307E\u3059\u3002`;
      if (opts?.instruction && opts.instruction.trim() !== "") {
        main += `

${opts.instruction.trim()}`;
      }
      main += `

\u3054\u78BA\u8A8D\u306E\u307B\u3069\u3001\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u3044\u305F\u3057\u307E\u3059\u3002`;
      break;
  }
  return {
    channel: "email",
    to: worker.email,
    toName: worker.name,
    subject,
    body: head + main + foot,
    stage
  };
}

"use strict";
function reinstructId(today, workerId, instruction) {
  let h = 0;
  for (const ch of instruction.trim()) h = h * 31 + ch.charCodeAt(0) >>> 0;
  return `${today}_${workerId}_reinstruct_${h.toString(36)}`;
}
function contactId(today, workerId) {
  return `${today}_${workerId}_contact`;
}
function reviewId(today, workerId) {
  return `${today}_${workerId}_review`;
}

"use strict";
const FILE = path.resolve(".data/judgment-log.json");
function readAll() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}
async function recordJudgment(entry) {
  const all = readAll();
  if (all.some((e) => e.id === entry.id)) {
    return { recorded: false, entry };
  }
  all.push(entry);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
  return { recorded: true, entry };
}
async function listJudgments() {
  return readAll();
}

"use strict";
async function updateWorkerStatus(workerId, status, memo) {
  const note = `\u7A3C\u50CD\u8005\u30EA\u30B9\u30C8\u66F4\u65B0\uFF08\u4E88\u5B9A\uFF09: ${workerId} \u2192 \u300C${status}\u300D${memo ? ` / ${memo}` : ""}`;
  return { ok: true, note };
}

"use strict";
const workerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  workedThisMonth: z.boolean(),
  excluded: z.boolean(),
  excludedReason: z.string().optional(),
  lastContactedAt: z.string().optional()
});
const submissionSchema = z.object({
  fromEmail: z.string(),
  workerName: z.string().optional(),
  receivedAt: z.string(),
  subject: z.string(),
  hasPdf: z.boolean(),
  targetMonth: z.string()
});
const followSchema = z.object({
  worker: workerSchema,
  status: z.enum(["\u672A\u63D0\u51FA", "\u63D0\u51FA\u6E08\u307F", "\u5BFE\u8C61\u5916", "\u8981\u78BA\u8A8D"]),
  matchedSubmission: submissionSchema.optional(),
  candidates: z.array(submissionSchema).optional(),
  reviewReasons: z.array(z.string()).optional()
});
const resultSchema = z.object({
  pending: z.array(followSchema),
  submitted: z.array(followSchema),
  excluded: z.array(followSchema),
  needsReview: z.array(followSchema)
});
const scheduleSchema = z.object({
  businessDay: z.number(),
  todayIsBusinessDay: z.boolean(),
  stage: z.enum(["\u521D\u56DE", "\u30EA\u30DE\u30A4\u30F3\u30C9", "\u7DE0\u3081", "\u5BFE\u8C61\u5916\u65E5"]),
  note: z.string()
});
const messageSchema$1 = z.object({
  channel: z.literal("email"),
  to: z.string(),
  toName: z.string(),
  subject: z.string(),
  body: z.string(),
  stage: z.enum(["\u521D\u56DE", "\u30EA\u30DE\u30A4\u30F3\u30C9", "\u7D4C\u7406\u6307\u793A\u53CD\u6620"])
});
const planSchema = z.object({
  today: z.string(),
  schedule: scheduleSchema,
  follow: resultSchema,
  drafts: z.array(messageSchema$1)
  // 今日 未提出者へ送る連絡の下書き
});
const writebackSchema = z.object({
  contacts: z.array(z.object({ name: z.string(), recorded: z.boolean() })),
  reviews: z.array(z.object({ name: z.string(), recorded: z.boolean() })),
  finalized: z.array(z.object({ name: z.string(), status: z.string() })),
  statusNotes: z.array(z.string())
});
const finalSchema = z.object({
  schedule: scheduleSchema,
  follow: resultSchema,
  drafts: z.array(messageSchema$1),
  writeback: writebackSchema
});
const fetchStep = createStep({
  id: "fetch",
  inputSchema: z.object({ today: z.string() }),
  outputSchema: z.object({
    today: z.string(),
    workers: z.array(workerSchema),
    submissions: z.array(submissionSchema)
  }),
  execute: async ({ inputData }) => {
    const [workers, submissions] = await Promise.all([
      fetchWorkers(),
      fetchSubmissions()
    ]);
    return { today: inputData.today, workers, submissions };
  }
});
const reconcileStep = createStep({
  id: "reconcile",
  inputSchema: z.object({
    today: z.string(),
    workers: z.array(workerSchema),
    submissions: z.array(submissionSchema)
  }),
  outputSchema: z.object({ today: z.string(), follow: resultSchema }),
  execute: async ({ inputData }) => {
    const follow = reconcile(
      inputData.workers,
      inputData.submissions,
      inputData.today
    );
    return { today: inputData.today, follow };
  }
});
const planStep = createStep({
  id: "plan",
  inputSchema: z.object({ today: z.string(), follow: resultSchema }),
  outputSchema: planSchema,
  execute: async ({ inputData }) => {
    const schedule = decideSchedule(inputData.today);
    const month = targetMonthOf(inputData.today);
    const drafts = schedule.stage === "\u521D\u56DE" || schedule.stage === "\u30EA\u30DE\u30A4\u30F3\u30C9" ? inputData.follow.pending.map(
      (f) => buildMessage(f.worker, month, schedule.stage)
    ) : [];
    return { today: inputData.today, schedule, follow: inputData.follow, drafts };
  }
});
const recordStep = createStep({
  id: "record",
  inputSchema: planSchema,
  outputSchema: finalSchema,
  execute: async ({ inputData }) => {
    const { today, schedule, follow } = inputData;
    const month = targetMonthOf(today);
    const contacts = [];
    const reviews = [];
    const finalized = [];
    const statusNotes = [];
    if (schedule.stage === "\u521D\u56DE" || schedule.stage === "\u30EA\u30DE\u30A4\u30F3\u30C9") {
      for (const f of follow.pending) {
        const w = f.worker;
        const { recorded } = await recordJudgment({
          id: contactId(today, w.id),
          // 同じ日・同じ人は1回だけ＝二重督促防止
          type: "\u7763\u4FC3\u9023\u7D61",
          workerId: w.id,
          workerName: w.name,
          targetMonth: month,
          instruction: `${schedule.stage}\u9023\u7D61`,
          decidedBy: "\u8ACB\u6C42\u66F8\u30D5\u30A9\u30ED\u30FCAG",
          decidedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        contacts.push({ name: w.name, recorded });
        if (recorded) {
          const { note } = await updateWorkerStatus(w.id, `\u7763\u4FC3\u6E08\u307F(${schedule.stage})`, today);
          statusNotes.push(note);
        }
      }
    }
    for (const f of follow.needsReview) {
      const w = f.worker;
      const { recorded } = await recordJudgment({
        id: reviewId(today, w.id),
        type: "\u8981\u78BA\u8A8D\u30A8\u30B9\u30AB\u30EC",
        workerId: w.id,
        workerName: w.name,
        targetMonth: month,
        instruction: (f.reviewReasons ?? []).join(" / "),
        decidedBy: "\u8ACB\u6C42\u66F8\u30D5\u30A9\u30ED\u30FCAG",
        decidedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      reviews.push({ name: w.name, recorded });
    }
    if (schedule.stage === "\u7DE0\u3081") {
      const all = [...follow.submitted, ...follow.pending, ...follow.needsReview, ...follow.excluded];
      for (const f of all) {
        finalized.push({ name: f.worker.name, status: f.status });
        const { note } = await updateWorkerStatus(f.worker.id, `\u6700\u7D42:${f.status}`, today);
        statusNotes.push(note);
      }
    }
    return {
      schedule,
      follow,
      drafts: inputData.drafts,
      writeback: { contacts, reviews, finalized, statusNotes }
    };
  }
});
const invoiceFollowWorkflow = createWorkflow({
  id: "invoice-follow-workflow",
  inputSchema: z.object({ today: z.string() }),
  outputSchema: finalSchema
}).then(fetchStep).then(reconcileStep).then(planStep).then(recordStep).commit();

"use strict";
const inputSchema = z.object({
  today: z.string(),
  target: z.string(),
  // 稼働者ID または メールアドレス
  instruction: z.string(),
  // 経理担当者の指示（文面に反映する内容）
  by: z.string()
  // 指示した経理担当者名
});
const messageSchema = z.object({
  channel: z.literal("email"),
  to: z.string(),
  toName: z.string(),
  subject: z.string(),
  body: z.string(),
  stage: z.enum(["\u521D\u56DE", "\u30EA\u30DE\u30A4\u30F3\u30C9", "\u7D4C\u7406\u6307\u793A\u53CD\u6620"])
});
const outputSchema = z.object({
  recorded: z.boolean(),
  // 判断ログに新規記録されたか（false＝既に記録済み＝二重防止）
  logId: z.string(),
  statusNote: z.string(),
  message: messageSchema
});
const step = createStep({
  id: "reinstruct",
  inputSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    const { today, target, instruction, by } = inputData;
    const month = targetMonthOf(today);
    const workers = await fetchWorkers();
    const worker = workers.find(
      (w) => w.id === target || w.email.toLowerCase() === target.toLowerCase()
    );
    if (!worker) {
      throw new Error(`\u5BFE\u8C61\u306E\u7A3C\u50CD\u8005\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ${target}`);
    }
    const id = reinstructId(today, worker.id, instruction);
    const { recorded } = await recordJudgment({
      id,
      type: "\u7D4C\u7406\u6307\u793A\u306B\u3088\u308B\u518D\u9023\u7D61",
      workerId: worker.id,
      workerName: worker.name,
      targetMonth: month,
      instruction,
      decidedBy: by,
      decidedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const message = buildMessage(worker, month, "\u7D4C\u7406\u6307\u793A\u53CD\u6620", { instruction });
    const { note } = await updateWorkerStatus(
      worker.id,
      "\u7D4C\u7406\u6307\u793A\u3067\u518D\u9023\u7D61",
      `\u6307\u793A\u8005: ${by}`
    );
    return { recorded, logId: id, statusNote: note, message };
  }
});
const reinstructWorkflow = createWorkflow({
  id: "reinstruct-workflow",
  inputSchema,
  outputSchema
}).then(step).commit();

"use strict";
const mastra = new Mastra({
  workflows: {
    invoiceFollowWorkflow,
    reinstructWorkflow
  }
});

export { mastra };
