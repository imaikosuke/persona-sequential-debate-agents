/**
 * Implementation 4: ブラックボード操作ユーティリティ（マルチペルソナ対応）
 */

import type { Attack, Claim, ExecutionResult, MultiPersonaBlackboard } from "../types";

export function initializeBlackboard(
  topic: string,
  personas: MultiPersonaBlackboard["personas"],
  tokenBudget = 10000,
): MultiPersonaBlackboard {
  return {
    topic,
    claims: [],
    attacks: [],
    questions: [],
    plan: {
      currentFocus: `トピック「${topic}」に対する初期の主張を構築する`,
      nextSteps: ["トピックに関連する主要な主張を提案する", "主張の根拠を明確にする"],
      avoidTopics: [],
    },
    writepad: {
      outline: "",
      sections: [],
    },
    meta: {
      stepCount: 0,
      tokenBudget,
      usedTokens: 0,
      convergenceHistory: [],
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
    const stamped = executionResult.newAttacks.map(a => ({ ...a, resolved: false }));
    updated.attacks = [...updated.attacks, ...stamped];
  }

  if (executionResult.resolvedAttacks?.length) {
    const resolved = new Set(executionResult.resolvedAttacks);
    updated.attacks = updated.attacks.map(a => (resolved.has(a.id) ? { ...a, resolved: true } : a));
  }

  if (executionResult.crossReferences?.length) {
    updated.crossReferences = [...updated.crossReferences, ...executionResult.crossReferences];
  }

  if (executionResult.updatedPlan) {
    updated.plan = { ...updated.plan, ...executionResult.updatedPlan };
  }

  if (executionResult.updatedWritepad) {
    updated.writepad = { ...updated.writepad, ...executionResult.updatedWritepad };
  }

  if (executionResult.finalDocument) {
    updated.writepad.finalDraft = executionResult.finalDocument;
  }

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
  const unresolved = attacks.filter(a => !a.resolved).length;
  return unresolved / attacks.length;
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
 * 収束条件のチェック（Implementation-3を参考に強化）
 */
export function checkConvergence(
  blackboard: MultiPersonaBlackboard,
  maxSteps = 10,
): {
  shouldFinalize: boolean;
  reason: string;
} {
  if (blackboard.meta.stepCount >= maxSteps) {
    return { shouldFinalize: true, reason: "最大ステップ数に達しました" };
  }

  const minSteps = 3;
  const minClaims = 6;
  const minAttacks = 4;

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
  if (proCount === 0 || conCount === 0) {
    return {
      shouldFinalize: false,
      reason: `多様な視点が必要です（賛成: ${proCount}件, 反対: ${conCount}件）`,
    };
  }

  const unresolvedMajor = blackboard.attacks.filter(
    a => !a.resolved && (a.severity === "critical" || a.severity === "major"),
  ).length;
  if (unresolvedMajor > 2) {
    return {
      shouldFinalize: false,
      reason: `未解決の重要な反論が多すぎます（${unresolvedMajor}件）`,
    };
  }

  return {
    shouldFinalize: true,
    reason: `収束条件を満たしました（主張数: ${blackboard.claims.length}, 反論数: ${blackboard.attacks.length}, ステップ数: ${blackboard.meta.stepCount}）`,
  };
}

/**
 * 攻撃・クロス参照に基づく信念度の再計算（ヒューリスティック）
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
    const targeted = attacksByTarget.get(c.id) ?? [];
    const unresolvedCritical = targeted.filter(
      a => !a.resolved && a.severity === "critical",
    ).length;
    const unresolvedMajor = targeted.filter(a => !a.resolved && a.severity === "major").length;
    const unresolvedMinor = targeted.filter(a => !a.resolved && a.severity === "minor").length;
    const resolvedAgainst = targeted.filter(a => a.resolved).length;
    const supports = supportsByClaim.get(c.id) ?? 0;

    let delta = 0;
    delta -= unresolvedCritical * 0.1;
    delta -= unresolvedMajor * 0.05;
    delta -= unresolvedMinor * 0.02;
    delta += resolvedAgainst * 0.02;
    delta += supports * 0.03;

    const newConfidence = Math.max(0.3, Math.min(0.95, (c.confidence ?? 0.7) + delta));

    return {
      ...c,
      confidence: Number.isFinite(newConfidence) ? newConfidence : c.confidence,
      lastUpdated: currentStep,
    };
  });

  return { ...blackboard, claims: updatedClaims };
}
