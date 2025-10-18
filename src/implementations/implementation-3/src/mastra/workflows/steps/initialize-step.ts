/**
 * Implementation 3: 初期化ステップ
 * ブラックボードを初期化する
 */

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import type { BlackboardState } from "../../types/blackboard";
import { initializeBlackboard } from "../../utils/blackboard";

/**
 * 初期化ステップ
 * ブラックボードを初期化する
 */
export const initializeStep = createStep({
  id: "initialize",
  description: "ブラックボードの初期化",
  inputSchema: z.object({
    topic: z.string(),
    tokenBudget: z.number().optional().default(10000),
    maxSteps: z.number().optional().default(10),
  }),
  outputSchema: z.object({
    blackboard: z.custom<BlackboardState>(),
    maxSteps: z.number(),
  }),
  execute: ({ inputData }) => {
    const { topic, tokenBudget, maxSteps } = inputData;
    const blackboard = initializeBlackboard(topic, tokenBudget);

    console.log(`\n========================================`);
    console.log(`トピック: ${topic}`);
    console.log(`========================================\n`);

    return Promise.resolve({ blackboard, maxSteps: maxSteps ?? 10 });
  },
});
