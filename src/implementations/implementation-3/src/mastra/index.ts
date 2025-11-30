/**
 * Implementation 3: Mastraインスタンス
 * 単一LLM × 逐次討論（Self-Deliberative Agent）- 簡略化版
 */

import { Mastra } from "@mastra/core";

import { debateAgent, deliberativeAgent, executorAgent } from "./agents";
import { argumentationWorkflow } from "./workflows";

/**
 * Mastraインスタンスの作成
 */
export const mastra = new Mastra({
  agents: {
    deliberativeAgent,
    executorAgent,
    debateAgent, // 後方互換性のため残す（非推奨）
  },
  workflows: {
    argumentationWorkflow,
  },
});
