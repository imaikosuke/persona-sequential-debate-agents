/**
 * Implementation 3: プロンプト定義
 */

import { type BlackboardState, DialogueAct } from "../types";
import { analyzeArgumentStances } from "../utils/blackboard";
import { buildFinalDocumentPrompt } from "./final-document";

function formatClaims(blackboard: BlackboardState): string {
  return (
    blackboard.claims
      .map(c => `- [${c.id}] ${c.text} (信念度: ${c.confidence.toFixed(2)})`)
      .join("\n") || "（まだ主張がありません）"
  );
}

function formatAttacks(blackboard: BlackboardState): string {
  return (
    blackboard.attacks
      .map(a => `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}]`)
      .join("\n") || "（まだ反論がありません）"
  );
}

/**
 * 決定用プロンプトを生成（DeliberativeAgent用）
 */
export function buildDeliberationPrompt(blackboard: BlackboardState): string {
  const claimsText = formatClaims(blackboard);
  const attacksText = formatAttacks(blackboard);
  const stanceAnalysis = analyzeArgumentStances(blackboard);

  return `
## 現在の議論状態

### トピック
${blackboard.topic}

### 主張（Claims）
${claimsText}

### 攻撃（Attacks）
${attacksText}

### 議論の状態
- ステップ数: ${blackboard.meta.stepCount}
- 主張数: ${blackboard.claims.length}
- 反論数: ${blackboard.attacks.length}
- 反論率: ${blackboard.claims.length > 0 ? ((blackboard.attacks.length / blackboard.claims.length) * 100).toFixed(1) : "0"}%（理想: 30-70%の範囲）
- 賛成の主張: ${stanceAnalysis.proCount}件
- 反対の主張: ${stanceAnalysis.conCount}件

${
  blackboard.claims.length > 0 && blackboard.attacks.length / blackboard.claims.length < 0.3
    ? "⚠️ **注意**: 反論の比率が低すぎます（30%未満）。既存の主張への反論を積極的に追加してください。\n"
    : blackboard.claims.length > 0 &&
        blackboard.attacks.length / blackboard.claims.length >= 0.3 &&
        blackboard.attacks.length / blackboard.claims.length < 0.5
      ? "✅ **推奨**: 反論率が30-50%の範囲です。新しい視点を追加するため、PROPOSEを検討してください。\n"
      : blackboard.claims.length > 0 &&
          blackboard.attacks.length / blackboard.claims.length >= 0.5 &&
          blackboard.attacks.length / blackboard.claims.length < 0.7
        ? "✅ **推奨**: 反論率が50-70%の範囲です。バランスの取れた議論のため、PROPOSEまたはCRITIQUEを選択できます。\n"
        : ""
}

## タスク
- 次に取るべき対話行為を選択してください。
- **⚠️ 重要**: 主張数が2つ以下の場合、必ずPROPOSEを選択してください。CRITIQUEは選択できません。

**対話行為の選択基準（重要）:**

1. **CRITIQUE（反論）を選択すべき条件:**
   - **主張数が3つ以上ある場合のみ**CRITIQUEを選択可能（反論には新しい主張が必要なため）
   - 主張数が3つ以上あり、反論率が30%未満の場合 → **CRITIQUEを優先的に選択**
   - 主張数が5つ以上ある場合 → **CRITIQUEを選択**
   - 反論が0件で、主張数が3つ以上ある場合 → **CRITIQUEを選択**
   - 既存の主張に対して反論を追加することで、議論の質が向上する場合
   - **⚠️ 主張が2つ以下の場合、CRITIQUEは選択できません。PROPOSEを選択して主張を増やしてください**

2. **PROPOSE（提案）を選択すべき条件:**
   - 主張数が2つ未満の場合
   - **反論率が30-70%の範囲で、新しい視点を追加する必要がある場合** → **PROPOSEを選択**
   - 反論率が30%以上で、主張の多様性（賛成・反対のバランス）が不足している場合
   - 既存の主張が不足している場合
   - **連続してCRITIQUEを2回以上選択した場合、次はPROPOSEを検討する**

3. **FINALIZE（終了）を選択すべき条件:**
   - 収束条件を満たしている場合（主張数5以上、反論数3以上、反論率30%以上、ステップ数4以上）

**重要: 逐次討論の原則**
- **1回のアクションで追加できる主張は最大2個まで**です
- 議論を段階的に深めるため、一度に多くの主張を追加しないでください
- 既存の主張や反論をよく検討してから、次のステップで何を追加すべきか判断してください
- **1つの主張は1つの論点のみを含む**ようにしてください

**⚠️ 重要: 反論率に基づく選択指針**
- **反論率が30%未満**: CRITIQUEを選択（反論を増やす）
- **反論率が30-50%**: PROPOSEを選択（新しい視点を追加して議論を広げる）
- **反論率が50-70%**: PROPOSEまたはCRITIQUEを選択（バランスを保つ）
- **反論率が70%以上**: CRITIQUEを選択（反論が不足している場合）
- **主張数が2つ以下の場合、必ずPROPOSEを選択してください**（CRITIQUEは選択不可）
- **連続してCRITIQUEを2回以上選択した場合、次はPROPOSEを検討してください**（バランスを取る）

利用可能な対話行為:
- **PROPOSE**: 新しい主張を追加する（新しい論点を提示）
- **CRITIQUE**: 既存の主張への反論を追加する（既存の主張を批判・反駁）
- **FINALIZE**: 議論を終了し、最終文書を生成する

**重要: PROPOSEとCRITIQUEの違い**
- PROPOSE: 新しい主張（新しい論点）を追加する行為
- CRITIQUE: 既存の主張への反論（既存の主張を攻撃する）を追加する行為
- 「反論を追加する」場合は**CRITIQUE**を選択してください
- 「新しい主張を追加する」場合は**PROPOSE**を選択してください

**選択の優先順位（重要）:**
1. **主張数が0件または1件** → **必ずPROPOSEを選択**（CRITIQUEは選択不可）
2. **主張数が2件** → **必ずPROPOSEを選択**（CRITIQUEは選択不可。まず主張を3つ以上に増やす）
3. **主張数が3つ以上** かつ 反論率が30%未満 → **CRITIQUEを選択**
4. **主張数が3つ以上** かつ 反論が0件 → **CRITIQUEを選択**
5. **主張数が3つ以上** かつ 反論率が30-50% → **PROPOSEを選択**（新しい視点を追加して議論を広げる）
6. **主張数が5つ以上** かつ 反論率が30%未満 → **CRITIQUEを選択**
7. **主張数が5つ以上** かつ 反論率が50-70% → **PROPOSEを選択**（新しい視点を追加）
8. **主張数が5つ以上** かつ 反論率が70%以上 → **CRITIQUEを選択**（反論が不足している）
9. **連続してCRITIQUEを2回以上選択した場合** → **次はPROPOSEを選択**（バランスを取る）
10. 収束条件を満たしている → **FINALIZEを選択**

**⚠️ 重要: 主張数が2つ以下の場合、理由に「CRITIQUEを選択できません」と書いても、実際にはPROPOSEを選択してください。**

出力形式（JSON）:
\`\`\`json
{
  "dialogueAct": "propose" | "critique" | "finalize",
  "reasoning": "選択理由（特に反論率が低い場合は、なぜCRITIQUEを選択したかを明確に説明）",
  "expectedUtility": {
    "persuasivenessGain": 0.0-1.0,
    "novelty": 0.0-1.0,
    "uncertaintyReduction": 0.0-1.0,
    "cost": 0
  },
  "targetClaimIds": ["c1", "c2"],
  "shouldFinalize": boolean,
  "convergenceAnalysis": {
    "beliefConvergence": 0.0-1.0,
    "noveltyRate": 0.0-1.0
  }
}
\`\`\`
`;
}

/**
 * 実行用プロンプトを生成（ExecutorAgent用）
 */
export function buildExecutionPrompt(
  dialogueAct: DialogueAct,
  blackboard: BlackboardState,
): string {
  // FINALIZEの場合は早期リターン
  if (dialogueAct === DialogueAct.FINALIZE) {
    const finalDocumentPrompt = buildFinalDocumentPrompt(blackboard);

    return `${finalDocumentPrompt}

出力フォーマット（JSONの例）:
\`\`\`json
{
  "dialogueAct": "finalize",
  "newClaims": [],
  "newAttacks": [],
  "finalDocument": "最終文書（自然な論証文）"
}
\`\`\`
`;
  }

  const claimsText = formatClaims(blackboard);
  const attacksText = formatAttacks(blackboard);

  const base = `
## 実行する対話行為
${dialogueAct}

## 現在のトピック
${blackboard.topic}

## 現在の主張
${claimsText}

## 現在の攻撃
${attacksText}
`;

  const common = `
**重要: 逐次討論の原則**
- **1回のアクションで追加できる主張は最大2個まで**です
- 議論を段階的に深めるため、一度に多くの主張を追加しないでください
- 既存の主張や反論をよく検討してから、次のステップで何を追加すべきか判断してください
- **主張の粒度**: 1つの主張は1つの論点のみを含むようにしてください。複数の論点が含まれている場合は分割してください。

**論証の質の評価基準:**
- **説得力**: 明確で論理的な主張の展開、反対意見への適切な反駁
- **一貫性**: 主張間の矛盾がないこと、論理的な整合性の維持
- **根拠の妥当性**: 研究や証拠に基づく主張、具体的な例やデータの引用（可能な範囲で）

**反論の生成原則:**
- 新しい主張を追加する際は、その主張で既存の反論を攻撃することを検討してください
- 反論への再反論は、新しい主張を追加してから、その主張で既存の反論を攻撃する形で実現できます
- **重複反論の防止**: 既存の反論と同じ内容の反論を生成しないでください。同じ fromClaimId → toClaimId の組み合わせで、類似した説明の反論は避けてください。

出力要件:
- 常にJSON形式
- **1回のアクションで追加できる主張は1〜2個まで**
`;

  if (dialogueAct === DialogueAct.PROPOSE) {
    return `${base}
${common}

## PROPOSE の要件
- 新しい主張を1〜2個追加してください
- 賛成・反対の両方の視点をバランスよく含める
- 新しい視点や論点を追加（段階的に）

出力フォーマット（JSONの例）:
\`\`\`json
{
  "dialogueAct": "propose",
  "newClaims": [
    {
      "id": "cX",
      "text": "...",
      "support": [],
      "confidence": 0.7,
      "createdAt": 0,
      "lastUpdated": 0
    }
  ],
  "newAttacks": []
}
\`\`\`
`;
  }

  if (dialogueAct === DialogueAct.CRITIQUE) {
    return `${base}
${common}

## CRITIQUE の要件
- 既存の主張への反論を生成してください
- **重要**: 反論を生成するには、まず新しい主張（反論の根拠となる主張）を追加する必要があります
- newClaims に1〜2個の新しい主張を追加し、その主張IDを fromClaimId として使用してください
- newAttacks を最低1件以上必ず生成し、既存の claimId を toClaimId に指定すること（severity と description を明記）
- **⚠️ 必須**: fromClaimId と toClaimId は必ず異なるIDにしてください（自己参照は不可）
- 反論の比率が低い場合（30%未満）、新しい主張を追加するよりも既存主張への反論を優先する
- 同じ主張への反論が集中しないよう、多様な主張への反論を検討する

**反論の構造:**
- 反論は「新しい主張（fromClaimId）」から「既存の主張（toClaimId）」を攻撃する形で生成
- 例: 新しい主張「c3: スマートフォンは依存症を引き起こす」から、既存の主張「c1: スマートフォンは安全性を向上させる」を攻撃

出力フォーマット（JSONの例）:
\`\`\`json
{
  "dialogueAct": "critique",
  "newClaims": [
    {
      "id": "c3",
      "text": "新しい主張（反論の根拠）",
      "support": [],
      "confidence": 0.7,
      "createdAt": 0,
      "lastUpdated": 0
    }
  ],
  "newAttacks": [
    {
      "id": "aX",
      "fromClaimId": "c3",
      "toClaimId": "c1",
      "type": "logic" | "evidence" | "relevance",
      "severity": "major" | "critical" | "minor",
      "description": "反論の内容"
    }
  ]
}
\`\`\`
`;
  }

  return `${base}${common}`;
}
