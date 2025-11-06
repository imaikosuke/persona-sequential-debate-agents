import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

export const initializeStep = createStep({
  id: "initialize",
  description: "ブラックボード初期化（ペルソナ未確定）",
  inputSchema: z.object({
    topic: z.string(),
    tokenBudget: z.number().optional().default(10000),
    maxSteps: z.number().optional().default(10),
  }),
  outputSchema: z.object({
    topic: z.string(),
    tokenBudget: z.number(),
    maxSteps: z.number(),
  }),
  execute: ({ inputData }) => {
    const { topic, tokenBudget, maxSteps } = inputData;
    console.log(`\n========================================`);
    console.log(`トピック: ${topic}`);
    console.log(`========================================\n`);
    return Promise.resolve({ topic, tokenBudget: tokenBudget ?? 10000, maxSteps: maxSteps ?? 10 });
  },
});
