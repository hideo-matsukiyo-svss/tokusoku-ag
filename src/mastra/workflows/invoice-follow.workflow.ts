// ★請求書フォローAG のワークフロー本体（Step2.5版）。
// 「取得 → 突合（4分類：未提出/提出済み/対象外/要確認）」の2ステップ。
// このあと Step3(営業日タイミング)・Step4(文面)・Step5-7(HITL/Slack/実データ) を足していきます。

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { fetchWorkers } from '../tools/worker-list.js';
import { fetchSubmissions } from '../tools/submissions.js';
import { reconcile } from '../../logic/reconcile.js';
import { decideSchedule } from '../../logic/schedule.js';
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

const finalSchema = z.object({
  schedule: scheduleSchema,
  follow: resultSchema,
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

// ---- ステップ3: 今日の督促ステージを決める（営業日ベース・ルールで確定）----
const planStep = createStep({
  id: 'plan',
  inputSchema: z.object({ today: z.string(), follow: resultSchema }),
  outputSchema: finalSchema,
  execute: async ({ inputData }) => {
    const schedule = decideSchedule(inputData.today);
    return { schedule, follow: inputData.follow };
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
  .commit();
