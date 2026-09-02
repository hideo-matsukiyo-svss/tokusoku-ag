// 稼働者リスト(Silver)へのステータス更新コネクタ（今はモック＝ログ出力のみ）。
// ★将来ここだけを「Notion(Silver 稼働者リスト)の該当行を更新」に差し替え。

export async function updateWorkerStatus(
  workerId: string,
  status: string,
  memo?: string,
): Promise<{ ok: boolean; note: string }> {
  // TODO(成田さん): ここを Notion(Silver) の行更新に差し替え。
  const note = `稼働者リスト更新（予定）: ${workerId} → 「${status}」${memo ? ` / ${memo}` : ''}`;
  return { ok: true, note };
}
