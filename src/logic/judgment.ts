// Gold(判断ログ)に残す「判断」の型と、冪等キーの作り方。
// 設計ブリーフの「判断層＝唯一の真実／冪等に書き込み（同じ判定は二重に書かない）」に対応。

export type JudgmentEntry = {
  id: string;          // 冪等キー（同じ判断は同じID＝二重記録しない）
  type: string;        // 例）'経理指示による再連絡'
  workerId: string;
  workerName: string;
  targetMonth: string; // "YYYY-MM"
  instruction: string; // 経理担当者の指示内容
  decidedBy: string;   // 判断した人（経理担当者名）
  decidedAt: string;   // 記録日時 ISO
};

/**
 * 「経理指示による再連絡」の冪等キー。
 * 同じ日・同じ人・同じ指示なら同じIDになる → 二重に記録しない。
 */
export function reinstructId(today: string, workerId: string, instruction: string): string {
  let h = 0;
  for (const ch of instruction.trim()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${today}_${workerId}_reinstruct_${h.toString(36)}`;
}
