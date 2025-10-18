/**
 * Implementation 3: ログ出力ヘルパー
 * ワークフロー実行中のログ出力を整理
 */

import type { DialogueActDecision, ExecutionResult } from "../../types";

/**
 * ステップ開始のログを出力
 */
export function logStepStart(stepNum: number): void {
  console.log(`\n--- Step ${stepNum} ---`);
}

/**
 * 対話行為選択のログを出力
 */
export function logDialogueActSelection(decision: DialogueActDecision): void {
  console.log(`選択された対話行為: ${decision.dialogueAct}`);
  console.log(`理由: ${decision.reasoning}`);
  console.log(
    `期待効用 - 説得力: ${decision.expectedUtility.persuasivenessGain.toFixed(2)}, 新規性: ${decision.expectedUtility.novelty.toFixed(2)}`,
  );
}

/**
 * 実行結果のログを出力
 */
export function logExecutionResult(executionResult: ExecutionResult): void {
  // 新しい主張を表示
  if (executionResult.newClaims) {
    console.log(`新しい主張が${executionResult.newClaims.length}件追加されました:`);
    for (const claim of executionResult.newClaims) {
      console.log(`  - [${claim.id}] ${claim.text.slice(0, 80)}...`);
    }
  }

  // 新しい攻撃を表示
  if (executionResult.newAttacks) {
    console.log(`新しい攻撃が${executionResult.newAttacks.length}件追加されました`);
  }
}

/**
 * 評価結果のログを出力
 */
export function logEvaluationMetrics(
  convergenceScore: number,
  beliefConvergence: number,
  diversityScore?: number,
): void {
  const diversityText =
    diversityScore !== undefined ? `, 多様性: ${diversityScore.toFixed(2)}` : "";
  console.log(
    `評価 - 収束スコア: ${convergenceScore.toFixed(2)}, 信念収束: ${beliefConvergence.toFixed(2)}${diversityText}`,
  );
}

/**
 * 討論完了のログを出力
 */
export function logDeliberationComplete(
  finalStatus: string,
  stepCount: number,
  claimsCount: number,
): void {
  console.log(`\n========================================`);
  console.log(`討論完了: ${finalStatus}`);
  console.log(`総ステップ数: ${stepCount}`);
  console.log(`生成された主張数: ${claimsCount}`);
  console.log(`========================================\n`);
}
