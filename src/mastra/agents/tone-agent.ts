// 文面のトーンを調整する「AI担当」エージェント（任意）。
// APIキーが無ければ使いません（テンプレそのままで動きます）。
// ここが「機械ではできない、言い回しの調整」をAIに任せる部分です。

import { Agent } from '@mastra/core/agent';

// モデルは provider/model の文字列で指定（Mastraのモデルルーター）。
// 環境変数 TONE_MODEL があればそれを、無ければ軽量モデルを既定に。
const model = process.env.TONE_MODEL ?? 'openai/gpt-5-mini';

export const toneAgent = new Agent({
  id: 'tone-agent',
  name: '督促トーン調整AG',
  model,
  instructions: [
    'あなたはSVSS株式会社の経理担当として、請求書の督促メールの「トーン」を整えます。',
    '守ること:',
    '- 事実（請求書番号・金額・期日）は絶対に変えない。',
    '- 日本のビジネスメールとして自然で、失礼のない敬語にする。',
    '- 指定されたトーン指示と顧客セグメントのニュアンスを反映する。',
    '- 誇張・脅し・過度な謝罪はしない。簡潔に。',
    '出力は本文テキストのみ。前置きや解説は書かない。',
  ].join('\n'),
});
