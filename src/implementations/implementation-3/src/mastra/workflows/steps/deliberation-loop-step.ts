/**
 * Implementation 3: 討論ループステップ（簡略化版）
 * エージェントが自律的に議論を進める
 */

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { decideAndExecute } from "../../agents/debate-agent";
import { generateFinalDocument } from "../../prompts/final-document";
import { DialogueAct } from "../../types";
import type { BlackboardState } from "../../types/blackboard";
import { checkConvergence, updateBlackboard } from "../../utils/blackboard";

/**
 * 討論ループステップ（簡略化版）
 */
export const deliberationLoopStep = createStep({
  id: "deliberation-loop",
  description: "逐次討論ループ（簡略化版）",
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

    console.log(`討論ループを開始します（最大${maxSteps}ステップ）\n`);

    while (blackboard.meta.stepCount < maxSteps) {
      const stepNum = blackboard.meta.stepCount + 1;
      console.log(`\n=== ステップ ${stepNum} ===`);

      // エージェントが次のアクションを決定・実行
      console.log("次のアクションを決定・実行中...");
      const action = await decideAndExecute(blackboard);

      if (!action) {
        console.error("アクションの決定に失敗しました");
        break;
      }

      console.log(`アクション: ${action.action}`);
      console.log(`理由: ${action.reasoning}`);

      // ブラックボードを更新（stepCountが増える）
      blackboard = updateBlackboard(blackboard, action);

      // FINALIZEアクションの場合は終了
      if (action.action === DialogueAct.FINALIZE) {
        console.log("\n議論を終了します");
        break;
      }

      // アクション実行後の収束チェック
      const convergence = checkConvergence(blackboard, maxSteps);
      if (convergence.shouldFinalize) {
        console.log(`\n収束: ${convergence.reason}`);

        // 最終文書を生成（確実に生成する）
        console.log("\n最終文書を生成中...");
        const finalAction = await decideAndExecute(blackboard);
        if (
          finalAction &&
          finalAction.action === DialogueAct.FINALIZE &&
          finalAction.finalDocument
        ) {
          blackboard = updateBlackboard(blackboard, finalAction);
        } else {
          // FINALIZEアクションが生成されなかった場合、またはfinalDocumentがない場合、LLMで最終文書を生成
          console.log("FINALIZEアクションが生成されなかったため、LLMで最終文書を生成します...");
          const finalDocument = await generateFinalDocument(blackboard);
          blackboard.writepad.finalDraft = finalDocument;
        }
        break;
      }
    }

    const finalStatus =
      blackboard.meta.stepCount >= maxSteps
        ? "最大ステップ数に達しました"
        : "収束条件を満たして終了しました";

    // 強制終了時にも最終文書を生成する
    if (blackboard.meta.stepCount >= maxSteps && !blackboard.writepad.finalDraft) {
      console.log("\n最大ステップ数に達したため、最終文書を生成します...");
      const finalAction = await decideAndExecute(blackboard);
      if (finalAction && finalAction.action === DialogueAct.FINALIZE && finalAction.finalDocument) {
        blackboard = updateBlackboard(blackboard, finalAction);
      } else {
        // FINALIZEアクションが生成されなかった場合、LLMで最終文書を生成
        console.log("FINALIZEアクションが生成されなかったため、LLMで最終文書を生成します...");
        const finalDocument = await generateFinalDocument(blackboard);
        blackboard.writepad.finalDraft = finalDocument;
      }
    }

    console.log(`\n=== 討論終了 ===`);
    console.log(`ステータス: ${finalStatus}`);
    console.log(`ステップ数: ${blackboard.meta.stepCount}`);
    console.log(`主張数: ${blackboard.claims.length}`);
    console.log(`反論数: ${blackboard.attacks.length}`);
    console.log(`未解決の反論: ${blackboard.attacks.filter(a => !a.resolved).length}件`);

    return {
      blackboard,
      finalStatus,
    };
  },
});
