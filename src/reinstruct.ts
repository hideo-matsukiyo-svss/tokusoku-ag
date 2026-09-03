// 経理担当者の割り込み（HITL）を動かすエントリ。`npm run reinstruct` で走ります。
// 使い方（環境変数で指定。未指定ならサンプルで動く）:
//   TARGET=w003 \
//   INSTRUCTION="振込先が変更になっています。最新の情報をご確認ください。" \
//   BY=松清 \
//   npm run reinstruct
//
// TARGET は稼働者ID(例 w003)またはメールアドレス。

import { reinstructWorkflow } from './mastra/workflows/reinstruct.workflow.js';
import { listJudgments } from './mastra/tools/judgment-log.js';

const TODAY = process.env.RUN_DATE
  ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
const TARGET = process.env.TARGET ?? 'w003'; // 既定: 鈴木一郎
const INSTRUCTION =
  process.env.INSTRUCTION ??
  '恐れ入りますが、今月は締めの都合上、明日中のご送付にご協力をお願いいたします。';
const BY = process.env.BY ?? '松清';

function printMessage(m: any) {
  console.log(`  件名: ${m.subject}`);
  console.log(`  宛先: ${m.toName} <${m.to}>`);
  console.log(m.body.split('\n').map((l: string) => '  │ ' + l).join('\n'));
}

async function main() {
  console.log(`\n=== 経理指示による再連絡（HITL）基準日: ${TODAY} ===`);
  console.log(`対象: ${TARGET} / 指示者: ${BY}`);
  console.log(`指示内容: ${INSTRUCTION}\n`);

  const run = await (reinstructWorkflow as any).createRunAsync?.()
    ?? await (reinstructWorkflow as any).createRun();
  const res = await run.start({
    inputData: { today: TODAY, target: TARGET, instruction: INSTRUCTION, by: BY },
  });

  if (res.status !== 'success') {
    console.error('失敗しました:', res.status);
    if (res.error) console.error(res.error);
    process.exit(1);
  }

  const { recorded, logId, statusNote, message } = res.result;

  console.log('① Gold(判断ログ)へ記録');
  console.log(`   ${recorded ? '✅ 新規記録しました' : '↩️ 既に記録済み（二重記録しない＝冪等）'}  id=${logId}`);
  console.log('\n② 指示を反映した連絡文面');
  printMessage(message);
  console.log('\n③ ' + statusNote);

  const all = await listJudgments();
  console.log(`\n判断ログの累計件数: ${all.length}（.data/judgment-log.json に保存）`);
  console.log('※もう一度同じ指示で実行すると「既に記録済み」になります（冪等の確認）。');
  console.log('※実際のSlack/メール送信・Notion記録は Step7 で実データにつなぎます。\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
