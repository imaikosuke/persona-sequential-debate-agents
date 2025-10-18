/**
 * Implementation 3: 討論ループステップ
 * 対話行為の選択→実行→評価を繰り返す
 */

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { evaluateDiscussion, executeDialogueAct, selectDialogueAct } from "../../agents";
import { DialogueAct } from "../../types";
import type { BlackboardState } from "../../types/blackboard";
import { checkConvergence, updateBlackboard } from "../../utils/blackboard";
import {
  logDeliberationComplete,
  logDialogueActSelection,
  logEvaluationMetrics,
  logExecutionResult,
  logStepStart,
} from "./logging";

/**
 * 討論ループステップ
 * 対話行為の選択→実行→評価を繰り返す
 */
export const deliberationLoopStep = createStep({
  id: "deliberation-loop",
  description: "逐次討論ループ",
  inputSchema: z.object({
    blackboard: z.custom<BlackboardState>(),
    maxSteps: z.number(),
  }),
  outputSchema: z.object({
    blackboard: z.custom<BlackboardState>(),
    finalStatus: z.string(),
  }),
  execute: async ({ inputData }) => {
    let blackboard = inputData.blackboard;
    const maxSteps = inputData.maxSteps ?? 10;
    let shouldContinue = true;

    console.log(`討論ループを開始します（最大${maxSteps}ステップ）\n`);

    while (shouldContinue && blackboard.meta.stepCount < maxSteps) {
      const stepNum = blackboard.meta.stepCount + 1;
      logStepStart(stepNum);

      // 1. 次の対話行為を選択
      console.log("対話行為を選択中...");
      const decision = await selectDialogueAct(blackboard);

      if (!decision) {
        console.error("対話行為の選択に失敗しました");
        break;
      }

      logDialogueActSelection(decision);

      // 2. 対話行為を実行
      console.log("対話行為を実行中...");
      const executionResult = await executeDialogueAct(decision.dialogueAct, blackboard);

      if (!executionResult) {
        console.error("対話行為の実行に失敗しました");
        break;
      }

      logExecutionResult(executionResult);

      // 3. ブラックボードを更新
      blackboard = updateBlackboard(blackboard, executionResult);

      // 4. 収束判定
      if (decision.dialogueAct === DialogueAct.FINALIZE || decision.shouldFinalize) {
        console.log("\n収束判定: 議論を終了します");
        shouldContinue = false;
        break;
      }

      // 5. 判定エージェントによる評価
      console.log("議論の質を評価中...");
      const metrics = await evaluateDiscussion(blackboard);

      if (metrics) {
        logEvaluationMetrics(
          metrics.convergenceScore,
          metrics.beliefConvergence,
          metrics.diversityScore,
        );
        blackboard.meta.convergenceHistory.push(metrics.convergenceScore);
      }

      // 6. 自動収束チェック
      const convergence = checkConvergence(blackboard);
      if (convergence.shouldFinalize) {
        console.log(`\n自動収束: ${convergence.reason}`);
        // 最終文書を生成
        const finalExecution = await executeDialogueAct(DialogueAct.FINALIZE, blackboard);
        if (finalExecution) {
          blackboard = updateBlackboard(blackboard, finalExecution);
        }
        shouldContinue = false;
      }
    }

    const finalStatus =
      blackboard.meta.stepCount >= maxSteps
        ? "最大ステップ数に達しました"
        : "収束条件を満たして終了しました";

    logDeliberationComplete(finalStatus, blackboard.meta.stepCount, blackboard.claims.length);

    return {
      blackboard,
      finalStatus,
    };
  },
});
