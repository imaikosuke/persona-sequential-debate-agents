import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { selectDialogueActWithPersona } from "../../agents/deliberative-agent";
import { evaluateDiscussionPanel } from "../../agents/judge-panel-agent";
import { executeDialogueActWithPersona } from "../../agents/multi-executor-agent";
import type { MultiPersonaBlackboard } from "../../types";
import { DialogueAct } from "../../types";
import { calculateConsensusLevel, updateBlackboard } from "../../utils/blackboard";

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

      const decision = await selectDialogueActWithPersona(blackboard);
      if (!decision) {
        console.error("対話行為の選択に失敗しました");
        break;
      }

      const persona =
        blackboard.personas.find(p => p.id === decision.selectedPersonaId) ??
        blackboard.personas[0];
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

      // パネル評価でメトリクス更新
      const metrics = await evaluateDiscussionPanel(blackboard);
      if (metrics) {
        blackboard.meta.convergenceHistory.push(metrics.convergenceScore);
      }

      // 合意レベル更新
      blackboard.consensusLevel = calculateConsensusLevel(blackboard);

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
