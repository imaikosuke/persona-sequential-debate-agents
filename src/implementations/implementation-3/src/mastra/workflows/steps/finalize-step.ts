/**
 * Implementation 3: 最終化ステップ
 * 結果を整形して返す
 */

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import type { BlackboardState } from "../../types/blackboard";

/**
 * 最終化ステップ
 * 結果を整形して返す
 */
export const finalizeStep = createStep({
  id: "finalize",
  description: "結果の最終化",
  inputSchema: z.object({
    blackboard: z.custom<BlackboardState>(),
    finalStatus: z.string(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    finalDocument: z.string().optional(),
    claims: z.array(z.any()),
    attacks: z.array(z.any()),
    stepCount: z.number(),
    convergenceHistory: z.array(z.number()),
    status: z.string(),
  }),
  execute: ({ inputData }) => {
    const { blackboard, finalStatus } = inputData;

    return Promise.resolve({
      topic: blackboard.topic,
      finalDocument: blackboard.writepad?.finalDraft,
      claims: blackboard.claims,
      attacks: blackboard.attacks,
      stepCount: blackboard.meta.stepCount,
      convergenceHistory: blackboard.meta.convergenceHistory,
      status: finalStatus,
    });
  },
});
