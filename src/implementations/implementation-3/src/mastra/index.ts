/**
 * Implementation 3: Mastraインスタンス
 * 単一LLM × 逐次討論（Self-Deliberative Agent）- 簡略化版
 */

import { Mastra } from "@mastra/core";

import { debateAgent } from "./agents";
import { argumentationWorkflow } from "./workflows";

/**
 * Mastraインスタンスの作成
 */
export const mastra = new Mastra({
  agents: {
    debateAgent,
  },
  workflows: {
    argumentationWorkflow,
  },
});
