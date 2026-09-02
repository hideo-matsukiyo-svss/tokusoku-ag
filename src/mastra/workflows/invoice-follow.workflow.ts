// ★請求書フォローAG のワークフロー本体（Step2.5版）。
// 「取得 → 突合（4分類：未提出/提出済み/対象外/要確認）」の2ステップ。
// このあと Step3(営業日タイミング)・Step4(文面)・Step5-7(HITL/Slack/実データ) を足していきます。

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { fetchWorkers } from '../tools/worker-list.js';
import { fetchSubmissions } from '../tools/submissions.js';
import { reconcile, targetMonthOf } from '../../logic/reconcile.js';
import { decideSchedule } from '../../logic/schedule.js';
import { buildMessage } from '../../logic/message.js';
import { contactId, reviewId } from '../../logic/judgment.js';
import { recordJudgment } from '../tools/judgment-log.js';
import { updateWorkerStatus } from '../tools/status-update.js';
import type { Worker, Submission } from '../../logic/types.js';

// ---- スキーマ（データの形）----
const workerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  workedThisMonth: z.boolean(),
  excluded: z.boolean(),
  excludedReason: z.string().optional(),
  lastContactedAt: z.string().optional(),
});

const submissionSchema = z.object({
  fromEmail: z.string(),
  workerName: z.string().optional(),
  receivedAt: z.string(),
  subject: z.string(),
  hasPdf: z.boolean(),
  targetMonth: z.string(),
});

const followSchema = z.object({
  worker: workerSchema,
  status: z.enum(['未提出', '提出済み', '対象外', '要確認']),
  matchedSubmission: submissionSchema.optional(),
  candidates: z.array(submissionSchema).optional(),
  reviewReasons: z.array(z.string()).optional(),
});

const resultSchema = z.object({
  pending: z.array(followSchema),
  submitted: z.array(followSchema),
  excluded: z.array(followSchema),
  needsReview: z.array(followSchema),
});

const scheduleSchema = z.object({
  businessDay: z.number(),
  todayIsBusinessDay: z.boolean(),
  stage: z.enum(['初回', 'リマインド', '締め', '対象外日']),
  note: z.string(),
});

const messageSchema = z.object({
  channel: z.literal('email'),
  to: z.string(),
  toName: z.string(),
  subject: z.string(),
  body: z.string(),
  stage: z.enum(['初回', 'リマインド', '経理指示反映']),
});

// Step3+4の途中結果（today を後段へ引き継ぐ）
const planSchema = z.object({
  today: z.string(),
  schedule: scheduleSchema,
  follow: resultSchema,
  drafts: z.array(messageSchema), // 今日 未提出者へ送る連絡の下書き
});

// Step6：状態の書き戻し結果
const writebackSchema = z.object({
  contacts: z.array(z.object({ name: z.string(), recorded: z.boolean() })),
  reviews: z.array(z.object({ name: z.string(), recorded: z.boolean() })),
  finalized: z.array(z.object({ name: z.string(), status: z.string() })),
  statusNotes: z.array(z.string()),
});

const finalSchema = z.object({
  schedule: scheduleSchema,
  follow: resultSchema,
  drafts: z.array(messageSchema),
  writeback: writebackSchema,
});

// ---- ステップ1: 稼働者リストと提出メールを取得 ----
const fetchStep = createStep({
  id: 'fetch',
  inputSchema: z.object({ today: z.string() }),
  outputSchema: z.object({
    today: z.string(),
    workers: z.array(workerSchema),
    submissions: z.array(submissionSchema),
  }),
  execute: async ({ inputData }) => {
    const [workers, submissions] = await Promise.all([
      fetchWorkers(),
      fetchSubmissions(),
    ]);
    return { today: inputData.today, workers, submissions };
  },
});

// ---- ステップ2: 突合して4分類（ルールで確定）----
const reconcileStep = createStep({
  id: 'reconcile',
  inputSchema: z.object({
    today: z.string(),
    workers: z.array(workerSchema),
    submissions: z.array(submissionSchema),
  }),
  outputSchema: z.object({ today: z.string(), follow: resultSchema }),
  execute: async ({ inputData }) => {
    const follow = reconcile(
      inputData.workers as Worker[],
      inputData.submissions as Submission[],
      inputData.today,
    );
    return { today: inputData.today, follow };
  },
});

// ---- ステップ3+4: 今日のステージを決め（営業日ベース）、未提出者への連絡文面を作る ----
const planStep = createStep({
  id: 'plan',
  inputSchema: z.object({ today: z.string(), follow: resultSchema }),
  outputSchema: planSchema,
  execute: async ({ inputData }) => {
    const schedule = decideSchedule(inputData.today);
    const month = targetMonthOf(inputData.today);

    // 初回 or リマインドの日だけ、未提出者ぶんの下書きを作る
    const drafts =
      schedule.stage === '初回' || schedule.stage === 'リマインド'
        ? inputData.follow.pending.map((f) =>
            buildMessage(f.worker as Worker, month, schedule.stage as '初回' | 'リマインド'),
          )
        : [];

    return { today: inputData.today, schedule, follow: inputData.follow, drafts };
  },
});

// ---- ステップ6: 状態の書き戻し（Gold判断ログ＋Silver稼働者リスト、冪等＝二重督促防止）----
const recordStep = createStep({
  id: 'record',
  inputSchema: planSchema,
  outputSchema: finalSchema,
  execute: async ({ inputData }) => {
    const { today, schedule, follow } = inputData;
    const month = targetMonthOf(today);

    const contacts: { name: string; recorded: boolean }[] = [];
    const reviews: { name: string; recorded: boolean }[] = [];
    const finalized: { name: string; status: string }[] = [];
    const statusNotes: string[] = [];

    // 初回/リマインドの日：督促を送った未提出者を、判断ログに冪等記録＋Silver更新
    if (schedule.stage === '初回' || schedule.stage === 'リマインド') {
      for (const f of follow.pending) {
        const w = f.worker;
        const { recorded } = await recordJudgment({
          id: contactId(today, w.id),           // 同じ日・同じ人は1回だけ＝二重督促防止
          type: '督促連絡',
          workerId: w.id,
          workerName: w.name,
          targetMonth: month,
          instruction: `${schedule.stage}連絡`,
          decidedBy: '請求書フォローAG',
          decidedAt: new Date().toISOString(),
        });
        contacts.push({ name: w.name, recorded });
        if (recorded) {
          const { note } = await updateWorkerStatus(w.id, `督促済み(${schedule.stage})`, today);
          statusNotes.push(note);
        }
      }
    }

    // 要確認：いつでも判断ログに冪等記録（Slack通知の元ネタ）
    for (const f of follow.needsReview) {
      const w = f.worker;
      const { recorded } = await recordJudgment({
        id: reviewId(today, w.id),
        type: '要確認エスカレ',
        workerId: w.id,
        workerName: w.name,
        targetMonth: month,
        instruction: (f.reviewReasons ?? []).join(' / '),
        decidedBy: '請求書フォローAG',
        decidedAt: new Date().toISOString(),
      });
      reviews.push({ name: w.name, recorded });
    }

    // 締めの日：今月の最終ステータスを稼働者リストへ反映（モック）
    if (schedule.stage === '締め') {
      const all = [...follow.submitted, ...follow.pending, ...follow.needsReview, ...follow.excluded];
      for (const f of all) {
        finalized.push({ name: f.worker.name, status: f.status });
        const { note } = await updateWorkerStatus(f.worker.id, `最終:${f.status}`, today);
        statusNotes.push(note);
      }
    }

    return {
      schedule,
      follow,
      drafts: inputData.drafts,
      writeback: { contacts, reviews, finalized, statusNotes },
    };
  },
});

// ---- ワークフロー組み立て ----
export const invoiceFollowWorkflow = createWorkflow({
  id: 'invoice-follow-workflow',
  inputSchema: z.object({ today: z.string() }),
  outputSchema: finalSchema,
})
  .then(fetchStep)
  .then(reconcileStep)
  .then(planStep)
  .then(recordStep)
  .commit();
