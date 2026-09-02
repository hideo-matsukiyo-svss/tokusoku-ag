// Mastra インスタンス。ワークフローをここに登録します。
// `mastra dev`（Studio）でもこの登録が起点になります。

import { Mastra } from '@mastra/core';
import { invoiceFollowWorkflow } from './workflows/invoice-follow.workflow.js';

export const mastra = new Mastra({
  workflows: { invoiceFollowWorkflow },
});
