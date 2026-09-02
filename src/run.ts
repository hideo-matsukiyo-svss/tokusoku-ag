// 請求書フォローAG を1回動かすエントリ。`npm start` でこれが走ります。
// Step1〜2版：稼働者リストと提出メールを突合し、未提出者を検知して表示します。
// APIキー不要で動きます。

import { invoiceFollowWorkflow } from './mastra/workflows/invoice-follow.workflow.js';

// 「今日」。本番では new Date() 由来に。ここでは動作確認しやすいよう固定。
const TODAY = process.env.RUN_DATE ?? '2026-09-02';

async function main() {
  console.log(`\n=== 請求書フォローAG（Step1〜2：未提出者の検知）基準日: ${TODAY} ===\n`);

  const run = await (invoiceFollowWorkflow as any).createRunAsync?.()
    ?? await (invoiceFollowWorkflow as any).createRun();
  const result = await run.start({ inputData: { today: TODAY } });

  if (result.status !== 'success') {
    console.error('ワークフローが正常終了しませんでした:', result.status);
    if (result.error) console.error(result.error);
    process.exit(1);
  }

  const { pending, submitted, excluded } = result.result;

  console.log(`稼働者リスト突合の結果:`);
  console.log(`  🔴 未提出（督促対象）: ${pending.length}人`);
  console.log(`  🟢 提出済み            : ${submitted.length}人`);
  console.log(`  ⚪ 対象外              : ${excluded.length}人\n`);

  console.log('────────── 🔴 未提出（今月これから督促する人）──────────');
  if (pending.length === 0) {
    console.log('  （なし。全員提出済み！）');
  } else {
    for (const f of pending) {
      const last = f.worker.lastContactedAt
        ? `最終連絡 ${f.worker.lastContactedAt}`
        : '未連絡';
      console.log(`  ・${f.worker.name}（${f.worker.email}） / ${last}`);
    }
  }

  console.log('\n────────── 🟢 提出済み ──────────');
  for (const f of submitted) {
    const s = f.matchedSubmission;
    console.log(`  ・${f.worker.name} … 「${s?.subject}」(${s?.receivedAt} 受信)`);
  }

  console.log('\n────────── ⚪ 対象外 ──────────');
  for (const f of excluded) {
    const reason = f.worker.excluded
      ? (f.worker.excludedReason ?? '対象外フラグ')
      : '今月は稼働なし';
    console.log(`  ・${f.worker.name} … ${reason}`);
  }

  console.log('\n※ここまでが「未提出者の検知」。次の Step3〜 で、この🔴の人へ');
  console.log('  営業日に応じた連絡文面（初回／リマインド）を作っていきます。\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
