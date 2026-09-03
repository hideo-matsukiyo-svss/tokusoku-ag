// Notion接続の土台。トークンが設定されているときだけ実接続します。
// 未設定なら notionEnabled() が false を返し、各コネクタはモックにフォールバックします。

import { Client } from '@notionhq/client';

/** Notion実接続が有効か（トークンがあるか） */
export function notionEnabled(): boolean {
  return !!process.env.NOTION_TOKEN;
}

let _client: Client | null = null;

/** Notionクライアント（使い回し） */
export function notion(): Client {
  if (!_client) _client = new Client({ auth: process.env.NOTION_TOKEN });
  return _client;
}

// 対象DBのID（.env で指定）
export const WORKERS_DB = process.env.NOTION_WORKERS_DB ?? ''; // 👥社員・ビジネスパートナーDB（Silver）
export const GOLD_DB = process.env.NOTION_GOLD_DB ?? '';       // 判断ログ（Gold）
