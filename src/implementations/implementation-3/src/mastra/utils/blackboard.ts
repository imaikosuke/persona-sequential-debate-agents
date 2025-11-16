/**
 * Implementation 3: ブラックボード操作ユーティリティ
 */

import type { Attack, BlackboardState, Claim, DebateAction, StanceAnalysis } from "../types";

/**
 * ブラックボードの初期化（簡略化版）
 */
export function initializeBlackboard(topic: string, tokenBudget = 10000): BlackboardState {
  return {
    topic,
    claims: [],
    attacks: [],
    writepad: {},
    meta: {
      stepCount: 0,
      tokenBudget,
      usedTokens: 0,
      convergenceHistory: [],
    },
  };
}

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
 */
function resolveAttacks(
  blackboard: BlackboardState,
  newClaims: Claim[],
  newAttacks: Attack[],
): BlackboardState {
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

/**
 * 信念度の動的更新
 * 反論を受けた主張の信念度を下げ、再反論で守られた主張の信念度を上げる
 */
function updateConfidence(claim: Claim, attacks: Attack[], supports: Claim[]): number {
  let confidence = claim.confidence;

  // 初期の主張（最初の5件）には最低限の信念度を保証
  const isInitialClaim = claim.createdAt <= 3;
  const minConfidence = isInitialClaim ? 0.3 : 0.0;

  // 未解決の重大な反論がある場合、信念度を下げる
  // 反論の影響を段階的に減らす（最初の反論は-0.1、2つ目以降は-0.05）
  const unresolvedMajorAttacks = attacks.filter(
    a => !a.resolved && (a.severity === "critical" || a.severity === "major"),
  );
  if (unresolvedMajorAttacks.length > 0) {
    // 最初の反論は-0.1、2つ目以降は-0.05
    confidence -= 0.1 + (unresolvedMajorAttacks.length - 1) * 0.05;
    // 最大で-0.3まで（3件以上の反論があっても、影響を制限）
    confidence = Math.max(confidence, claim.confidence - 0.3);
  }

  // 未解決の軽微な反論がある場合、少し信念度を下げる
  const unresolvedMinorAttacks = attacks.filter(a => !a.resolved && a.severity === "minor");
  confidence -= unresolvedMinorAttacks.length * 0.03;

  // 解決済みの反論がある場合、議論が深まったことを示すため、少し信念度を上げる
  const resolvedAttacks = attacks.filter(a => a.resolved);
  confidence += resolvedAttacks.length * 0.02;

  // 支持する主張がある場合、信念度を上げる
  confidence += supports.length * 0.05;

  // 信念度を [minConfidence, 1.0] の範囲に制限
  return Math.max(minConfidence, Math.min(1.0, confidence));
}

/**
 * ブラックボードの更新（改善版）
 */
export function updateBlackboard(
  blackboard: BlackboardState,
  action: DebateAction,
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
  if (action.newClaims) {
    // 既存の主張IDを取得
    const existingClaimIds = new Set(updated.claims.map(c => c.id));

    // 新しい主張に一意のIDを割り当て、テキストをクリーンアップ
    let claimCounter = updated.claims.length + 1;
    const newClaimsWithTimestamp = action.newClaims.map(claim => {
      // IDが重複している場合、またはIDが指定されていない場合は自動生成
      let claimId = claim.id;
      if (!claimId || existingClaimIds.has(claimId)) {
        do {
          claimId = `c${claimCounter}`;
          claimCounter++;
        } while (existingClaimIds.has(claimId));
        existingClaimIds.add(claimId);
      }

      // テキストから不要な文字列を削除（例: "(信念度: 0.70)"）
      let cleanedText = claim.text;
      cleanedText = cleanedText.replace(/\s*\(信念度:\s*[\d.]+\)\s*/g, "").trim();

      return {
        ...claim,
        id: claimId,
        text: cleanedText,
        createdAt: updated.meta.stepCount,
        lastUpdated: updated.meta.stepCount,
      };
    });
    updated.claims = [...updated.claims, ...newClaimsWithTimestamp];
  }

  // 新しい攻撃を追加（重複チェック付き）
  if (action.newAttacks) {
    // 既存の攻撃IDを取得
    const existingAttackIds = new Set(updated.attacks.map(a => a.id));

    // 重複を除外
    const uniqueNewAttacks = action.newAttacks.filter(
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
    const resolved = resolveAttacks(updated, action.newClaims || [], newAttacksWithDefaults);
    updated.attacks = resolved.attacks;
  }

  // 反論解決メカニズムを実行（新しい主張のみの場合）
  if (action.newClaims && !action.newAttacks) {
    const resolved = resolveAttacks(updated, action.newClaims, []);
    updated.attacks = resolved.attacks;
  }

  // 信念度を動的に更新
  updated.claims = updated.claims.map(claim => {
    // この主張を攻撃する反論を取得
    const attacksOnClaim = updated.attacks.filter(a => a.toClaimId === claim.id);

    // この主張を支持する主張を取得（将来的に実装可能）
    const supportsClaim: Claim[] = [];

    // 信念度を更新
    const newConfidence = updateConfidence(claim, attacksOnClaim, supportsClaim);

    return {
      ...claim,
      confidence: newConfidence,
      lastUpdated: updated.meta.stepCount,
    };
  });

  // 最終文書を設定
  if (action.finalDocument) {
    updated.writepad.finalDraft = action.finalDocument;
  }

  return updated;
}

/**
 * 主張の平均信念度を計算（削除予定 - 使用されていない）
 */
export function calculateAverageConfidence(claims: Claim[]): number {
  if (claims.length === 0) return 0;
  const total = claims.reduce((sum, claim) => sum + claim.confidence, 0);
  return total / claims.length;
}

/**
 * 未解決の致命的攻撃数を計算（削除予定 - 使用されていない）
 */
export function countCriticalUnresolvedAttacks(blackboard: BlackboardState): number {
  return blackboard.attacks.filter(a => !a.resolved && a.severity === "critical").length;
}

/**
 * 収束条件のチェック（厳格化版）
 */
export function checkConvergence(
  blackboard: BlackboardState,
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

  const stanceAnalysis = analyzeArgumentStances(blackboard);

  // 多様性チェック（賛成・反対の両方が必要）
  if (stanceAnalysis.proCount === 0 || stanceAnalysis.conCount === 0) {
    return {
      shouldFinalize: false,
      reason: `多様な視点が必要です（賛成: ${stanceAnalysis.proCount}件, 反対: ${stanceAnalysis.conCount}件）`,
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
  // JSONブロックを探す
  let jsonText = text;
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);

  if (jsonMatch) {
    jsonText = jsonMatch[1];
  } else {
    // 最後の手段: 最初の { から最後の } まで抽出
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      jsonText = text.slice(firstBrace, lastBrace + 1);
    }
  }

  // 不正な引用符を修正
  // パターン1: "key": "value' のような場合（ダブルクォート開始、シングルクォート終了）
  // 文字列値の終端がシングルクォートになっている場合を修正
  jsonText = jsonText.replace(/: "([^"]*)'(\s*[,}\]]|\s*$)/gm, ': "$1"$2');
  // パターン2: "key": 'value" のような場合（シングルクォート開始、ダブルクォート終了）
  jsonText = jsonText.replace(/: '([^']*)"(\s*[,}\]]|\s*$)/gm, ': "$1"$2');
  // パターン3: 文字列値の途中で引用符が混在している場合（より安全な方法）
  // まず、文字列値の終端を確実に修正してから、途中の引用符を処理

  try {
    // まずそのままパース
    return JSON.parse(jsonText) as T;
  } catch {
    // パースエラーが発生した場合、より積極的な修正を試みる
    try {
      // より積極的な引用符修正
      // 文字列値の終端がシングルクォートになっている場合を確実に修正
      jsonText = jsonText.replace(/: "([^"]*?)'(\s*[,}\]]|\s*$)/gm, ': "$1"$2');
      // 文字列値の途中で引用符が混在している場合
      jsonText = jsonText.replace(/: "([^"]*?)'([^"]*?)"/g, ': "$1\'$2"');
      // シングルクォートで囲まれた文字列値をダブルクォートに変換
      jsonText = jsonText.replace(/: '([^']*?)'(\s*[,}\]]|\s*$)/gm, ': "$1"$2');

      return JSON.parse(jsonText) as T;
    } catch {
      // それでも失敗した場合は null を返す
      console.error("Failed to parse JSON after fixes:", jsonText.substring(0, 500));
      return null;
    }
  }
}
