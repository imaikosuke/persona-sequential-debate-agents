import type { MultiPersonaBlackboard } from "../types";
import { DialogueAct } from "../types";

/**
 * Persona Creation and Selection Prompts
 * Based on implementation-2 (先行研究に基づく実装)
 */
export const PERSONA_CREATION_PROMPT = `論争的なトピックに関する命題: ##input_proposition


あなたのタスクは、6から10の討論エージェントのプールを作成することです。各エージェントは、与えられた命題を異なる視点から反論します。各エージェントは、命題に関連する独自の視点を表す必要があります。

各エージェントに対して、一文でユニークなペルソナの説明を割り当て、提案を反論するための特定の角度に焦点を当てた対応する主張を付けてください。各エージェントの視点が明確で命題に関連していることを確認してください。多様性と公平性を促進するために、エージェントはさまざまなコミュニティや視点を反映する必要があります。

重要: 出力は各行が独立したJSONオブジェクトである必要があります。配列やオブジェクトでラップしないでください。余分な文字（中括弧、角括弧、カンマなど）を追加しないでください。

出力形式（各行は有効なJSONオブジェクト）:
{"agent_id": 0, "description": "Agent_0の説明", "claim": "Agent_0の主張"}
{"agent_id": 1, "description": "Agent_1の説明", "claim": "Agent_1の主張"}
{"agent_id": 2, "description": "Agent_2の説明", "claim": "Agent_2の主張"}`;

export const PERSONA_SELECTION_PROMPT = `命題: ##input_proposition

与えられた命題を反論する説得力のある反論を共同で策定するために、3人のエージェントのチームを構築する必要があります。
以下の候補者が与えられており、各候補者は手元のトピックに関連する異なる視点を提供するユニークなペルソナを持っています。タスクを達成するために一緒に強力なチームを形成できると思う3人のエージェントを選択する必要があります。
選択を行う際は、バランスの取れた公平な議論を確保するために多様性の重要性を考慮してください。各選択について、候補者を選択した理由を述べてください。

## 候補者リスト:
###candidate_list

重要: 出力は各行が独立したJSONオブジェクトである必要があります。配列やオブジェクトでラップしないでください。余分な文字を追加しないでください。正確に3人の候補者を選択してください。

出力形式（各行は有効なJSONオブジェクト）:
{"agent_id": 0, "description": "Agent_0の説明", "claim": "Agent_0の主張", "reason": "選択理由"}
{"agent_id": 1, "description": "Agent_1の説明", "claim": "Agent_1の主張", "reason": "選択理由"}
{"agent_id": 2, "description": "Agent_2の説明", "claim": "Agent_2の主張", "reason": "選択理由"}`;

function formatPersonas(blackboard: MultiPersonaBlackboard): string {
  return blackboard.personas
    .map(
      p =>
        `- [${p.id}] ${p.name}\n  expertise: ${p.expertise.join(", ")}\n  values: ${p.values.join(", ")}\n  style: ${p.thinkingStyle}/${p.communicationStyle}`,
    )
    .join("\n");
}

function formatClaims(blackboard: MultiPersonaBlackboard): string {
  return (
    blackboard.claims
      .map(
        c =>
          `- [${c.id}] ${c.text} (信念度: ${c.confidence.toFixed(2)})${c.personaContext ? ` by ${c.personaContext.personaId}` : ""}`,
      )
      .join("\n") || "（まだ主張がありません）"
  );
}

function formatAttacks(blackboard: MultiPersonaBlackboard): string {
  return (
    blackboard.attacks
      .map(
        a =>
          `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}] ${a.resolved ? "✓解決済" : "未解決"}`,
      )
      .join("\n") || "（まだ攻撃がありません）"
  );
}

function formatUnresolvedAttacks(blackboard: MultiPersonaBlackboard): string {
  const unresolved = blackboard.attacks.filter(a => !a.resolved);
  return (
    unresolved
      .map(a => `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}]`)
      .join("\n") || "（未解決の反論はありません）"
  );
}

export function buildPersonaDeliberationPrompt(blackboard: MultiPersonaBlackboard): string {
  const personasText = formatPersonas(blackboard);
  const claimsText = formatClaims(blackboard);
  const attacksText = formatAttacks(blackboard);
  const unresolvedAttacksText = formatUnresolvedAttacks(blackboard);
  const unresolvedAttacks = blackboard.attacks.filter(a => !a.resolved);
  const lastPersonaInfo = blackboard.meta.lastSelectedPersonaId
    ? `- 直前に使用したペルソナID: ${blackboard.meta.lastSelectedPersonaId}\n- 次は同一IDの連続選択は避けること`
    : `- 直前に使用したペルソナID: （なし）`;

  return `
## 現在の議論状態（マルチペルソナ）

### トピック
${blackboard.topic}

### アクティブなペルソナ
${personasText || "（未定義）"}

### 主張（Claims）
${claimsText}

### 攻撃（Attacks）
${attacksText}

### 未解決の反論（再反論を検討すべき）⚠️ 優先度: 高
${unresolvedAttacksText}

${
  unresolvedAttacks.length > 0
    ? `\n**⚠️ 重要**: ${unresolvedAttacks.length}件の未解決の反論があります。これらの反論への再反論を**最優先**で検討してください。\n- 新しい反論を追加する際は、既存の未解決の反論を解決することを優先してください\n- 新しい主張を追加する際は、その主張で既存の未解決の反論を攻撃することを検討してください\n`
    : ""
}

### 未解決の質問
${
  blackboard.questions
    .filter(q => !q.resolved)
    .map(q => `- [${q.priority}] ${q.text}`)
    .join("\n") || "（未解決の質問はありません）"
}

### 計画
- 注力点: ${blackboard.plan.currentFocus}
- 次のステップ: ${blackboard.plan.nextSteps.join(", ")}
- 避けるべきトピック: ${blackboard.plan.avoidTopics.join(", ") || "なし"}

### クロスリファレンス
${
  blackboard.crossReferences
    .map(
      x => `- ${x.fromPersonaId} → ${x.toPersonaId} (${x.type}) on ${x.claimId}: ${x.description}`,
    )
    .join("\n") || "（なし）"
}

### 議論の状態
- ステップ数: ${blackboard.meta.stepCount}
- 主張数: ${blackboard.claims.length}
- 反論数: ${blackboard.attacks.length}（未解決: ${unresolvedAttacks.length}件）
- 反論率: ${blackboard.claims.length > 0 ? ((blackboard.attacks.length / blackboard.claims.length) * 100).toFixed(1) : "0"}%（理想: 30%以上）
- 賛成の主張: ${
    blackboard.claims.filter(c => {
      const text = c.text.toLowerCase();
      return (
        text.includes("べきである") ||
        text.includes("べきだ") ||
        text.includes("重要") ||
        text.includes("必要") ||
        text.includes("有益") ||
        text.includes("効果的")
      );
    }).length
  }件
- 反対の主張: ${
    blackboard.claims.filter(c => {
      const text = c.text.toLowerCase();
      return (
        text.includes("べきではない") ||
        text.includes("べきでない") ||
        text.includes("問題") ||
        text.includes("危険") ||
        text.includes("リスク") ||
        text.includes("懸念") ||
        text.includes("悪影響")
      );
    }).length
  }件
- 合意レベル（暫定）: ${blackboard.consensusLevel.toFixed(2)}
${lastPersonaInfo}

${
  blackboard.claims.length > 0 && blackboard.attacks.length / blackboard.claims.length < 0.3
    ? "⚠️ **注意**: 反論の比率が低すぎます。既存の主張への反論を積極的に追加してください。\n"
    : ""
}

## タスク
- 次に取るべき対話行為を選択してください。
- さらに、その行為を実行するのに最適な「ペルソナID」を1つ選択してください。

**重要: 逐次討論の原則**
- **1回のアクションで追加できる主張は最大2個まで**です
- 議論を段階的に深めるため、一度に多くの主張を追加しないでください
- 既存の主張や反論をよく検討してから、次のステップで何を追加すべきか判断してください
- **1つの主張は1つの論点のみを含む**ようにしてください

**⚠️ 重要: 未解決の反論への対応**
- 未解決の反論がある場合、それらへの再反論を最優先で検討してください
- 新しい主張を追加する際は、その主張で既存の未解決の反論を攻撃することを優先してください
- 反論解決を優先することで、議論の質が向上します

利用可能な対話行為:
- ${Object.values(DialogueAct).join(", ")}

出力形式（JSON）:
\`\`\`json
{
  "dialogueAct": "propose" | "critique" | "question" | "fact_check" | "synthesize" | "plan" | "finalize",
  "selectedPersonaId": "persona-id",
  "reasoning": "選択理由",
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
    "noveltyRate": 0.0-1.0,
    "unresolvedCriticalAttacks": 0
  }
}
\`\`\`
`;
}

export function buildPersonaExecutionPrompt(
  dialogueAct: string,
  persona: MultiPersonaBlackboard["personas"][number],
  blackboard: MultiPersonaBlackboard,
): string {
  const unresolvedAttacksText = formatUnresolvedAttacks(blackboard);
  const base = `
## 実行する対話行為
${dialogueAct}

## 担当ペルソナ
- id: ${persona.id}
- name: ${persona.name}
- expertise: ${persona.expertise.join(", ")}
- values: ${persona.values.join(", ")}
- thinkingStyle: ${persona.thinkingStyle}
- communicationStyle: ${persona.communicationStyle}

## 現在のトピック
${blackboard.topic}

## 現在の主張
${formatClaims(blackboard)}

## 現在の攻撃
${formatAttacks(blackboard)}

## 未解決の反論（再反論を検討すべき）⚠️ 優先度: 高
${unresolvedAttacksText}
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

**⚠️ 最優先: 未解決の反論への再反論を積極的に検討する**
- **未解決の反論がある場合、それらへの再反論を最優先で検討してください**
- 新しい主張を追加する際は、その主張で既存の未解決の反論を攻撃することを優先してください
- 反論への再反論は、新しい主張を追加してから、その主張で既存の反論を攻撃する形で実現できます
- **反論解決の原則**: 新しい反論を追加する際は、既存の未解決の反論を解決することを最優先で検討してください。
  - 新しい反論が既存の反論の元主張（fromClaimId）を攻撃する場合、その既存の反論は「反論された」とみなされます
  - 新しい主張が既存の反論の論点を直接的に覆す場合、その反論は「解決済み」とみなされます
  - **キーワードパターン**: 反論の論点に関連するキーワード（「アクセス制限」「最新情報」「代替手段」など）を含む主張を追加することで、反論が自動的に解決される場合があります
- **重複反論の防止**: 既存の反論と同じ内容の反論を生成しないでください。同じ fromClaimId → toClaimId の組み合わせで、類似した説明の反論は避けてください。

出力要件:
- 常にJSON形式
- 新規主張には { personaContext: { personaId } } を含める
- 必要に応じて crossReferences を生成する（support/challenge/clarification）
- critique/challenge の場合: newAttacks を最低1件以上必ず生成し、既存の claimId を toClaimId に指定すること（severity と description を明記）
- fact_check の場合: 事実確認の要点を newClaims に反映し、可能なら crossReferences を追加すること
- **1回のアクションで追加できる主張は1〜2個まで**
出力フォーマット（JSONの例）:
\`\`\`json
{
  "dialogueAct": "${dialogueAct}",
  "newClaims": [
    {
      "id": "cX",
      "text": "...",
      "support": [],
      "confidence": 0.7,
      "createdAt": 0,
      "lastUpdated": 0,
      "personaContext": { "personaId": "${persona.id}" }
    }
  ],
  "updatedClaims": [],
  "newAttacks": [],
  "resolvedAttacks": [],
  "newQuestions": [],
  "resolvedQuestions": [],
  "updatedPlan": {},
  "updatedWritepad": {},
  "finalDocument": "",
  "crossReferences": [
    {
      "id": "x1",
      "fromPersonaId": "${persona.id}",
      "toPersonaId": "${persona.id}",
      "type": "support",
      "claimId": "cX",
      "description": "...",
      "timestamp": 0
    }
  ]
}
\`\`\`
`;

  return `${base}
${common}
`;
}

export function buildPanelJudgmentPrompt(blackboard: MultiPersonaBlackboard): string {
  return `
## 評価対象の状態（マルチペルソナ）
トピック: ${blackboard.topic}
主張数: ${blackboard.claims.length}
攻撃数: ${blackboard.attacks.length}
未解決攻撃: ${blackboard.attacks.filter(a => !a.resolved).length}
クロス参照: ${blackboard.crossReferences.length}
合意レベル（暫定）: ${blackboard.consensusLevel.toFixed(2)}

各メトリクスを0.0-1.0で返してください（JSON）。
`;
}
