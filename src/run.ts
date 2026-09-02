// 請求書フォローAG を1回動かすエントリ。`npm start` でこれが走ります。
// Step2.5版：稼働者リストと提出メールを突合し、4分類（未提出/提出済み/対象外/要確認）で表示。
// APIキー不要で動きます。

import { invoiceFollowWorkflow } from './mastra/workflows/invoice-follow.workflow.js';
import { targetMonthOf } from './logic/reconcile.js';
import { REVIEW_NOTIFY } from './config/notify.js';

const TODAY = process.env.RUN_DATE ?? '2026-09-02';

async function main() {
  const month = targetMonthOf(TODAY);
  console.log(`\n=== 請求書フォローAG（基準日: ${TODAY} / 対象月: ${month}分）===\n`);

  const run = await (invoiceFollowWorkflow as any).createRunAsync?.()
    ?? await (invoiceFollowWorkflow as any).createRun();
  const result = await run.start({ inputData: { today: TODAY } });

  if (result.status !== 'success') {
    console.error('ワークフローが正常終了しませんでした:', result.status);
    if (result.error) console.error(result.error);
    process.exit(1);
  }

  const { pending, submitted, excluded, needsReview } = result.result;

  console.log('稼働者リスト突合の結果:');
  console.log(`  🔴 未提出（督促対象）: ${pending.length}人`);
  console.log(`  🟢 提出済み            : ${submitted.length}人`);
  console.log(`  🟡 要確認（人へ）      : ${needsReview.length}人`);
  console.log(`  ⚪ 対象外              : ${excluded.length}人\n`);

  console.log('────────── 🔴 未提出（今月これから督促する人）──────────');
  if (pending.length === 0) console.log('  （なし）');
  for (const f of pending) {
    const last = f.worker.lastContactedAt ? `最終連絡 ${f.worker.lastContactedAt}` : '未連絡';
    console.log(`  ・${f.worker.name}（${f.worker.email}） / ${last}`);
  }

  console.log('\n────────── 🟢 提出済み ──────────');
  if (submitted.length === 0) console.log('  （なし）');
  for (const f of submitted) {
    const s = f.matchedSubmission;
    console.log(`  ・${f.worker.name} … 「${s?.subject}」(${s?.receivedAt} 受信)`);
  }

  console.log('\n────────── 🟡 要確認（自動で決めず人へ振る）──────────');
  if (needsReview.length === 0) console.log('  （なし）');
  for (const f of needsReview) {
    console.log(`  ・${f.worker.name}`);
    for (const r of f.reviewReasons ?? []) console.log(`      - ${r}`);
    // 実際のSlack送信は Step7 でつなぐ。今は「印」だけ。
    const who = REVIEW_NOTIFY.mentions.map((m) => '@' + m).join(' ');
    console.log(`      → Slack ${REVIEW_NOTIFY.slackChannelLabel} で ${who} に確認依頼（予定）`);
  }

  console.log('\n────────── ⚪ 対象外 ──────────');
  if (excluded.length === 0) console.log('  （なし）');
  for (const f of excluded) {
    const reason = f.worker.excluded ? (f.worker.excludedReason ?? '対象外フラグ') : '今月は稼働なし';
    console.log(`  ・${f.worker.name} … ${reason}`);
  }

  console.log('\n※次の Step3 で、🔴未提出の人へ「営業日に応じた連絡文面」を作ります。');
  console.log('※🟡要確認のSlack送信、🟢🔴のメール送信は Step7 で実データにつなぎます。\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
