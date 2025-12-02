/**
 * Implementation 3: 討論ループステップ（簡略化版）
 * エージェントが自律的に議論を進める
 */

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { selectDialogueAct } from "../../agents/deliberative-agent";
import { executeDialogueAct } from "../../agents/executor-agent";
import { generateFinalDocument } from "../../prompts/final-document";
import { type BlackboardState, DialogueAct } from "../../types";
import { checkConvergence, updateBlackboard } from "../../utils/blackboard";

/**
 * 最終文書を生成する（共通関数）
 * FINALIZEアクションを試行し、失敗した場合はLLMで直接生成
 */
async function ensureFinalDocument(blackboard: BlackboardState): Promise<BlackboardState> {
  const finalDecision = await selectDialogueAct(blackboard);
  if (finalDecision && finalDecision.dialogueAct === DialogueAct.FINALIZE) {
    const finalExecution = await executeDialogueAct(DialogueAct.FINALIZE, blackboard);
    if (finalExecution && finalExecution.finalDocument) {
      return updateBlackboard(blackboard, finalExecution);
    }
  }

  // FINALIZEアクションが生成されなかった場合、またはfinalDocumentがない場合、LLMで最終文書を生成
  console.log("FINALIZEアクションが生成されなかったため、LLMで最終文書を生成します...");
  const finalDocument = await generateFinalDocument(blackboard);
  return {
    ...blackboard,
    writepad: {
      ...blackboard.writepad,
      finalDraft: finalDocument,
    },
  };
}

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

      // 対話行為の選択（DeliberativeAgent）
      console.log("次の対話行為を決定中...");
      const decision = await selectDialogueAct(blackboard);

      if (!decision) {
        console.error("対話行為の選択に失敗しました");
        break;
      }

      console.log(`対話行為: ${decision.dialogueAct}`);
      console.log(`理由: ${decision.reasoning}`);

      // 対話行為の実行（ExecutorAgent）
      console.log("対話行為を実行中...");
      const execution = await executeDialogueAct(decision.dialogueAct, blackboard);

      if (!execution) {
        console.error("対話行為の実行に失敗しました");
        break;
      }

      // ブラックボードを更新（stepCountが増える）
      blackboard = updateBlackboard(blackboard, execution);

      // FINALIZEアクションの場合は終了
      if (decision.dialogueAct === DialogueAct.FINALIZE || decision.shouldFinalize) {
        console.log("\n議論を終了します");
        if (execution.finalDocument) {
          blackboard.writepad.finalDraft = execution.finalDocument;
        }
        break;
      }

      // PROPOSEとCRITIQUEの場合はループを継続

      // アクション実行後の収束チェック
      const convergence = checkConvergence(blackboard, maxSteps);
      if (convergence.shouldFinalize) {
        console.log(`\n収束: ${convergence.reason}`);
        console.log("\n最終文書を生成中...");
        blackboard = await ensureFinalDocument(blackboard);
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
      blackboard = await ensureFinalDocument(blackboard);
    }

    console.log(`\n=== 討論終了 ===`);
    console.log(`ステータス: ${finalStatus}`);
    console.log(`ステップ数: ${blackboard.meta.stepCount}`);
    console.log(`主張数: ${blackboard.claims.length}`);
    console.log(`反論数: ${blackboard.attacks.length}`);
    console.log(`反論数: ${blackboard.attacks.length}件`);

    return {
      blackboard,
      finalStatus,
    };
  },
});
