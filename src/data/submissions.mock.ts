// ★モック（ダミー）の「提出済みメール」＝invoice@svss.ltd 受信メール（原本層）相当。
// 将来ここを「実際のGmail受信トレイから拾ったデータ」に差し替えます。
// ここに載っている業務委託者＝すでに請求書を送ってくれた人、として突合します。

import type { Submission } from '../logic/types.js';

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    // 佐藤さん（w002）の提出。メールアドレスで一致する。
    fromEmail: 'sato.hanako@example.com',
    workerName: '佐藤 花子',
    receivedAt: '2026-08-31',
    subject: '8月分 請求書送付の件',
  },
  {
    // 渡辺さん（w006）の提出。差出人名が少し違うが、メールで一致する。
    fromEmail: 'watanabe.yoko@example.com',
    workerName: 'ワタナベヨウコ',
    receivedAt: '2026-09-01',
    subject: '【請求書】2026年8月',
  },
];
