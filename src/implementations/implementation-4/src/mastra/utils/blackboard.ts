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

/**
 * 反論解決メカニズム
 * 新しい反論や主張が既存の反論を解決するかチェック
 * Implementation-3の改善点を反映
 */
function resolveAttacks(
  blackboard: MultiPersonaBlackboard,
  newClaims: Claim[],
  newAttacks: Attack[],
): MultiPersonaBlackboard {
  const updated = { ...blackboard, attacks: [...blackboard.attacks] };

  // 新しい反論が既存の反論の fromClaimId を攻撃する場合、
  // 元の反論を「反論された」とマーク（部分的に解決）
  for (const newAttack of newAttacks) {
    // 新しい反論が既存の反論の元主張（fromClaimId）を攻撃している場合
    const attackedAttacks = updated.attacks.filter(
      existing => existing.fromClaimId === newAttack.toClaimId && !existing.resolved,
    );

    for (const attackedAttack of attackedAttacks) {
      // 反論の元主張が攻撃された場合、その反論を「反論された」とマーク
      // これは完全な解決ではないが、議論が深まったことを示す
      if (attackedAttack.severity === "minor") {
        attackedAttack.resolved = true;
      } else if (attackedAttack.severity === "major") {
        // major の場合は、より積極的に解決済みにする
        // 新しい反論が既存の反論の元主張を攻撃している場合、基本的に解決済みとみなす
        attackedAttack.resolved = true;
      }
    }
  }

  // 新しい主張が既存の反論の論点を直接的に覆す場合、その反論を解決済みにする
  // より多くのキーワードパターンを追加（改善版）
  const resolutionPatterns = [
    // 依存症・リスク関連
    {
      attack: ["依存症", "リスク", "依存"],
      claim: ["依存症", "防ぐ", "軽減", "管理", "教育", "対策"],
    },
    // 集中力・学習関連
    {
      attack: ["集中力", "低下", "注意散漫"],
      claim: ["集中力", "向上", "高める", "改善", "管理"],
    },
    // 健康・悪影響関連
    {
      attack: ["悪影響", "健康", "視力", "健康リスク"],
      claim: ["悪影響", "軽減", "防ぐ", "管理", "教育", "対策", "リスク", "低減"],
    },
    // ネットいじめ・不適切コンテンツ関連
    {
      attack: ["ネットいじめ", "いじめ", "不適切", "コンテンツ", "危険"],
      claim: ["ネットいじめ", "防ぐ", "軽減", "対策", "監視", "制限", "教育"],
    },
    // 学習効果関連
    {
      attack: ["学習", "効果", "低下", "妨げ"],
      claim: ["学習", "効果", "向上", "高める", "改善"],
    },
    // 安全性・緊急時関連
    {
      attack: ["安全性", "安全", "危険", "リスク"],
      claim: ["安全性", "向上", "確保", "保護", "監視"],
    },
    // アクセス制限・最新情報関連（新規追加）
    {
      attack: ["アクセス", "制限", "制約", "限界", "できない", "不可能"],
      claim: ["アクセス", "可能", "提供", "利用", "利用可能", "利用できる"],
    },
    // 最新情報・最新技術関連（新規追加）
    {
      attack: ["最新", "情報", "技術", "アプリ", "最新の", "最新情報", "最新技術"],
      claim: ["最新", "情報", "技術", "アプリ", "アクセス", "利用", "提供", "利用可能"],
    },
    // 代替手段・代替方法関連（新規追加）
    {
      attack: ["代替", "手段", "方法", "他の", "別の", "代替手段", "代替方法"],
      claim: ["代替", "手段", "方法", "限界", "制限", "制約", "できない", "不可能", "不足"],
    },
    // 教育機会・学習機会関連（新規追加）
    {
      attack: ["教育", "機会", "学習", "機会", "逃す", "失う", "制限"],
      claim: ["教育", "機会", "学習", "機会", "提供", "確保", "向上", "改善"],
    },
    // 必要性・必須性関連（新規追加）
    {
      attack: ["必要", "不要", "必須", "必須ではない", "必要ではない", "不要"],
      claim: ["必要", "必須", "重要", "不可欠", "必要不可欠", "重要"],
    },
  ];

  for (const newClaim of newClaims) {
    const claimText = newClaim.text.toLowerCase();

    // この新しい主張が既存の反論の論点を覆している可能性をチェック
    for (const existingAttack of updated.attacks) {
      if (existingAttack.resolved) continue;

      const attackDescription = existingAttack.description.toLowerCase();

      // 各パターンをチェック
      for (const pattern of resolutionPatterns) {
        const attackMatches = pattern.attack.some(keyword => attackDescription.includes(keyword));
        const claimMatches = pattern.claim.some(keyword => claimText.includes(keyword));

        if (attackMatches && claimMatches) {
          // 新しい主張が反論の論点を覆している場合、その反論を解決済みにする
          if (existingAttack.severity === "minor" || existingAttack.severity === "major") {
            existingAttack.resolved = true;
            break; // 1つのパターンにマッチしたら次の反論へ
          }
        }
      }
    }
  }

  return updated;
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
        resolved: false,
      };
    });
    updated.attacks = [...updated.attacks, ...newAttacksWithDefaults];

    // 反論解決メカニズムを実行
    const resolved = resolveAttacks(
      updated,
      executionResult.newClaims || [],
      newAttacksWithDefaults,
    );
    updated.attacks = resolved.attacks;
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

  // 反論解決メカニズムを実行（新しい主張のみの場合）
  if (executionResult.newClaims && !executionResult.newAttacks) {
    const resolved = resolveAttacks(updated, executionResult.newClaims, []);
    updated.attacks = resolved.attacks;
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

  // 未解決の重要な反論をチェック
  const unresolvedMajorAttacks = blackboard.attacks.filter(
    a => !a.resolved && (a.severity === "critical" || a.severity === "major"),
  ).length;

  // 未解決の重要な反論が多すぎる場合は継続
  // 閾値を2件から5件に緩和（反論解決メカニズムの改善により、より多くの反論が解決されることを期待）
  if (unresolvedMajorAttacks > 5) {
    return {
      shouldFinalize: false,
      reason: `未解決の重要な反論が多すぎます（${unresolvedMajorAttacks}件）。これらへの再反論が必要です。`,
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
 * - 未解決の重大な反論: 最初の反論は-0.1、2つ目以降は-0.05、最大で-0.3まで
 * - 未解決の軽微な反論: -0.03 × 件数
 * - 解決済みの反論: +0.02 × 件数
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
    const unresolvedMinorAttacks = targeted.filter(a => !a.resolved && a.severity === "minor");
    const resolvedAttacks = targeted.filter(a => a.resolved);
    const supports = supportsByClaim.get(c.id) ?? 0;

    // Implementation 3と同じロジック: 元の信念度を初期値として使用
    // confidenceが未定義の場合は0.7をデフォルト値として使用
    const baseConfidence = c.confidence ?? 0.7;
    let confidence = baseConfidence;

    // 未解決の重大な反論がある場合、信念度を下げる
    // 反論の影響を段階的に減らす（最初の反論は-0.1、2つ目以降は-0.05）
    const unresolvedMajorAttacks = targeted.filter(
      a => !a.resolved && (a.severity === "critical" || a.severity === "major"),
    );
    if (unresolvedMajorAttacks.length > 0) {
      // 最初の反論は-0.1、2つ目以降は-0.05
      confidence -= 0.1 + (unresolvedMajorAttacks.length - 1) * 0.05;
      // 最大で-0.3まで（3件以上の反論があっても、影響を制限）
      // Implementation 3と同じロジック: 元の信念度から-0.3を上限とする
      confidence = Math.max(confidence, baseConfidence - 0.3);
    }

    // 未解決の軽微な反論がある場合、少し信念度を下げる
    confidence -= unresolvedMinorAttacks.length * 0.03;

    // 解決済みの反論がある場合、議論が深まったことを示すため、少し信念度を上げる
    confidence += resolvedAttacks.length * 0.02;

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
