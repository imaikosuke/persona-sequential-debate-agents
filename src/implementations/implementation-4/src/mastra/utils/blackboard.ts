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
