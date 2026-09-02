// 請求書フォローAG を1回動かすエントリ。`npm start` でこれが走ります。
// Step3版：突合（4分類）＋「今日は第何営業日か」で初回／リマインド／締めを判定。
// APIキー不要で動きます。 別日で試す: RUN_DATE=2026-09-01 npm start

import { invoiceFollowWorkflow } from './mastra/workflows/invoice-follow.workflow.js';
import { targetMonthOf } from './logic/reconcile.js';
import { REVIEW_NOTIFY } from './config/notify.js';

const TODAY = process.env.RUN_DATE ?? '2026-09-02';

async function main() {
  const month = targetMonthOf(TODAY);

  const run = await (invoiceFollowWorkflow as any).createRunAsync?.()
    ?? await (invoiceFollowWorkflow as any).createRun();
  const res = await run.start({ inputData: { today: TODAY } });

  if (res.status !== 'success') {
    console.error('ワークフローが正常終了しませんでした:', res.status);
    if (res.error) console.error(res.error);
    process.exit(1);
  }

  const { schedule, follow } = res.result;
  const { pending, submitted, excluded, needsReview } = follow;

  console.log(`\n=== 請求書フォローAG（基準日: ${TODAY} / 対象月: ${month}分）===`);
  console.log(`今日：第${schedule.businessDay}営業日 → ステージ【${schedule.stage}】`);
  console.log(`  ${schedule.note}\n`);

  console.log(`突合: 🔴未提出 ${pending.length} / 🟢提出済み ${submitted.length} / 🟡要確認 ${needsReview.length} / ⚪対象外 ${excluded.length}\n`);

  // 今日の連絡アクション（未提出者に対して）
  console.log('────────── 📮 今日の連絡アクション ──────────');
  if (schedule.stage === '対象外日') {
    console.log('  今日は営業日ではないので、連絡はしません。');
  } else if (schedule.stage === '締め') {
    console.log('  督促期間（第5営業日）は終了。ここからは最終ステータスの確定フェーズです。');
    if (pending.length > 0) {
      console.log('  ※未提出のまま締めを迎えた人（要フォロー）:');
      for (const f of pending) console.log(`    ・${f.worker.name}`);
    }
  } else {
    // 初回 or リマインド
    const label = schedule.stage === '初回'
      ? '初回連絡（送付可否＋請求書作成代行の要否を確認）'
      : 'リマインド連絡';
    if (pending.length === 0) {
      console.log('  未提出者なし。連絡は不要です👍');
    } else {
      console.log(`  ${pending.length}人へ「${label}」を送る予定:`);
      for (const f of pending) {
        const last = f.worker.lastContactedAt ? `前回 ${f.worker.lastContactedAt}` : '初回';
        console.log(`    ・${f.worker.name}（${f.worker.email}） / ${last}`);
      }
    }
  }

  // 要確認は営業日に関係なく、いつでも人へ振る
  console.log('\n────────── 🟡 要確認（人へ）──────────');
  if (needsReview.length === 0) console.log('  （なし）');
  for (const f of needsReview) {
    console.log(`  ・${f.worker.name}`);
    for (const r of f.reviewReasons ?? []) console.log(`      - ${r}`);
    const who = REVIEW_NOTIFY.mentions.map((m) => '@' + m).join(' ');
    console.log(`      → Slack ${REVIEW_NOTIFY.slackChannelLabel} で ${who} に確認依頼（予定）`);
  }

  console.log('\n※文面の中身は Step4 で作り込みます。送信（メール/Slack）は Step7 で実データにつなぎます。\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
