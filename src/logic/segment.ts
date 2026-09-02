// 顧客セグメント判定：支払い履歴から「優良／通常／要注意」を出し分ける。
// 「常連は優しく、常習犯は少し厳しく」を実現するための材料。
// ここも機械判定（AI不要）。閾値はHideoさんの肌感で調整してください。

import type { Invoice } from './types.js';

export type Segment = '優良' | '通常' | '要注意';

export function decideSegment(invoice: Invoice): Segment {
  const { pastInvoices, lateCount } = invoice.history;

  // 取引が浅い（初回〜2回目）は「通常」扱い。
  if (pastInvoices < 3) return '通常';

  const lateRate = lateCount / pastInvoices;

  // 遅延が3割を超えるなら「要注意」（＝早め・強めに督促してよい相手）
  if (lateRate >= 0.3) return '要注意';

  // これまで遅延ゼロの常連は「優良」（＝丁重に、行き違い前提で）
  if (lateCount === 0) return '優良';

  return '通常';
}

/** セグメントに応じた、トーンへの追記ニュアンス。 */
export function segmentToneHint(segment: Segment): string {
  switch (segment) {
    case '優良':
      return '長年きちんとお支払いいただいている大切な取引先。特に丁重に、恐縮の姿勢で。';
    case '要注意':
      return '過去に遅延が目立つ相手。丁寧さは保ちつつ、期日と事実は曖昧にせず明確に。';
    default:
      return '標準的な取引先。丁寧かつ簡潔に。';
  }
}
