import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { selectDialogueActWithPersona } from "../../agents/deliberative-agent";
import { generateFinalDocument } from "../../agents/final-writer-agent";
import { executeDialogueActWithPersona } from "../../agents/multi-executor-agent";
import type { MultiPersonaBlackboard } from "../../types";
import { DialogueAct } from "../../types";
import {
  calculateConsensusLevel,
  checkConvergence,
  recalcClaimConfidences,
  updateBlackboard,
} from "../../utils/blackboard";

export const deliberationLoopStep = createStep({
  id: "deliberation-loop",
  description: "マルチペルソナ逐次討論ループ",
  inputSchema: z.object({
    blackboard: z.custom<MultiPersonaBlackboard>(),
    maxSteps: z.number(),
  }),
  outputSchema: z.object({
    blackboard: z.custom<MultiPersonaBlackboard>(),
    finalStatus: z.string(),
  }),
  execute: async ({ inputData }) => {
    let blackboard = inputData.blackboard;
    const maxSteps = inputData.maxSteps ?? 10;
    let shouldContinue = true;

    console.log(`マルチペルソナ逐次討論を開始（最大${maxSteps}ステップ）\n`);

    while (shouldContinue && blackboard.meta.stepCount < maxSteps) {
      const stepNum = blackboard.meta.stepCount + 1;
      console.log(`\n=== ステップ ${stepNum} ===`);

      // 対話行為の選択（エージェントが自律的に判断）
      console.log("次のアクションを決定・実行中...");
      const decision = await selectDialogueActWithPersona(blackboard);
      if (!decision) {
        console.error("対話行為の選択に失敗しました");
        break;
      }

      // ペルソナ選択（直近のペルソナを回避）
      const pickNotLast = () => {
        const lastId = blackboard.meta.lastSelectedPersonaId;
        const notLast = blackboard.personas.find(p => p.id !== lastId);
        return notLast ?? blackboard.personas[0];
      };

      let persona = blackboard.personas.find(p => p.id === decision.selectedPersonaId);
      if (!persona || persona.id === blackboard.meta.lastSelectedPersonaId) {
        persona = pickNotLast();
      }

      console.log(`アクション: ${decision.dialogueAct}`);
      console.log(`担当ペルソナ: ${persona.name}`);
      console.log(`理由: ${decision.reasoning}`);

      const execution = await executeDialogueActWithPersona(
        decision.dialogueAct,
        persona,
        blackboard,
      );
      if (!execution) {
        console.error("対話行為の実行に失敗しました");
        break;
      }

      blackboard = updateBlackboard(blackboard, execution);

      // 攻撃・クロス参照に基づいて信念度を再計算
      blackboard = recalcClaimConfidences(blackboard);

      // 直近の選択ペルソナを記録
      blackboard.meta.lastSelectedPersonaId = persona.id;

      // 合意レベル更新
      blackboard.consensusLevel = calculateConsensusLevel(blackboard);

      // 収束チェック（implementation-3の方針を取り入れ）
      const conv = checkConvergence(blackboard, maxSteps);
      if (conv.shouldFinalize) {
        console.log(`\n収束: ${conv.reason}`);

        // 最終文書を生成（確実に生成する）
        console.log("\n最終文書を生成中...");
        if (!blackboard.writepad.finalDraft) {
          // FINALIZEアクションを試行
          const finalDecision = await selectDialogueActWithPersona(blackboard);
          if (
            finalDecision &&
            finalDecision.dialogueAct === DialogueAct.FINALIZE &&
            finalDecision.selectedPersonaId
          ) {
            const finalPersona = blackboard.personas.find(
              p => p.id === finalDecision.selectedPersonaId,
            );
            if (finalPersona) {
              const finalExecution = await executeDialogueActWithPersona(
                DialogueAct.FINALIZE,
                finalPersona,
                blackboard,
              );
              if (finalExecution && finalExecution.finalDocument) {
                blackboard = updateBlackboard(blackboard, finalExecution);
              }
            }
          }

          // FINALIZEアクションが生成されなかった場合、またはfinalDocumentがない場合、LLMで最終文書を生成
          if (!blackboard.writepad.finalDraft) {
            console.log("FINALIZEアクションが生成されなかったため、LLMで最終文書を生成します...");
            const finalDocument = await generateFinalDocument(blackboard);
            blackboard.writepad.finalDraft = finalDocument;
          }
        }
        shouldContinue = false;
        break;
      }

      if (decision.dialogueAct === DialogueAct.FINALIZE || decision.shouldFinalize) {
        // FINALIZEアクションが実行された場合、最終文書を確認
        if (execution.finalDocument) {
          blackboard.writepad.finalDraft = execution.finalDocument;
        } else if (!blackboard.writepad.finalDraft) {
          // finalDocumentがない場合、LLMで最終文書を生成
          console.log("\n最終文書を生成中...");
          const finalDocument = await generateFinalDocument(blackboard);
          blackboard.writepad.finalDraft = finalDocument;
        }
        shouldContinue = false;
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
      const finalDecision = await selectDialogueActWithPersona(blackboard);
      if (
        finalDecision &&
        finalDecision.dialogueAct === DialogueAct.FINALIZE &&
        finalDecision.selectedPersonaId
      ) {
        const finalPersona = blackboard.personas.find(
          p => p.id === finalDecision.selectedPersonaId,
        );
        if (finalPersona) {
          const finalExecution = await executeDialogueActWithPersona(
            DialogueAct.FINALIZE,
            finalPersona,
            blackboard,
          );
          if (finalExecution && finalExecution.finalDocument) {
            blackboard = updateBlackboard(blackboard, finalExecution);
          }
        }
      }

      // FINALIZEアクションが生成されなかった場合、LLMで最終文書を生成
      if (!blackboard.writepad.finalDraft) {
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
    console.log(`反論数: ${blackboard.attacks.length}件`);

    return { blackboard, finalStatus };
  },
});
