/**
 * Implementation 3: プロンプト定義（簡略化版）
 */

import type { BlackboardState } from "../types";
import { analyzeArgumentStances } from "../utils/blackboard";

/**
 * 議論プロンプトを生成（簡略化版）
 */
export function buildDebatePrompt(blackboard: BlackboardState): string {
  const claimsText =
    blackboard.claims
      .map(c => `- [${c.id}] ${c.text} (信念度: ${c.confidence.toFixed(2)})`)
      .join("\n") || "（まだ主張がありません）";

  const attacksText =
    blackboard.attacks
      .map(
        a =>
          `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}] ${a.resolved ? "✓解決済" : "未解決"}`,
      )
      .join("\n") || "（まだ反論がありません）";

  // 未解決の反論を抽出（議論の深さを促進するため）
  const unresolvedAttacks = blackboard.attacks.filter(a => !a.resolved);
  const unresolvedAttacksText =
    unresolvedAttacks.length > 0
      ? unresolvedAttacks
          .map(a => `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}]`)
          .join("\n")
      : "（未解決の反論はありません）";

  const stanceAnalysis = analyzeArgumentStances(blackboard);

  return `
## トピック
${blackboard.topic}

## 現在の主張
${claimsText}

## 現在の反論
${attacksText}

## 未解決の反論（再反論を検討すべき）⚠️ 優先度: 高
${unresolvedAttacksText}

${
  unresolvedAttacks.length > 0
    ? `\n**⚠️ 重要**: ${unresolvedAttacks.length}件の未解決の反論があります。これらの反論への再反論を**最優先**で検討してください。\n- 新しい反論を追加する際は、既存の未解決の反論を解決することを優先してください\n- 新しい主張を追加する際は、その主張で既存の未解決の反論を攻撃することを検討してください\n`
    : ""
}

## 議論の状態
- ステップ数: ${blackboard.meta.stepCount}
- 主張数: ${blackboard.claims.length}
- 反論数: ${blackboard.attacks.length}（未解決: ${unresolvedAttacks.length}件）
- 反論率: ${blackboard.claims.length > 0 ? ((blackboard.attacks.length / blackboard.claims.length) * 100).toFixed(1) : "0"}%（理想: 30%以上）
- 賛成の主張: ${stanceAnalysis.proCount}件
- 反対の主張: ${stanceAnalysis.conCount}件

${blackboard.claims.length > 0 && blackboard.attacks.length / blackboard.claims.length < 0.3 ? "⚠️ **注意**: 反論の比率が低すぎます。既存の主張への反論を積極的に追加してください。" : ""}

## タスク
上記の状態を分析し、次のアクションを決定して実行してください。

**重要: 逐次討論の原則**
- **1回のアクションで追加できる主張は最大2個まで**です
- 議論を段階的に深めるため、一度に多くの主張を追加しないでください
- 既存の主張や反論をよく検討してから、次のステップで何を追加すべきか判断してください

**アクション:**
1. **ADD_ARGUMENT**: 新しい主張を追加する、または既存主張に反論する
   - **1回のアクションで追加できる主張は1〜2個まで**
   - **主張の粒度**: 1つの主張は1つの論点のみを含むようにしてください。複数の論点が含まれている場合は分割してください。
   - **論証の質**: 主張や反論を生成する際は、以下の評価基準を満たすよう注意してください
     - **説得力**: 明確で論理的な主張、反対意見への適切な反駁
     - **一貫性**: 既存の主張との矛盾がないこと、論理的な整合性の維持
     - **根拠の妥当性**: 研究や証拠に基づく主張、具体的な例やデータの引用（可能な範囲で）
   - **反論の生成を優先する**: 新しい主張を追加する際は、既存の主張への反論も同時に追加することを推奨
   - 新しい視点や論点を追加（段階的に）
   - **既存主張への反論や批判を積極的に追加**
     - 反論の比率が低い場合（30%未満）、新しい主張を追加するよりも既存主張への反論を優先する
     - 同じ主張への反論が集中しないよう、多様な主張への反論を検討する
   - **⚠️ 最優先: 未解決の反論への再反論を積極的に検討する**
     - **未解決の反論がある場合、それらへの再反論を最優先で検討してください**
     - 新しい主張を追加する際は、その主張で既存の未解決の反論を攻撃することを優先してください
     - 反論への再反論は、新しい主張を追加してから、その主張で既存の反論を攻撃する形で実現できます
     - **反論解決の原則**: 新しい反論を追加する際は、既存の未解決の反論を解決することを最優先で検討してください。
       - 新しい反論が既存の反論の元主張（fromClaimId）を攻撃する場合、その既存の反論は「反論された」とみなされます
       - 新しい主張が既存の反論の論点を直接的に覆す場合、その反論は「解決済み」とみなされます
       - **キーワードパターン**: 反論の論点に関連するキーワード（「アクセス制限」「最新情報」「代替手段」など）を含む主張を追加することで、反論が自動的に解決される場合があります
   - **重複反論の防止**: 既存の反論と同じ内容の反論を生成しないでください。同じ fromClaimId → toClaimId の組み合わせで、類似した説明の反論は避けてください。
   - 賛成・反対の両方の視点をバランスよく含める

2. **FINALIZE**: 議論を終了し、最終的な論証文を生成する
   - 主張数が5個以上
   - 賛成・反対の両方の視点がある
   - 反論が3個以上含まれている
   - 最低4ステップ以上経過している
   - 未解決の重要な反論が少ない（5件以下）
   - これ以上追加すべき内容がない
   
   **最終文書の形式（重要）:**
   - 自然な論証文として読みやすい形式で生成してください
   - **評価基準**: 論証文は説得力、一貫性、根拠の妥当性の観点で評価されます
   - **説得力**: 明確な立場表明から始める（「私は...という立場を取ります」など）、主張と反論を統合し、論理的な流れで記述する、反対意見への適切な反駁を含める
   - **一貫性**: 主張間の矛盾がないこと、論理的な整合性の維持、立場の一貫性
   - **根拠の妥当性**: 研究や証拠に基づく主張を強調する（「近年の研究によれば」「具体的には」「たとえば」など）、信頼性の高い情報源への言及
   - 結論で立場を再確認し、今後の展望を示す
   - 技術的な用語（「主張」「反論」「信念度」など）は使わず、自然な文章として記述する
   - 段落ごとに論点を整理し、読みやすくする

**出力形式（JSON）:**
\`\`\`json
{
  "action": "add_argument" | "finalize",
  "reasoning": "選択理由（簡潔に）",
  "newClaims": [
    {
      "id": "cX",
      "text": "主張の内容",
      "support": [],
      "confidence": 0.7,
      "createdAt": 0,
      "lastUpdated": 0
    }
  ],
  "newAttacks": [
    {
      "id": "aX",
      "fromClaimId": "新しい反論の主張ID",
      "toClaimId": "攻撃対象の主張ID",
      "type": "logic",
      "severity": "major",
      "description": "反論の内容",
      "resolved": false
    }
  ],
  "finalDocument": "最終文書（FINALIZE時のみ）"
}
\`\`\`
`;
}
