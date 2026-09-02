// 稼働者リスト(Silver層)コネクタ（今はモック）。
// ★将来ここだけを「Notionの稼働者リストから取得」に差し替えれば、AG本体はそのまま。

import { MOCK_WORKERS } from '../../data/workers.mock.js';
import type { Worker } from '../../logic/types.js';

/** 今月の稼働者リストを取得する（今はモック）。 */
export async function fetchWorkers(): Promise<Worker[]> {
  // TODO(成田さん): ここを Notion(Silver) 取得に差し替え。
  return MOCK_WORKERS;
}
