// MFコネクタ（今はモック）。
// ★将来ここだけを「MFクラウド請求書 / 会計から実データを取る処理」に差し替えれば、
//   ワークフロー本体は一切変えずに本番稼働できます。
//   （SVSSではMF請求書APIやMF会計MCPが使えるので、成田さんがここを実装する想定）

import { MOCK_INVOICES } from '../../data/invoices.mock.js';
import type { Invoice } from '../../logic/types.js';

/**
 * 未入金の請求書候補を取得する。
 * 今はモックを返すだけ。本番では MF から
 * 「未入金 かつ 期日が近い/過ぎている」請求を取得して同じ形（Invoice[]）で返す。
 */
export async function fetchInvoiceCandidates(): Promise<Invoice[]> {
  // TODO(成田さん): ここを MF 取得に差し替え。
  //  例) MFクラウド請求書の請求一覧 + 入金ステータス、
  //      または MF会計の売掛金(取引)から未消込のものを引く。
  return MOCK_INVOICES;
}
