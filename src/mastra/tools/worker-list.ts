// 稼働者リスト(Silver)コネクタ。
// トークンがあれば Notion「👥社員・ビジネスパートナーDB」から取得、無ければモック。
// 抽出条件：雇用形態=業務委託 かつ ステータス=在籍（＝今月請求書を出すべき業務委託者）。

import { MOCK_WORKERS } from '../../data/workers.mock.js';
import type { Worker } from '../../logic/types.js';
import { notionEnabled, notion, WORKERS_DB } from '../notion/client.js';

function plainText(rich: any[] | undefined): string {
  return (rich ?? []).map((t) => t.plain_text).join('');
}

export async function fetchWorkers(): Promise<Worker[]> {
  if (!notionEnabled() || !WORKERS_DB) return MOCK_WORKERS;

  const res = await notion().databases.query({
    database_id: WORKERS_DB,
    filter: {
      and: [
        { property: '雇用形態', select: { equals: '業務委託' } },
        { property: 'ステータス', select: { equals: '在籍' } },
      ],
    },
    page_size: 100,
  });

  return res.results.map((p: any): Worker => {
    const pr = p.properties;
    return {
      id: p.id, // ← NotionのページID。status-update はこれで行を更新する
      name: plainText(pr['氏名']?.title),
      email: pr['メールアドレス']?.email ?? '',
      workedThisMonth: pr['今月稼働']?.checkbox ?? false,
      excluded: pr['請求書対象外']?.checkbox ?? false,
      excludedReason: plainText(pr['対象外理由']?.rich_text) || undefined,
      lastContactedAt: pr['最終連絡日']?.date?.start || undefined,
    };
  });
}
