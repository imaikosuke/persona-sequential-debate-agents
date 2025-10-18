/**
 * Implementation 3: Mastraインスタンス
 * 単一LLM × 逐次討論（Self-Deliberative Agent）
 */

import { Mastra } from "@mastra/core";

import { deliberativeAgent, executorAgent, judgeAgent } from "./agents";
import { argumentationWorkflow } from "./workflows";

/**
 * Mastraインスタンスの作成
 */
export const mastra = new Mastra({
  agents: {
    deliberativeAgent,
    executorAgent,
    judgeAgent,
  },
  workflows: {
    argumentationWorkflow,
  },
});
