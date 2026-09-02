// Mastra インスタンス。エージェントとワークフローをここに登録します。
// `mastra dev`（Mastraの開発UI）を使うときも、この登録が起点になります。

import { Mastra } from '@mastra/core';
import { toneAgent } from './agents/tone-agent.js';
import { tokusaiWorkflow } from './workflows/tokusai.workflow.js';

export const mastra = new Mastra({
  agents: { toneAgent },
  workflows: { tokusaiWorkflow },
});
