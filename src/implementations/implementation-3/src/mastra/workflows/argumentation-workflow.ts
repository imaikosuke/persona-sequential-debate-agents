/**
 * Implementation 3: ArgumentationWorkflow
 * 自律的な逐次討論ワークフロー（MVP版）
 */

import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { deliberationLoopStep, finalizeStep, initializeStep } from "./steps";

/**
 * ArgumentationWorkflow
 * 自律的な逐次討論を実行するワークフロー
 *
 * このワークフローは以下の3つのステップで構成されます：
 * 1. initialize: ブラックボードを初期化
 * 2. deliberation-loop: 対話行為の選択→実行→評価を繰り返す
 * 3. finalize: 結果を整形して返す
 */
export const argumentationWorkflow = createWorkflow({
  id: "argumentationWorkflow",
  inputSchema: z.object({
    topic: z.string(),
    tokenBudget: z.number().optional().default(10000),
    maxSteps: z.number().optional().default(10),
  }),
  outputSchema: z.object({
    topic: z.string(),
    argument: z.string().optional(),
    claims: z.array(z.any()),
    attacks: z.array(z.any()),
    stepCount: z.number(),
    status: z.string(),
  }),
})
  .then(initializeStep)
  .then(deliberationLoopStep)
  .then(finalizeStep)
  .commit();
