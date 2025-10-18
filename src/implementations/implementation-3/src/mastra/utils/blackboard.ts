/**
 * Implementation 3: ブラックボード操作ユーティリティ
 */

import type { BlackboardState, Claim, ExecutionResult, StanceAnalysis } from "../types";

/**
 * ブラックボードの初期化
 */
export function initializeBlackboard(topic: string, tokenBudget = 10000): BlackboardState {
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
  };
}

/**
 * ブラックボードの更新
 */
export function updateBlackboard(
  blackboard: BlackboardState,
  executionResult: ExecutionResult,
  estimatedTokens = 500,
): BlackboardState {
  const updated: BlackboardState = {
    ...blackboard,
    meta: {
      ...blackboard.meta,
      stepCount: blackboard.meta.stepCount + 1,
      usedTokens: blackboard.meta.usedTokens + estimatedTokens,
    },
  };

  // 新しい主張を追加
  if (executionResult.newClaims) {
    const newClaimsWithTimestamp = executionResult.newClaims.map(claim => ({
      ...claim,
      createdAt: updated.meta.stepCount,
      lastUpdated: updated.meta.stepCount,
    }));
    updated.claims = [...updated.claims, ...newClaimsWithTimestamp];
  }

  // 主張を更新
  if (executionResult.updatedClaims) {
    const updatedClaimMap = new Map(executionResult.updatedClaims.map(c => [c.id, c]));
    updated.claims = updated.claims.map(claim => {
      const updatedClaim = updatedClaimMap.get(claim.id);
      return updatedClaim
        ? { ...claim, ...updatedClaim, lastUpdated: updated.meta.stepCount }
        : claim;
    });
  }

  // 新しい攻撃を追加
  if (executionResult.newAttacks) {
    const newAttacksWithDefaults = executionResult.newAttacks.map(attack => ({
      ...attack,
      resolved: false,
    }));
    updated.attacks = [...updated.attacks, ...newAttacksWithDefaults];
  }

  // 攻撃を解決済みにする
  if (executionResult.resolvedAttacks) {
    const resolvedSet = new Set(executionResult.resolvedAttacks);
    updated.attacks = updated.attacks.map(attack =>
      resolvedSet.has(attack.id) ? { ...attack, resolved: true } : attack,
    );
  }

  // 新しい質問を追加
  if (executionResult.newQuestions) {
    const newQuestionsWithDefaults = executionResult.newQuestions.map(question => ({
      ...question,
      resolved: false,
    }));
    updated.questions = [...updated.questions, ...newQuestionsWithDefaults];
  }

  // 質問を解決済みにする
  if (executionResult.resolvedQuestions) {
    const resolvedSet = new Set(executionResult.resolvedQuestions);
    updated.questions = updated.questions.map(question =>
      resolvedSet.has(question.id) ? { ...question, resolved: true } : question,
    );
  }

  // 計画を更新
  if (executionResult.updatedPlan) {
    updated.plan = {
      ...updated.plan,
      ...executionResult.updatedPlan,
    };
  }

  // 執筆パッドを更新
  if (executionResult.updatedWritepad) {
    updated.writepad = {
      ...updated.writepad,
      ...executionResult.updatedWritepad,
    };
  }

  // 最終文書を設定
  if (executionResult.finalDocument) {
    updated.writepad.finalDraft = executionResult.finalDocument;
  }

  return updated;
}

/**
 * 主張の平均信念度を計算
 */
export function calculateAverageConfidence(claims: Claim[]): number {
  if (claims.length === 0) return 0;
  const total = claims.reduce((sum, claim) => sum + claim.confidence, 0);
  return total / claims.length;
}

/**
 * 未解決の致命的攻撃数を計算
 */
export function countCriticalUnresolvedAttacks(blackboard: BlackboardState): number {
  return blackboard.attacks.filter(a => !a.resolved && a.severity === "critical").length;
}

/**
 * 収束条件のチェック
 */
export function checkConvergence(
  blackboard: BlackboardState,
  thresholds = {
    minConfidence: 0.7, // 0.75 → 0.70: より多くの議論を促す
    maxCriticalAttacks: 0,
    minSteps: 5, // 3 → 5: より多くのステップを要求
    maxSteps: 20,
    minClaims: 5, // 新規: 最小主張数を要求
    minDiversity: 0.4, // 新規: 最小多様性スコアを要求
    minAttacks: 1, // 新規: 最小攻撃数を要求（批判的検討を促進）
  },
): {
  shouldFinalize: boolean;
  reason: string;
} {
  // 最大ステップ数に達した場合は強制終了
  if (blackboard.meta.stepCount >= thresholds.maxSteps) {
    return {
      shouldFinalize: true,
      reason: "最大ステップ数に達しました",
    };
  }

  // 最小ステップ数未満の場合は継続
  if (blackboard.meta.stepCount < thresholds.minSteps) {
    return {
      shouldFinalize: false,
      reason: "まだ議論を続ける必要があります",
    };
  }

  // 主張がない場合は継続
  if (blackboard.claims.length === 0) {
    return {
      shouldFinalize: false,
      reason: "まだ主張が生成されていません",
    };
  }

  // 最小主張数未満の場合は継続
  if (blackboard.claims.length < thresholds.minClaims) {
    return {
      shouldFinalize: false,
      reason: `主張数が不足しています（現在: ${blackboard.claims.length}, 最小: ${thresholds.minClaims}）`,
    };
  }

  const avgConfidence = calculateAverageConfidence(blackboard.claims);
  const criticalAttacks = countCriticalUnresolvedAttacks(blackboard);
  const stanceAnalysis = analyzeArgumentStances(blackboard);

  // 多様性が不足している場合は継続
  if (stanceAnalysis.diversityScore < thresholds.minDiversity) {
    return {
      shouldFinalize: false,
      reason: `議論の多様性が不足しています（現在: ${stanceAnalysis.diversityScore.toFixed(2)}, 最小: ${thresholds.minDiversity}）。賛成: ${stanceAnalysis.proCount}件, 反対: ${stanceAnalysis.conCount}件`,
    };
  }

  // 攻撃（批判的検討）が不足している場合は継続
  if (blackboard.attacks.length < thresholds.minAttacks) {
    return {
      shouldFinalize: false,
      reason: `批判的検討が不足しています（攻撃数: ${blackboard.attacks.length}, 最小: ${thresholds.minAttacks}）`,
    };
  }

  // 収束条件: 高い信念度 & 致命的攻撃なし & 多様性あり & 批判的検討済み
  if (
    avgConfidence >= thresholds.minConfidence &&
    criticalAttacks <= thresholds.maxCriticalAttacks
  ) {
    return {
      shouldFinalize: true,
      reason: `収束条件を満たしました（平均信念度: ${avgConfidence.toFixed(2)}, 主張数: ${blackboard.claims.length}, 致命的攻撃: ${criticalAttacks}, 多様性: ${stanceAnalysis.diversityScore.toFixed(2)}）`,
    };
  }

  return {
    shouldFinalize: false,
    reason: `まだ収束していません（平均信念度: ${avgConfidence.toFixed(2)}, 主張数: ${blackboard.claims.length}, 致命的攻撃: ${criticalAttacks}, 多様性: ${stanceAnalysis.diversityScore.toFixed(2)}）`,
  };
}

/**
 * 議論の立場を分析
 * 賛成/反対/中立の主張を分類し、多様性を評価
 */
export function analyzeArgumentStances(blackboard: BlackboardState): StanceAnalysis {
  if (blackboard.claims.length === 0) {
    return {
      proCount: 0,
      conCount: 0,
      neutralCount: 0,
      diversityScore: 0,
      needsOpposition: true,
      needsCritique: false,
      analysis: "まだ主張がありません。初期の主張を提案してください。",
    };
  }

  // 主張の立場を分類
  let proCount = 0;
  let conCount = 0;
  let neutralCount = 0;

  for (const claim of blackboard.claims) {
    const text = claim.text.toLowerCase();
    // 賛成を示すパターン
    if (
      text.includes("べきである") ||
      text.includes("べきだ") ||
      text.includes("重要") ||
      text.includes("必要") ||
      text.includes("有益") ||
      text.includes("効果的")
    ) {
      proCount++;
    }
    // 反対を示すパターン
    else if (
      text.includes("べきではない") ||
      text.includes("べきでない") ||
      text.includes("問題") ||
      text.includes("危険") ||
      text.includes("リスク") ||
      text.includes("懸念") ||
      text.includes("悪影響")
    ) {
      conCount++;
    }
    // その他は中立
    else {
      neutralCount++;
    }
  }

  // 多様性スコアの計算
  // 理想的には賛成と反対が半々で、多様性スコアは高くなる
  const total = proCount + conCount + neutralCount;
  let diversityScore = 0;

  if (total > 0) {
    // 両方の立場が存在する場合、そのバランスで評価
    if (proCount > 0 && conCount > 0) {
      const balance = Math.min(proCount, conCount) / Math.max(proCount, conCount);
      diversityScore = balance * 0.9 + 0.1; // 0.1-1.0の範囲
    } else {
      // 一方的な場合は低スコア
      diversityScore = 0.1;
    }
  }

  // 反対意見が必要か
  const needsOpposition = proCount > 0 && conCount === 0 && blackboard.claims.length >= 2;

  // 反論が必要か（攻撃が少ない、または一方的な議論）
  const needsCritique =
    (blackboard.attacks.length === 0 && blackboard.claims.length >= 3) ||
    (proCount > 0 && conCount === 0 && blackboard.claims.length >= 2);

  // 分析結果の説明
  let analysis = "";
  if (proCount > 0 && conCount === 0) {
    analysis = `⚠️ 議論が一方的です。現在、賛成意見のみ${proCount}件で、反対意見が0件です。反対の視点を追加することで、より説得力のある議論になります。`;
  } else if (conCount > 0 && proCount === 0) {
    analysis = `⚠️ 議論が一方的です。現在、反対意見のみ${conCount}件で、賛成意見が0件です。賛成の視点を追加することで、バランスの取れた議論になります。`;
  } else if (proCount > 0 && conCount > 0) {
    const ratio = (Math.min(proCount, conCount) / Math.max(proCount, conCount)) * 100;
    analysis = `✅ 多様な視点が存在します（賛成: ${proCount}件, 反対: ${conCount}件, バランス: ${ratio.toFixed(0)}%）。`;
  } else {
    analysis = `中立的な主張が${neutralCount}件あります。明確な立場を示す主張を追加してください。`;
  }

  return {
    proCount,
    conCount,
    neutralCount,
    diversityScore,
    needsOpposition,
    needsCritique,
    analysis,
  };
}

/**
 * JSONテキストからオブジェクトを抽出
 * LLMの出力からJSONを安全に抽出する
 */
export function extractJSON<T>(text: string): T | null {
  try {
    // まずそのままパース
    return JSON.parse(text) as T;
  } catch {
    // JSONブロックを探す
    const jsonMatch =
      text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as T;
      } catch {
        // パースエラー
      }
    }

    // 最後の手段: 最初の { から最後の } まで抽出
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        // パースエラー
      }
    }

    return null;
  }
}
