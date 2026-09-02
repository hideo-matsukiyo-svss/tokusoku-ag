// 提出メール（原本層）コネクタ（今はモック）。
// ★将来ここだけを「invoice@svss.ltd の受信メール(Gmail)を読む」処理に差し替えれば、AG本体はそのまま。

import { MOCK_SUBMISSIONS } from '../../data/submissions.mock.js';
import type { Submission } from '../../logic/types.js';

/** 今月ぶんの「請求書が届いたメール」を取得する（今はモック）。 */
export async function fetchSubmissions(): Promise<Submission[]> {
  // TODO(成田さん): ここを invoice@svss.ltd 受信メール(Gmail)取得に差し替え。
  //   例) 件名に「請求書」を含む、当月受信のメールを拾う。
  return MOCK_SUBMISSIONS;
}
