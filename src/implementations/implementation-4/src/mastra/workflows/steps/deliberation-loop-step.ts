import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { selectDialogueActWithPersona } from "../../agents/deliberative-agent";
import { evaluateDiscussionPanel } from "../../agents/judge-panel-agent";
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

    console.log(`逐次討論を開始（最大${maxSteps}ステップ）`);

    while (shouldContinue && blackboard.meta.stepCount < maxSteps) {
      console.log(`\n--- Step ${blackboard.meta.stepCount + 1} ---`);

      // 対話行為の選択
      const decision = await selectDialogueActWithPersona(blackboard);
      if (!decision) {
        console.error("対話行為の選択に失敗しました");
        break;
      }

      // 早期は反駁を強制（攻撃が少ない場合）
      const needCritique =
        blackboard.attacks.length < 2 ||
        (blackboard.meta.stepCount < 5 && blackboard.attacks.length < 3);
      const chosenAct =
        needCritique && decision.dialogueAct !== DialogueAct.FINALIZE
          ? DialogueAct.CRITIQUE
          : decision.dialogueAct;

      // ペルソナ選択（直近のペルソナを回避）
      // Implementation-2と同様にロールに依存しない
      const pickNotLast = () => {
        const lastId = blackboard.meta.lastSelectedPersonaId;
        const notLast = blackboard.personas.find(p => p.id !== lastId);
        return notLast ?? blackboard.personas[0];
      };

      let persona = blackboard.personas.find(p => p.id === decision.selectedPersonaId);
      if (!persona || persona.id === blackboard.meta.lastSelectedPersonaId) {
        persona = pickNotLast();
      }

      console.log(
        `アクション: ${chosenAct} / ペルソナ: ${persona.name}${
          chosenAct !== decision.dialogueAct ? " [forced]" : ""
        }`,
      );

      let execution = await executeDialogueActWithPersona(chosenAct, persona, blackboard);
      if (!execution) {
        console.error("対話行為の実行に失敗しました");
        break;
      }

      // 反駁強制時に攻撃が無い場合は1回だけ再試行
      if (
        chosenAct === DialogueAct.CRITIQUE &&
        (!execution.newAttacks || execution.newAttacks.length === 0)
      ) {
        console.warn("CRITIQUEで攻撃が生成されませんでした。再試行します。");
        const retry = await executeDialogueActWithPersona(chosenAct, persona, blackboard);
        if (retry) execution = retry;
      }

      blackboard = updateBlackboard(blackboard, execution);

      // 攻撃・クロス参照に基づいて信念度を再計算
      blackboard = recalcClaimConfidences(blackboard);

      // 直近の選択ペルソナを記録
      blackboard.meta.lastSelectedPersonaId = persona.id;

      // パネル評価でメトリクス更新
      const metrics = await evaluateDiscussionPanel(blackboard);
      if (metrics) {
        blackboard.meta.convergenceHistory.push(metrics.convergenceScore);
      }

      // 合意レベル更新
      blackboard.consensusLevel = calculateConsensusLevel(blackboard);

      // 収束チェック（implementation-3の方針を取り入れ）
      const conv = checkConvergence(blackboard, maxSteps);
      if (conv.shouldFinalize) {
        console.log(`\n収束: ${conv.reason}`);
        shouldContinue = false;
        break;
      }

      if (decision.dialogueAct === DialogueAct.FINALIZE || decision.shouldFinalize) {
        shouldContinue = false;
        break;
      }
    }

    const finalStatus =
      blackboard.meta.stepCount >= maxSteps
        ? "最大ステップ数に達しました"
        : "収束条件を満たして終了しました";

    return { blackboard, finalStatus };
  },
});
