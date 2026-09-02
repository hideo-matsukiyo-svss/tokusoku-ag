// ★督促AGのワークフロー本体（Mastra）。
// 「取得 → 判定して下書き作成 → （任意で）AIでトーン調整」の3ステップ。
// 各ステップの入出力を zod で型付けしているので、どこで何が渡るか追いやすいです。

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { fetchInvoiceCandidates } from '../tools/mf-invoices.js';
import { decideStage } from '../../logic/overdue.js';
import { overdueDays } from '../../logic/overdue.js';
import { decideSegment, segmentToneHint } from '../../logic/segment.js';
import { LADDER_RULES } from '../../logic/ladder.js';
import { buildSubject, buildBody } from '../../logic/template.js';
import { toneAgent } from '../agents/tone-agent.js';
import type { Invoice } from '../../logic/types.js';

// ---- スキーマ（データの形）----
const invoiceSchema = z.object({
  invoiceNo: z.string(),
  partnerName: z.string(),
  partnerEmail: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  paid: z.boolean(),
  history: z.object({
    pastInvoices: z.number(),
    lateCount: z.number(),
  }),
});

const draftSchema = z.object({
  invoiceNo: z.string(),
  partnerName: z.string(),
  partnerEmail: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  overdueDays: z.number(),
  segment: z.string(),
  stage: z.enum(['pre', 'first', 'second', 'final']),
  fromLabel: z.string(),
  needsApproval: z.boolean(),
  subject: z.string(),
  body: z.string(),
});

// ---- ステップ1: MFから請求候補を取得 ----
const fetchStep = createStep({
  id: 'fetch-invoices',
  inputSchema: z.object({ today: z.string() }),
  outputSchema: z.object({
    today: z.string(),
    invoices: z.array(invoiceSchema),
  }),
  execute: async ({ inputData }) => {
    const invoices = await fetchInvoiceCandidates();
    return { today: inputData.today, invoices };
  },
});

// ---- ステップ2: 判定して督促ドラフトを作る（AI不要・機械判定）----
const buildDraftsStep = createStep({
  id: 'build-drafts',
  inputSchema: z.object({
    today: z.string(),
    invoices: z.array(invoiceSchema),
  }),
  outputSchema: z.object({ drafts: z.array(draftSchema) }),
  execute: async ({ inputData }) => {
    const today = new Date(inputData.today + 'T00:00:00');
    const drafts = [];

    for (const inv of inputData.invoices as Invoice[]) {
      const stage = decideStage(inv, today);
      if (!stage) continue; // 対象外はスキップ

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
        body: buildBody(stage, inv),
      });
    }

    return { drafts };
  },
});

// ---- ステップ3: （任意）AIでトーンを整える。キー無ければ素通り ----
const tonePolishStep = createStep({
  id: 'tone-polish',
  inputSchema: z.object({ drafts: z.array(draftSchema) }),
  outputSchema: z.object({ drafts: z.array(draftSchema) }),
  execute: async ({ inputData }) => {
    const hasKey = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
    if (!hasKey) {
      // APIキーが無い＝AIは使わず、テンプレ文面のまま返す。
      return { drafts: inputData.drafts };
    }

    const polished = [];
    for (const d of inputData.drafts) {
      const rule = LADDER_RULES[d.stage as keyof typeof LADDER_RULES];
      const prompt = [
        `督促段階: ${rule.label}`,
        `トーン指示: ${rule.tone}`,
        `顧客セグメント: ${d.segment}（${segmentToneHint(d.segment as any)}）`,
        '',
        '以下の督促メール本文を、事実は変えずにトーンだけ整えてください:',
        '---',
        d.body,
      ].join('\n');

      try {
        const res = await toneAgent.generate(prompt);
        polished.push({ ...d, body: res.text?.trim() || d.body });
      } catch {
        // AI呼び出しに失敗しても、テンプレ文面で処理を止めない。
        polished.push(d);
      }
    }
    return { drafts: polished };
  },
});

// ---- ワークフロー組み立て ----
export const tokusaiWorkflow = createWorkflow({
  id: 'tokusai-workflow',
  inputSchema: z.object({ today: z.string() }),
  outputSchema: z.object({ drafts: z.array(draftSchema) }),
})
  .then(fetchStep)
  .then(buildDraftsStep)
  .then(tonePolishStep)
  .commit();
