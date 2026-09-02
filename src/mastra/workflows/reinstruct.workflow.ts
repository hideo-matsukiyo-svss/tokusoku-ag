// ★Step5：経理担当者の割り込み（HITL）＝「文面を指示して再連絡」。
// 図の opt[内容に誤り・確認事項あり] の流れ:
//   ① 経理の指示内容を Gold(判断ログ) に冪等に記録
//   ② 指示を反映した連絡文面を作る
//   ③ 稼働者リストのステータスを更新
// 通常の日次フロー（invoice-follow）とは別に、必要なときに人が起動する想定。

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { fetchWorkers } from '../tools/worker-list.js';
import { recordJudgment } from '../tools/judgment-log.js';
import { updateWorkerStatus } from '../tools/status-update.js';
import { targetMonthOf } from '../../logic/reconcile.js';
import { reinstructId } from '../../logic/judgment.js';
import { buildMessage } from '../../logic/message.js';
import type { Worker } from '../../logic/types.js';

const inputSchema = z.object({
  today: z.string(),
  target: z.string(),      // 稼働者ID または メールアドレス
  instruction: z.string(), // 経理担当者の指示（文面に反映する内容）
  by: z.string(),          // 指示した経理担当者名
});

const messageSchema = z.object({
  channel: z.literal('email'),
  to: z.string(),
  toName: z.string(),
  subject: z.string(),
  body: z.string(),
  stage: z.enum(['初回', 'リマインド', '経理指示反映']),
});

const outputSchema = z.object({
  recorded: z.boolean(),   // 判断ログに新規記録されたか（false＝既に記録済み＝二重防止）
  logId: z.string(),
  statusNote: z.string(),
  message: messageSchema,
});

const step = createStep({
  id: 'reinstruct',
  inputSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    const { today, target, instruction, by } = inputData;
    const month = targetMonthOf(today);

    // 対象の稼働者を特定（ID か メールで探す）
    const workers = await fetchWorkers();
    const worker = workers.find(
      (w: Worker) => w.id === target || w.email.toLowerCase() === target.toLowerCase(),
    );
    if (!worker) {
      throw new Error(`対象の稼働者が見つかりません: ${target}`);
    }

    // ① Gold(判断ログ) に冪等に記録
    const id = reinstructId(today, worker.id, instruction);
    const { recorded } = await recordJudgment({
      id,
      type: '経理指示による再連絡',
      workerId: worker.id,
      workerName: worker.name,
      targetMonth: month,
      instruction,
      decidedBy: by,
      decidedAt: new Date().toISOString(),
    });

    // ② 指示を反映した連絡文面を作る
    const message = buildMessage(worker, month, '経理指示反映', { instruction });

    // ③ 稼働者リストのステータスを更新
    const { note } = await updateWorkerStatus(
      worker.id,
      '経理指示で再連絡',
      `指示者: ${by}`,
    );

    return { recorded, logId: id, statusNote: note, message };
  },
});

export const reinstructWorkflow = createWorkflow({
  id: 'reinstruct-workflow',
  inputSchema,
  outputSchema,
})
  .then(step)
  .commit();
