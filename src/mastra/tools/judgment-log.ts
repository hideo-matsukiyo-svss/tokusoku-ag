// 判断ログ(Gold)コネクタ。
// トークンがあれば Notion「判断ログ（Gold）」へ冪等に書き込み、無ければローカルJSON（モック）。
// 冪等キー（我々の entry.id）で重複チェック＝二重書き込み防止。Gold側の「冪等キー」列に入れる。

import fs from 'node:fs';
import path from 'node:path';
import type { JudgmentEntry } from '../../logic/judgment.js';
import { notionEnabled, notion, GOLD_DB } from '../notion/client.js';

// ---- モック用ローカルストア ----
const FILE = path.resolve('.data/judgment-log.json');
function readAll(): JudgmentEntry[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as JudgmentEntry[];
  } catch {
    return [];
  }
}

// 我々の判断タイプ → Gold の各セレクト値へマッピング
function goldFields(entry: JudgmentEntry): {
  トリアージ: string;
  検知結果: string;
  重要度: string;
  ステータス: string | null;
} {
  switch (entry.type) {
    case '要確認エスカレ':
      return { トリアージ: '人レビュー', 検知結果: '要確認', 重要度: '確認', ステータス: '承認待ち' };
    case '経理指示による再連絡':
      return { トリアージ: '人レビュー', 検知結果: '検知', 重要度: '確認', ステータス: '承認待ち' };
    default: // 督促連絡
      return { トリアージ: '自動OK', 検知結果: '検知', 重要度: '記録', ステータス: null };
  }
}

export async function recordJudgment(
  entry: JudgmentEntry,
): Promise<{ recorded: boolean; entry: JudgmentEntry }> {
  // --- モード1：モック（ローカルJSON）---
  if (!notionEnabled() || !GOLD_DB) {
    const all = readAll();
    if (all.some((e) => e.id === entry.id)) return { recorded: false, entry };
    all.push(entry);
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
    return { recorded: true, entry };
  }

  // --- モード2：Notion(Gold) 冪等 upsert ---
  const found = await notion().databases.query({
    database_id: GOLD_DB,
    filter: { property: '冪等キー', rich_text: { equals: entry.id } },
    page_size: 1,
  });
  if (found.results.length > 0) return { recorded: false, entry }; // 既に記録済み＝二重書きしない

  const g = goldFields(entry);
  const properties: any = {
    '判断': { title: [{ text: { content: `${entry.type}: ${entry.workerName}（${entry.targetMonth}）` } }] },
    '冪等キー': { rich_text: [{ text: { content: entry.id } }] },
    '領域': { select: { name: '経理' } },
    '判定型': { select: { name: '型4(機械)' } },
    '検知結果': { select: { name: g.検知結果 } },
    'トリアージ': { select: { name: g.トリアージ } },
    '重要度': { select: { name: g.重要度 } },
    '根拠': { rich_text: [{ text: { content: entry.instruction || '' } }] },
    'メモ': { rich_text: [{ text: { content: `対象月:${entry.targetMonth} / ${entry.workerName} / 判断者:${entry.decidedBy}` } }] },
    '判定日': { date: { start: (entry.decidedAt || '').slice(0, 10) || undefined } },
  };
  if (g.ステータス) properties['ステータス'] = { select: { name: g.ステータス } };

  await notion().pages.create({ parent: { database_id: GOLD_DB }, properties });
  return { recorded: true, entry };
}

/** 記録済みの判断を読む（確認用） */
export async function listJudgments(): Promise<JudgmentEntry[]> {
  if (!notionEnabled() || !GOLD_DB) return readAll();
  const res = await notion().databases.query({ database_id: GOLD_DB, page_size: 100 });
  return res.results.map((p: any): JudgmentEntry => ({
    id: p.properties['冪等キー']?.rich_text?.[0]?.plain_text ?? p.id,
    type: '',
    workerId: '',
    workerName: '',
    targetMonth: '',
    instruction: '',
    decidedBy: '',
    decidedAt: '',
  }));
}
