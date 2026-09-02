// ★請求書フォローAG のワークフロー本体（Step1〜2版）。
// 今は「取得 → 突合（未提出者の検知）」の2ステップ。
// このあと Step3(営業日タイミング)・Step4(文面)・Step5(HITL)・Step6(書き戻し) を足していきます。

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { fetchWorkers } from '../tools/worker-list.js';
import { fetchSubmissions } from '../tools/submissions.js';
import { reconcile } from '../../logic/reconcile.js';
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
});

const followSchema = z.object({
  worker: workerSchema,
  status: z.enum(['未提出', '提出済み', '対象外']),
  matchedSubmission: submissionSchema.optional(),
});

const resultSchema = z.object({
  pending: z.array(followSchema),
  submitted: z.array(followSchema),
  excluded: z.array(followSchema),
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

// ---- ステップ2: 突合して未提出者を検知（ルールで確定）----
const reconcileStep = createStep({
  id: 'reconcile',
  inputSchema: z.object({
    today: z.string(),
    workers: z.array(workerSchema),
    submissions: z.array(submissionSchema),
  }),
  outputSchema: resultSchema,
  execute: async ({ inputData }) => {
    return reconcile(
      inputData.workers as Worker[],
      inputData.submissions as Submission[],
    );
  },
});

// ---- ワークフロー組み立て ----
export const invoiceFollowWorkflow = createWorkflow({
  id: 'invoice-follow-workflow',
  inputSchema: z.object({ today: z.string() }),
  outputSchema: resultSchema,
})
  .then(fetchStep)
  .then(reconcileStep)
  .commit();
