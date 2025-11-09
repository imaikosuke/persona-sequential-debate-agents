import type { MultiPersonaBlackboard } from "../types";
import { DialogueAct } from "../types";

function formatPersonas(blackboard: MultiPersonaBlackboard): string {
  return blackboard.personas
    .map(
      p =>
        `- [${p.id}] ${p.name} (${p.role})\n  expertise: ${p.expertise.join(", ")}\n  values: ${p.values.join(", ")}\n  style: ${p.thinkingStyle}/${p.communicationStyle}`,
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

export function buildPersonaDeliberationPrompt(blackboard: MultiPersonaBlackboard): string {
  const personasText = formatPersonas(blackboard);
  const claimsText = formatClaims(blackboard);
  const attacksText = formatAttacks(blackboard);
  const lastPersonaInfo = blackboard.meta.lastSelectedPersonaId
    ? `- 直前に使用したペルソナID: ${blackboard.meta.lastSelectedPersonaId}\n- 次は同一IDの連続選択は避けること`
    : `- 直前に使用したペルソナID: （なし）`;
  const critiqueHint =
    blackboard.attacks.length < 2 ||
    (blackboard.meta.stepCount < 5 && blackboard.attacks.length < 3)
      ? `- 現在、攻撃(反駁)が不足しています。次は critique か fact_check を優先して選択してください。`
      : `- 攻撃は一定数存在します。状況に応じて最適な行為を選択してください。`;

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

### メタ
- ステップ数: ${blackboard.meta.stepCount}
- 合意レベル（暫定）: ${blackboard.consensusLevel.toFixed(2)}
${lastPersonaInfo}
${critiqueHint}

## タスク
- 次に取るべき対話行為を選択してください。
- さらに、その行為を実行するのに最適な「ペルソナID」を1つ選択してください。

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
  const base = `
## 実行する対話行為
${dialogueAct}

## 担当ペルソナ
- id: ${persona.id}
- name: ${persona.name}
- role: ${persona.role}
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
`;

  const common = `
出力要件:
- 常にJSON形式
- 新規主張には { personaContext: { personaId } } を含める
- 必要に応じて crossReferences を生成する（support/challenge/clarification）
- critique/challenge の場合: newAttacks を最低1件以上必ず生成し、既存の claimId を toClaimId に指定すること（severity と description を明記）
- fact_check の場合: 事実確認の要点を newClaims に反映し、可能なら crossReferences を追加すること
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
