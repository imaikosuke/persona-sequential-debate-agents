/**
 * Implementation 3: プロンプト定義
 * 各エージェントで使用するプロンプトテンプレート
 */

import type { BlackboardState } from "../types";
import { analyzeArgumentStances } from "../utils/blackboard";

/**
 * ブラックボード状態をフォーマットして、熟考エージェント用のプロンプトを生成
 */
export function buildDeliberationPrompt(blackboard: BlackboardState): string {
  const claimsText = blackboard.claims
    .map(c => `- [${c.id}] ${c.text} (信念度: ${c.confidence.toFixed(2)})`)
    .join("\n");

  const attacksText = blackboard.attacks
    .map(
      a =>
        `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}] ${a.resolved ? "✓解決済" : "未解決"}`,
    )
    .join("\n");

  const questionsText = blackboard.questions
    .filter(q => !q.resolved)
    .map(q => `- [${q.priority}] ${q.text}`)
    .join("\n");

  // 議論の立場を分析
  const stanceAnalysis = analyzeArgumentStances(blackboard);

  return `
## 現在の議論状態

### トピック
${blackboard.topic}

### 主張（Claims）
${claimsText || "（まだ主張がありません）"}

### 攻撃（Attacks）
${attacksText || "（まだ攻撃がありません）"}

### 未解決の質問
${questionsText || "（未解決の質問はありません）"}

### 現在の計画
- 注力点: ${blackboard.plan.currentFocus}
- 次のステップ: ${blackboard.plan.nextSteps.join(", ")}
- 避けるべきトピック: ${blackboard.plan.avoidTopics.join(", ") || "なし"}

### 執筆パッドの状態
- アウトライン: ${blackboard.writepad.outline || "未作成"}
- セクション数: ${blackboard.writepad.sections.length}

### メタ情報
- ステップ数: ${blackboard.meta.stepCount}
- 使用トークン: ${blackboard.meta.usedTokens} / ${blackboard.meta.tokenBudget}
- 最近の収束スコア: ${blackboard.meta.convergenceHistory.slice(-5).join(", ") || "なし"}

### 議論の立場分析
${stanceAnalysis.analysis}
- 賛成の主張: ${stanceAnalysis.proCount}件
- 反対の主張: ${stanceAnalysis.conCount}件
- 中立の主張: ${stanceAnalysis.neutralCount}件
- 多様性スコア: ${stanceAnalysis.diversityScore.toFixed(2)} / 1.0
- 反対意見が必要: ${stanceAnalysis.needsOpposition ? "はい" : "いいえ"}
- 反論（CRITIQUE）が必要: ${stanceAnalysis.needsCritique ? "はい" : "いいえ"}

## 重要な原則

**説得力のある議論には多様な視点が不可欠です:**
1. 一方的な主張だけでは説得力が弱い
2. 反対意見や懸念点を検討することで、議論が深まる
3. 批判的検討（CRITIQUE）により、主張の妥当性が高まる
4. 両方の立場を理解した上での結論は、より強固になる

**現在の議論の状態:**
${stanceAnalysis.needsOpposition ? "\n⚠️ **反対の視点が欠けています**。異なる立場の主張を提案してください。" : ""}
${stanceAnalysis.needsCritique ? "\n⚠️ **批判的検討が不足しています**。既存の主張にCRITIQUE（反論や弱点の指摘）を行うことで、議論の質が向上します。" : ""}
${stanceAnalysis.diversityScore < 0.5 ? "\n⚠️ **多様性が低い状態です**（スコア: " + stanceAnalysis.diversityScore.toFixed(2) + "）。様々な視点を取り入れることで、より説得力のある議論になります。" : ""}

## タスク

上記の状態を分析し、次に取るべき対話行為を選択してください。

**利用可能な対話行為:**
- **PROPOSE**: 新しい主張を追加または既存の主張を修正する
  - 新しい視点や論点を導入する場合に有効
  - **特に反対意見が不足している場合は、異なる立場の主張を提案すること**
- **CRITIQUE**: 既存の主張に反論や弱点を指摘する
  - 論理的な弱点、証拠の不足、前提の問題点を指摘
  - **一方的な議論では説得力が弱いため、批判的検討が重要**
  - 反論を通じて、主張の妥当性を検証し、議論を深める
- **FINALIZE**: 議論を終了し、最終文書を生成する（収束条件を満たす場合のみ）

**選択基準:**
1. **議論の多様性**: 一方的な議論を避け、複数の視点を含める（最重要）
2. **説得力の改善度**: 追加・修正により説得力が向上するか
3. **批判的検討**: 既存の主張の妥当性を検証しているか
4. **新規性**: 重複を避け、新しい情報や視点を提供するか
5. **コスト**: トークン使用量が妥当か

**収束条件:**
- 主張の信念度が十分に高い（0.75以上）
- 致命的な未解決の攻撃がない
- **多様な視点が含まれている（賛成・反対の両方を検討済み）**
- **批判的検討が行われている（攻撃や反論が存在する）**
- 新規性が枯渇している（重複が多い）

**重要**: 議論の多様性が低い場合、または批判的検討が不足している場合は、
収束させずに、反対意見やCRITIQUEを追加してください。

出力形式（JSON）:
\`\`\`json
{
  "dialogueAct": "PROPOSE" | "CRITIQUE" | "FINALIZE",
  "reasoning": "選択理由の詳細説明",
  "expectedUtility": {
    "persuasivenessGain": 0.0-1.0,
    "novelty": 0.0-1.0,
    "uncertaintyReduction": 0.0-1.0,
    "cost": 推定トークン数
  },
  "targetClaimIds": ["関連するclaim IDのリスト（該当する場合）"],
  "shouldFinalize": boolean,
  "convergenceAnalysis": {
    "beliefConvergence": 0.0-1.0,
    "noveltyRate": 0.0-1.0,
    "unresolvedCriticalAttacks": number
  }
}
\`\`\`
`;
}

/**
 * 実行エージェント用のプロンプトを生成
 */
export function buildExecutionPrompt(dialogueAct: string, blackboard: BlackboardState): string {
  // 議論の立場を分析
  const stanceAnalysis = analyzeArgumentStances(blackboard);

  const baseContext = `
## 実行する対話行為
${dialogueAct}

## 現在のトピック
${blackboard.topic}

## 現在の主張
${blackboard.claims.map(c => `- [${c.id}] ${c.text} (信念度: ${c.confidence.toFixed(2)})`).join("\n") || "（まだ主張がありません）"}

## 現在の攻撃
${blackboard.attacks.map(a => `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}]`).join("\n") || "（まだ攻撃がありません）"}

## 議論の立場分析
${stanceAnalysis.analysis}
`;

  if (dialogueAct === "PROPOSE") {
    // 反対意見が必要な場合の特別な指示
    let specialGuidance = "";
    if (stanceAnalysis.needsOpposition) {
      if (stanceAnalysis.proCount > 0 && stanceAnalysis.conCount === 0) {
        specialGuidance = `
## 🔴 重要な指示

現在の議論は**賛成意見のみ**で一方的です。説得力のある議論には、反対の視点や懸念点の検討が不可欠です。

**必ず反対の立場の主張を提案してください:**
- 「小学生はスマートフォンを持つべき**ではない**」という立場
- スマートフォンを持つことの**リスク、危険性、懸念点**
- 反対する理由や根拠を明確に提示

例:
- 依存症のリスク
- プライバシーやセキュリティの懸念
- 学習への悪影響
- 健康への影響（視力低下、運動不足など）
- コミュニケーション能力の低下
- 経済的負担
`;
      } else if (stanceAnalysis.conCount > 0 && stanceAnalysis.proCount === 0) {
        specialGuidance = `
## 🔴 重要な指示

現在の議論は**反対意見のみ**で一方的です。説得力のある議論には、賛成の視点や利点の検討が不可欠です。

**必ず賛成の立場の主張を提案してください:**
- 「小学生はスマートフォンを持つべきである」という立場
- スマートフォンを持つことの**利点、メリット、必要性**
- 賛成する理由や根拠を明確に提示
`;
      }
    }

    return `${baseContext}
${specialGuidance}

## タスク

トピックに対する新しい主張を提案してください。

**要件:**
- 既存の主張と重複しないこと
- トピックに関連していること
- 説得力のある証拠や理由を含めること
- **多様性を重視**: 一方的な議論を避け、異なる視点を提供すること
- 初期の主張は不確実性を持つため、信念度は0.5-0.6の範囲で設定すること
  （議論が進み、証拠が補強されたり反論が処理されることで、信念度は上昇します）

出力形式（JSON）:
\`\`\`json
{
  "dialogueAct": "PROPOSE",
  "newClaims": [
    {
      "id": "claim-X",
      "text": "主張の内容",
      "support": ["証拠1", "証拠2"],
      "confidence": 0.5-0.6
    }
  ]
}
\`\`\`
`;
  }

  if (dialogueAct === "CRITIQUE") {
    // CRITIQUEの重要性を強調
    const critiqueGuidance = `
## 💡 批判的検討の重要性

批判的検討（CRITIQUE）は議論の質を高める重要なプロセスです：
- 主張の論理的整合性を検証
- 証拠の妥当性を評価
- 隠れた前提や弱点を明らかにする
- より強固な議論の構築に貢献
`;

    return `${baseContext}
${critiqueGuidance}

## タスク

既存の主張に対する反論や弱点を指摘してください。

**要件:**
- 具体的な論理的弱点を指摘すること
- 攻撃の種類（logic/evidence/relevance）と重要度（critical/major/minor）を明確にすること
- 反論の主張も初期は不確実性を持つため、信念度は0.5-0.6の範囲で設定すること
- **建設的な批判**: 単なる否定ではなく、改善点や代替案を示すこと

出力形式（JSON）:
\`\`\`json
{
  "dialogueAct": "CRITIQUE",
  "newAttacks": [
    {
      "id": "attack-X",
      "fromClaimId": "新しい反論の主張ID",
      "toClaimId": "攻撃対象の主張ID",
      "type": "logic" | "evidence" | "relevance",
      "severity": "critical" | "major" | "minor",
      "description": "攻撃の内容"
    }
  ],
  "newClaims": [
    {
      "id": "claim-X",
      "text": "反論の主張",
      "support": ["証拠"],
      "confidence": 0.5-0.6
    }
  ]
}
\`\`\`
`;
  }

  if (dialogueAct === "FINALIZE") {
    return `${baseContext}

## 執筆パッド
${JSON.stringify(blackboard.writepad, null, 2)}

## タスク

議論の内容を統合し、最終的な論証文を生成してください。

**要件:**
- すべての主要な主張を含めること
- 論理的な流れで構成すること
- 説得力のある文章にすること
- 日本語で記述すること

出力形式（JSON）:
\`\`\`json
{
  "dialogueAct": "FINALIZE",
  "finalDocument": "最終的な論証文の内容"
}
\`\`\`
`;
  }

  return baseContext;
}

/**
 * 判定エージェント用のプロンプトを生成
 */
export function buildJudgmentPrompt(blackboard: BlackboardState): string {
  // 議論の立場を分析
  const stanceAnalysis = analyzeArgumentStances(blackboard);

  return `
## 議論の状態分析

### トピック
${blackboard.topic}

### 主張の状態
- 総数: ${blackboard.claims.length}
- 平均信念度: ${blackboard.claims.length > 0 ? (blackboard.claims.reduce((sum, c) => sum + c.confidence, 0) / blackboard.claims.length).toFixed(2) : "N/A"}

### 攻撃の状態
- 総数: ${blackboard.attacks.length}
- 未解決: ${blackboard.attacks.filter(a => !a.resolved).length}
- 致命的な未解決攻撃: ${blackboard.attacks.filter(a => !a.resolved && a.severity === "critical").length}

### 質問の状態
- 総数: ${blackboard.questions.length}
- 未解決: ${blackboard.questions.filter(q => !q.resolved).length}

### 議論の多様性
${stanceAnalysis.analysis}
- 賛成の主張: ${stanceAnalysis.proCount}件
- 反対の主張: ${stanceAnalysis.conCount}件
- 中立の主張: ${stanceAnalysis.neutralCount}件
- 多様性スコア: ${stanceAnalysis.diversityScore.toFixed(2)} / 1.0

### 最近のステップ履歴
- ステップ数: ${blackboard.meta.stepCount}
- 収束履歴: ${blackboard.meta.convergenceHistory.slice(-5).join(", ")}

## タスク

現在の議論状態から以下のメトリクスを算出してください:

1. **信念収束度** (0.0-1.0): 主要主張のconfidenceの安定性
2. **新規性スコア** (0.0-1.0): 最近のステップでの新情報の割合
3. **攻撃解決率** (0.0-1.0): 解決済み攻撃の割合
4. **多様性スコア** (0.0-1.0): 議論の視点の多様性（賛成/反対のバランス）
   - **重要**: 一方的な議論（賛成のみ、または反対のみ）は低スコア（0.1-0.3）
   - 両方の視点が存在し、バランスが取れている場合は高スコア（0.7-1.0）
5. **総合収束スコア** (0.0-1.0): 議論が収束に向かっているかの総合評価
   - 多様性スコアを重視すること
   - 一方的な議論では収束スコアを低く評価

出力形式（JSON）:
\`\`\`json
{
  "beliefConvergence": 0.0-1.0,
  "noveltyScore": 0.0-1.0,
  "attackResolutionRate": 0.0-1.0,
  "diversityScore": 0.0-1.0,
  "convergenceScore": 0.0-1.0
}
\`\`\`
`;
}
