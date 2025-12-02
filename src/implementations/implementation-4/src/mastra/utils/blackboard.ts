/**
 * Implementation 4: ブラックボード操作ユーティリティ（マルチペルソナ対応）
 * Implementation-3の改善点を反映
 */

import type { Attack, Claim, ExecutionResult, MultiPersonaBlackboard } from "../types";

/**
 * 重複反論をチェック
 */
function checkDuplicateAttack(
  newAttack: { fromClaimId: string; toClaimId: string; description: string },
  existingAttacks: Attack[],
): boolean {
  return existingAttacks.some(
    existing =>
      existing.fromClaimId === newAttack.fromClaimId &&
      existing.toClaimId === newAttack.toClaimId &&
      // 説明文が非常に類似している場合も重複とみなす（簡易チェック）
      (existing.description === newAttack.description ||
        existing.description.includes(newAttack.description.substring(0, 20)) ||
        newAttack.description.includes(existing.description.substring(0, 20))),
  );
}

export function initializeBlackboard(
  topic: string,
  personas: MultiPersonaBlackboard["personas"],
  tokenBudget = 10000,
): MultiPersonaBlackboard {
  return {
    topic,
    claims: [],
    attacks: [],
    meta: {
      stepCount: 0,
      tokenBudget,
      usedTokens: 0,
    },
    personas,
    personaContributions: Object.fromEntries(
      personas.map(p => [
        p.id,
        { claimCount: 0, acceptedClaims: 0, challengeCount: 0, supportCount: 0 },
      ]),
    ),
    crossReferences: [],
    consensusLevel: 0,
    diversityMetrics: {
      expertiseSpread: 0,
      valueAlignment: 0,
      perspectiveCoverage: 0,
    },
  };
}

export function updateBlackboard(
  blackboard: MultiPersonaBlackboard,
  executionResult: ExecutionResult,
  estimatedTokens = 500,
): MultiPersonaBlackboard {
  const updated: MultiPersonaBlackboard = {
    ...blackboard,
    meta: {
      ...blackboard.meta,
      stepCount: blackboard.meta.stepCount + 1,
      usedTokens: blackboard.meta.usedTokens + estimatedTokens,
    },
  };

  if (executionResult.newClaims?.length) {
    const stamped = executionResult.newClaims.map(c => ({
      ...c,
      createdAt: updated.meta.stepCount,
      lastUpdated: updated.meta.stepCount,
    }));
    updated.claims = [...updated.claims, ...stamped];
    for (const c of stamped) {
      if (c.personaContext) {
        updated.personaContributions[c.personaContext.personaId].claimCount++;
      }
    }
  }

  if (executionResult.updatedClaims?.length) {
    const map = new Map(executionResult.updatedClaims.map(c => [c.id, c]));
    updated.claims = updated.claims.map(c =>
      map.has(c.id) ? { ...c, ...map.get(c.id)!, lastUpdated: updated.meta.stepCount } : c,
    );
  }

  if (executionResult.newAttacks?.length) {
    // 既存の攻撃IDを取得
    const existingAttackIds = new Set(updated.attacks.map(a => a.id));

    // 重複を除外
    const uniqueNewAttacks = executionResult.newAttacks.filter(
      newAttack => !checkDuplicateAttack(newAttack, updated.attacks),
    );

    // 新しい攻撃に一意のIDを割り当て
    let attackCounter = updated.attacks.length + 1;
    const newAttacksWithDefaults = uniqueNewAttacks.map(attack => {
      // IDが重複している場合、またはIDが指定されていない場合は自動生成
      let attackId = attack.id;
      if (!attackId || existingAttackIds.has(attackId)) {
        do {
          attackId = `a${attackCounter}`;
          attackCounter++;
        } while (existingAttackIds.has(attackId));
        existingAttackIds.add(attackId);
      }

      return {
        ...attack,
        id: attackId,
      };
    });
    updated.attacks = [...updated.attacks, ...newAttacksWithDefaults];
  }

  if (executionResult.crossReferences?.length) {
    updated.crossReferences = [...updated.crossReferences, ...executionResult.crossReferences];
  }

  // finalDocumentはExecutionResultに含まれるが、writepadがないため保存しない
  // finalize-stepで必要に応じて生成される

  return updated;
}

export function calculateSupportRate(
  crossReferences: MultiPersonaBlackboard["crossReferences"],
): number {
  if (crossReferences.length === 0) return 0;
  const support = crossReferences.filter(x => x.type === "support").length;
  return support / crossReferences.length;
}

export function calculateConflictRate(attacks: Attack[]): number {
  if (attacks.length === 0) return 0;
  // 反論の存在自体が対立を示すため、常に1.0を返す
  return 1.0;
}

export function calculateConvergence(claims: Claim[]): number {
  if (claims.length === 0) return 0;
  const avg = claims.reduce((s, c) => s + c.confidence, 0) / claims.length;
  return Math.min(1, Math.max(0, avg));
}

export function calculateConsensusLevel(blackboard: MultiPersonaBlackboard): number {
  const supportRate = calculateSupportRate(blackboard.crossReferences);
  const conflictRate = calculateConflictRate(blackboard.attacks);
  const convergence = calculateConvergence(blackboard.claims);
  return supportRate * 0.4 + (1 - conflictRate) * 0.3 + convergence * 0.3;
}

/**
 * テキストパターンに基づく賛否分類（簡易）
 */
export function analyzeArgumentStances(blackboard: MultiPersonaBlackboard): {
  proCount: number;
  conCount: number;
  neutralCount: number;
} {
  let proCount = 0;
  let conCount = 0;
  let neutralCount = 0;

  for (const claim of blackboard.claims) {
    const text = String(claim.text ?? "").toLowerCase();
    if (
      text.includes("べきである") ||
      text.includes("べきだ") ||
      text.includes("重要") ||
      text.includes("必要") ||
      text.includes("有益") ||
      text.includes("効果的")
    ) {
      proCount++;
      continue;
    }
    if (
      text.includes("べきではない") ||
      text.includes("べきでない") ||
      text.includes("問題") ||
      text.includes("危険") ||
      text.includes("リスク") ||
      text.includes("懸念") ||
      text.includes("悪影響")
    ) {
      conCount++;
      continue;
    }
    neutralCount++;
  }

  return { proCount, conCount, neutralCount };
}

/**
 * 収束条件のチェック（Implementation-3を参考に強化・厳格化）
 */
export function checkConvergence(
  blackboard: MultiPersonaBlackboard,
  maxSteps = 10,
): {
  shouldFinalize: boolean;
  reason: string;
} {
  // 最大ステップ数に達した場合は強制終了
  if (blackboard.meta.stepCount >= maxSteps) {
    return {
      shouldFinalize: true,
      reason: "最大ステップ数に達しました",
    };
  }

  // 最小条件チェック（厳格化）
  const minClaims = 5;
  const minAttacks = 3; // 1から3に引き上げ
  const minSteps = 4; // 最低ステップ数を4に引き上げ（議論の深さを確保）

  // 最低ステップ数チェック（逐次討論の効果を確保）
  if (blackboard.meta.stepCount < minSteps) {
    return {
      shouldFinalize: false,
      reason: `最低ステップ数に達していません（現在: ${blackboard.meta.stepCount}, 最低: ${minSteps}）`,
    };
  }

  if (blackboard.claims.length < minClaims) {
    return {
      shouldFinalize: false,
      reason: `主張数が不足しています（現在: ${blackboard.claims.length}, 最小: ${minClaims}）`,
    };
  }

  if (blackboard.attacks.length < minAttacks) {
    return {
      shouldFinalize: false,
      reason: `反論が不足しています（現在: ${blackboard.attacks.length}, 最小: ${minAttacks}）`,
    };
  }

  const { proCount, conCount } = analyzeArgumentStances(blackboard);

  // 多様性チェック（賛成・反対の両方が必要）
  if (proCount === 0 || conCount === 0) {
    return {
      shouldFinalize: false,
      reason: `多様な視点が必要です（賛成: ${proCount}件, 反対: ${conCount}件）`,
    };
  }

  // 収束条件を満たしている
  return {
    shouldFinalize: true,
    reason: `収束条件を満たしました（主張数: ${blackboard.claims.length}, 反論数: ${blackboard.attacks.length}, ステップ数: ${blackboard.meta.stepCount}）`,
  };
}

/**
 * 攻撃・クロス参照に基づく信念度の再計算（ヒューリスティック）
 * Implementation 3と同じロジックを使用（逐次討論の仕組みを統一評価するため）
 * - 初期の主張（最初の3件）には最低限の信念度0.3を保証
 * - 重大な反論: 最初の反論は-0.1、2つ目以降は-0.05、最大で-0.3まで
 * - 軽微な反論: -0.03 × 件数
 * - 支持する主張: +0.05 × 件数（クロス参照からカウント）
 */
export function recalcClaimConfidences(blackboard: MultiPersonaBlackboard): MultiPersonaBlackboard {
  if (blackboard.claims.length === 0) return blackboard;

  const currentStep = blackboard.meta.stepCount;
  const attacksByTarget = new Map<string, Attack[]>();
  for (const a of blackboard.attacks) {
    const arr = attacksByTarget.get(a.toClaimId) ?? [];
    arr.push(a);
    attacksByTarget.set(a.toClaimId, arr);
  }

  const supportsByClaim = new Map<string, number>();
  for (const x of blackboard.crossReferences) {
    if (x.type === "support") {
      supportsByClaim.set(x.claimId, (supportsByClaim.get(x.claimId) ?? 0) + 1);
    }
  }

  const updatedClaims: Claim[] = blackboard.claims.map(c => {
    // 初期の主張（最初の3件）には最低限の信念度を保証
    const isInitialClaim = c.createdAt <= 3;
    const minConfidence = isInitialClaim ? 0.3 : 0.0;

    const targeted = attacksByTarget.get(c.id) ?? [];
    const minorAttacks = targeted.filter(a => a.severity === "minor");
    const supports = supportsByClaim.get(c.id) ?? 0;

    // Implementation 3と同じロジック: 元の信念度を初期値として使用
    // confidenceが未定義の場合は0.7をデフォルト値として使用
    const baseConfidence = c.confidence ?? 0.7;
    let confidence = baseConfidence;

    // 重大な反論がある場合、信念度を下げる
    // 反論の影響を段階的に減らす（最初の反論は-0.1、2つ目以降は-0.05）
    const majorAttacks = targeted.filter(a => a.severity === "critical" || a.severity === "major");
    if (majorAttacks.length > 0) {
      // 最初の反論は-0.1、2つ目以降は-0.05
      confidence -= 0.1 + (majorAttacks.length - 1) * 0.05;
      // 最大で-0.3まで（3件以上の反論があっても、影響を制限）
      // Implementation 3と同じロジック: 元の信念度から-0.3を上限とする
      confidence = Math.max(confidence, baseConfidence - 0.3);
    }

    // 軽微な反論がある場合、少し信念度を下げる
    confidence -= minorAttacks.length * 0.03;

    // 支持する主張がある場合、信念度を上げる
    confidence += supports * 0.05;

    // 信念度を [minConfidence, 1.0] の範囲に制限
    const newConfidence = Math.max(minConfidence, Math.min(1.0, confidence));

    return {
      ...c,
      confidence: Number.isFinite(newConfidence) ? newConfidence : baseConfidence,
      lastUpdated: currentStep,
    };
  });

  return { ...blackboard, claims: updatedClaims };
}
