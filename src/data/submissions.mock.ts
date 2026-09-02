// ★モック（ダミー）の「提出済みメール」＝invoice@svss.ltd 受信メール（原本層）相当。
// 4分類の判定を試せるよう、わざと「正常提出」「PDFなし」「複数月分」を混ぜてあります。
// 対象月は今回 2026-08（＝前月分）を想定。

import type { Submission } from '../logic/types.js';

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    // 佐藤さん(w002)：4条件そろう → 提出済み
    fromEmail: 'sato.hanako@example.com',
    workerName: '佐藤 花子',
    receivedAt: '2026-08-31',
    subject: '8月分 請求書送付の件',
    hasPdf: true,
    targetMonth: '2026-08',
  },
  {
    // 田中さん(w001)：メールは来たが PDFなし＆件名が請求書と言い切れない → 要確認
    fromEmail: 'tanaka@example.com',
    workerName: '田中 太郎',
    receivedAt: '2026-09-01',
    subject: '先月分の件でご相談です',
    hasPdf: false,
    targetMonth: '2026-08',
  },
  {
    // 渡辺さん(w006)：8月分（正常）
    fromEmail: 'watanabe.yoko@example.com',
    workerName: 'ワタナベヨウコ',
    receivedAt: '2026-09-01',
    subject: '【請求書】2026年8月',
    hasPdf: true,
    targetMonth: '2026-08',
  },
  {
    // 渡辺さん(w006)：7月分も再送 → 複数月分がまざる → 要確認
    fromEmail: 'watanabe.yoko@example.com',
    workerName: 'ワタナベヨウコ',
    receivedAt: '2026-09-01',
    subject: '【請求書】2026年7月 再送',
    hasPdf: true,
    targetMonth: '2026-07',
  },
];
