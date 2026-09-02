// 請求書フォローAG を1回動かすエントリ。`npm start` でこれが走ります。
// Step4版：突合(4分類) ＋ 営業日ステージ ＋ 連絡文面(初回/リマインド/経理指示反映)。
// APIキー不要。 別日で試す: RUN_DATE=2026-09-01 npm start

import { invoiceFollowWorkflow } from './mastra/workflows/invoice-follow.workflow.js';
import { targetMonthOf } from './logic/reconcile.js';
import { buildMessage } from './logic/message.js';
import { REVIEW_NOTIFY } from './config/notify.js';

const TODAY = process.env.RUN_DATE ?? '2026-09-02';

function printMessage(m: any, indent = '  ') {
  console.log(`${indent}件名: ${m.subject}`);
  console.log(`${indent}宛先: ${m.toName} <${m.to}>`);
  console.log(m.body.split('\n').map((l: string) => indent + '│ ' + l).join('\n'));
}

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

  const { schedule, follow, drafts, writeback } = res.result;
  const { pending, submitted, excluded, needsReview } = follow;

  console.log(`\n=== 請求書フォローAG（基準日: ${TODAY} / 対象月: ${month}分）===`);
  console.log(`今日：第${schedule.businessDay}営業日 → ステージ【${schedule.stage}】`);
  console.log(`  ${schedule.note}\n`);
  console.log(`突合: 🔴未提出 ${pending.length} / 🟢提出済み ${submitted.length} / 🟡要確認 ${needsReview.length} / ⚪対象外 ${excluded.length}\n`);

  // 今日 未提出者へ送る「連絡文面の下書き」
  console.log('────────── ✉️ 今日の連絡ドラフト ──────────');
  if (schedule.stage === '対象外日') {
    console.log('  今日は営業日ではないので、連絡はしません。');
  } else if (schedule.stage === '締め') {
    console.log('  督促期間は終了（確定フェーズ）。');
    if (pending.length > 0) {
      console.log('  ※未提出のまま締めを迎えた人（要フォロー）:');
      for (const f of pending) console.log(`    ・${f.worker.name}`);
    }
  } else if (drafts.length === 0) {
    console.log('  未提出者なし。連絡は不要です👍');
  } else {
    console.log(`  ${drafts.length}件（ステージ：${schedule.stage}）\n`);
    for (const m of drafts) {
      printMessage(m);
      console.log('');
    }
  }

  // 経理指示反映の見本（Step5でHITL入力とつなぎます）
  if (pending.length > 0) {
    console.log('────────── 🧑‍💼 経理指示反映の例（Step5で実接続）──────────');
    const sample = buildMessage(
      pending[0].worker,
      month,
      '経理指示反映',
      { instruction: '恐れ入りますが、今月は締めの都合上、明日中のご送付にご協力をお願いいたします。' },
    );
    printMessage(sample);
    console.log('');
  }

  // 要確認（人へ）
  console.log('────────── 🟡 要確認（人へ）──────────');
  if (needsReview.length === 0) console.log('  （なし）');
  for (const f of needsReview) {
    console.log(`  ・${f.worker.name}`);
    for (const r of f.reviewReasons ?? []) console.log(`      - ${r}`);
    const who = REVIEW_NOTIFY.mentions.map((x: string) => '@' + x).join(' ');
    console.log(`      → Slack ${REVIEW_NOTIFY.slackChannelLabel} で ${who} に確認依頼（予定）`);
  }

  // 状態の書き戻し（Gold判断ログ＋Silver稼働者リスト）
  console.log('\n────────── 🗂 記録（Gold判断ログ＋Silver書き戻し）──────────');
  if (writeback.contacts.length > 0) {
    for (const c of writeback.contacts) {
      console.log(`  督促 ${c.name}: ${c.recorded ? '✅ 記録' : '↩️ 本日分は記録済み（二重督促しない）'}`);
    }
  }
  if (writeback.reviews.length > 0) {
    for (const r of writeback.reviews) {
      console.log(`  要確認 ${r.name}: ${r.recorded ? '✅ 記録' : '↩️ 本日分は記録済み'}`);
    }
  }
  if (writeback.finalized.length > 0) {
    console.log('  【締め】最終ステータスを稼働者リストへ反映:');
    for (const f of writeback.finalized) console.log(`    ・${f.name} → ${f.status}`);
  }
  if (
    writeback.contacts.length === 0 &&
    writeback.reviews.length === 0 &&
    writeback.finalized.length === 0
  ) {
    console.log('  （記録対象なし）');
  }

  console.log('\n※これは下書きです。実際の送信（メール/Slack）とNotion記録は Step7 でつなぎます。');
  console.log('※同じ日にもう一度 npm start すると、督促は「記録済み」になります（＝二重督促防止）。\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
