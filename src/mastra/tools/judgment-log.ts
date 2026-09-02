// Gold(判断ログ)コネクタ（今はモック＝ローカルのJSONファイルに保存）。
// ★将来ここだけを「Notion(Gold 判断ログ)への冪等書き込み」に差し替えれば、AG本体はそのまま。
//   冪等（同じIDは二重に書かない）の挙動も、ここで再現しています。

import fs from 'node:fs';
import path from 'node:path';
import type { JudgmentEntry } from '../../logic/judgment.js';

// ローカルの疑似DB（.data/ は .gitignore 済み）
const FILE = path.resolve('.data/judgment-log.json');

function readAll(): JudgmentEntry[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as JudgmentEntry[];
  } catch {
    return [];
  }
}

/**
 * 判断を1件、冪等に記録する。
 * 既に同じIDがあれば書かずに recorded:false を返す（＝二重記録しない）。
 */
export async function recordJudgment(
  entry: JudgmentEntry,
): Promise<{ recorded: boolean; entry: JudgmentEntry }> {
  // TODO(成田さん): ここを Notion(Gold 判断ログ) への冪等 upsert に差し替え。
  const all = readAll();
  if (all.some((e) => e.id === entry.id)) {
    return { recorded: false, entry };
  }
  all.push(entry);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
  return { recorded: true, entry };
}

/** 記録済みの判断を全部読む（確認用） */
export async function listJudgments(): Promise<JudgmentEntry[]> {
  return readAll();
}
