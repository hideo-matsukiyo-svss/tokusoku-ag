// 督促AGを1回動かすエントリ。`npm start` でこれが走ります。
// APIキーが無くてもそのまま動きます（テンプレ文面のドラフトが出ます）。

import { tokusaiWorkflow } from './mastra/workflows/tokusai.workflow.js';

// 「今日」。本番では new Date() に。ここでは動作確認しやすいよう固定。
const TODAY = process.env.RUN_DATE ?? '2026-09-02';

const yen = (n: number) => '¥' + n.toLocaleString('ja-JP');

async function main() {
  console.log(`\n=== 督促AG 実行（基準日: ${TODAY}）===\n`);

  // Mastraワークフローを実行
  const run = await (tokusaiWorkflow as any).createRunAsync?.()
    ?? await (tokusaiWorkflow as any).createRun();
  const result = await run.start({ inputData: { today: TODAY } });

  if (result.status !== 'success') {
    console.error('ワークフローが正常終了しませんでした:', result.status);
    if (result.error) console.error(result.error);
    process.exit(1);
  }

  const drafts = result.result.drafts as any[];

  if (drafts.length === 0) {
    console.log('本日、督促対象の請求はありませんでした。');
    return;
  }

  console.log(`督促対象: ${drafts.length}件\n`);

  // 承認が必要なものを先に目立たせる（HITL）
  const needApproval = drafts.filter((d) => d.needsApproval);
  const auto = drafts.filter((d) => !d.needsApproval);

  console.log(`▼ 自動送信OK: ${auto.length}件 / 要・代表承認: ${needApproval.length}件\n`);

  for (const d of drafts) {
    const flag = d.needsApproval ? '🔴要承認' : '🟢自動OK';
    const stageLabel: Record<string, string> = {
      pre: '予告', first: '1回目', second: '2回目', final: '最終',
    };
    console.log('────────────────────────────────────────');
    console.log(`${flag} [${stageLabel[d.stage]}] ${d.partnerName}（${d.segment}）`);
    console.log(`  請求: ${d.invoiceNo} / ${yen(d.amount)} / 期日 ${d.dueDate} / 超過 ${d.overdueDays}日`);
    console.log(`  差出人: ${d.fromLabel} → 宛先: ${d.partnerEmail}`);
    console.log(`  件名: ${d.subject}`);
    console.log('  --- 本文 ---');
    console.log(d.body.split('\n').map((l: string) => '  ' + l).join('\n'));
    console.log('');
  }

  console.log('────────────────────────────────────────');
  console.log('※これは「下書き」です。実際の送信は人が承認してから（HITL）。');
  console.log('※次の一歩: 🔴要承認 の分をSlackに通知して代表が確認する導線を足す。\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
