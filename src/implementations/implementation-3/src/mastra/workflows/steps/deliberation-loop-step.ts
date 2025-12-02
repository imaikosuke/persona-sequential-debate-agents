/**
 * Implementation 3: 討論ループステップ（簡略化版）
 * エージェントが自律的に議論を進める
 */

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { selectDialogueAct } from "../../agents/deliberative-agent";
import { executeDialogueAct } from "../../agents/executor-agent";
import { type BlackboardState, DialogueAct } from "../../types";
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
        break;
      }

      // PROPOSEとCRITIQUEの場合はループを継続

      // アクション実行後の収束チェック
      const convergence = checkConvergence(blackboard, maxSteps);
      if (convergence.shouldFinalize) {
        console.log(`\n収束: ${convergence.reason}`);
        console.log("\n最終文書はfinalize-stepで生成されます。");
        break;
      }
    }

    const finalStatus =
      blackboard.meta.stepCount >= maxSteps
        ? "最大ステップ数に達しました"
        : "収束条件を満たして終了しました";

    // 強制終了時にも最終文書を生成する（finalize-stepで生成される）
    if (blackboard.meta.stepCount >= maxSteps) {
      console.log("\n最大ステップ数に達しました");
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
