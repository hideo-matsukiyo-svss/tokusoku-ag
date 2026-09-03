// 稼働者リスト(Silver)へのステータス書き戻しコネクタ。
// トークンがあれば Notion の該当ページを更新、無ければログのみ（モック）。

import type { FollowStatus } from '../../logic/types.js';
import { notionEnabled, notion } from '../notion/client.js';

export async function updateWorkerStatus(
  pageId: string,
  fields: { submissionStatus?: FollowStatus; lastContactedAt?: string },
): Promise<{ ok: boolean; note: string }> {
  const parts: string[] = [];
  if (fields.submissionStatus) parts.push(`提出ステータス=${fields.submissionStatus}`);
  if (fields.lastContactedAt) parts.push(`最終連絡日=${fields.lastContactedAt}`);
  const who = pageId.length > 8 ? pageId.slice(0, 8) + '…' : pageId;
  const note = `稼働者リスト更新: ${who} ${parts.join(' / ')}`;

  if (!notionEnabled()) return { ok: true, note: note + '（モック）' };

  const properties: any = {};
  if (fields.submissionStatus) {
    properties['請求書提出ステータス'] = { select: { name: fields.submissionStatus } };
  }
  if (fields.lastContactedAt) {
    properties['最終連絡日'] = { date: { start: fields.lastContactedAt } };
  }
  if (Object.keys(properties).length > 0) {
    await notion().pages.update({ page_id: pageId, properties });
  }
  return { ok: true, note };
}
