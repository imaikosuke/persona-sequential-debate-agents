/**
 * Implementation 3: DeliberativeAgent（熟考エージェント）
 * 次の対話行為を選択する意思決定エージェント
 */

import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { buildDeliberationPrompt } from "../prompts";
import type { BlackboardState, DialogueActDecision } from "../types";
import { extractJSON } from "../utils/blackboard";

/**
 * DeliberativeAgent
 *
 * 現在のブラックボード状態を分析し、次に取るべき対話行為を選択する
 */
export const deliberativeAgent = new Agent({
  name: "Deliberative Agent",
  instructions: `
あなたは議論を制御する熟考エージェントです。

現在のブラックボード状態を分析し、次に取るべき対話行為を選択してください。

**役割:**
- 議論の進捗状況を評価する
- 最も効果的な次のアクションを決定する
- 収束条件を監視する
- **議論の多様性を確保する**

**重要な原則:**
説得力のある議論には、多様な視点と批判的検討が不可欠です。
- 一方的な主張だけでは説得力が弱い
- 反対意見や懸念点を検討することで、議論が深まる
- CRITIQUE（批判的検討）により、主張の妥当性が高まる
- 両方の立場を理解した上での結論は、より強固になる

**利用可能な対話行為:**
- **PROPOSE**: 新しい主張を追加または修正
  - 特に反対意見が不足している場合は、異なる立場の主張を提案すること
- **CRITIQUE**: 既存の主張に反論や弱点を指摘
  - 一方的な議論では説得力が弱いため、批判的検討が重要
  - 論理的弱点、証拠の不足、前提の問題点を指摘
- **FINALIZE**: 議論を終了し最終文書を生成（収束時のみ）

**選択基準（優先順位順）:**
1. **議論の多様性**: 一方的な議論を避け、複数の視点を含める（最重要）
2. **批判的検討**: 既存の主張の妥当性を検証する
3. **説得力の改善度**: 追加・修正により説得力が向上するか
4. **新規性**: 重複を避け、新しい情報や視点を提供するか
5. **コスト**: トークン使用量が妥当か

**収束条件:**
- 主張の信念度が十分に高い（0.7以上）
- 致命的な未解決の反論がない
- **多様な視点が含まれている（賛成・反対の両方を検討済み）**
- **批判的検討が行われている（攻撃や反論が存在する）**
- 新規性が枯渇している

**重要**: 議論の多様性が低い場合、または批判的検討が不足している場合は、
収束させずに、反対意見やCRITIQUEを選択してください。

常にJSON形式で回答してください。
  `,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: {
    toolChoice: "none",
    maxSteps: 1,
    temperature: 0.7,
  },
});

/**
 * 対話行為を選択する
 */
export async function selectDialogueAct(
  blackboard: BlackboardState,
): Promise<DialogueActDecision | null> {
  const prompt = buildDeliberationPrompt(blackboard);

  try {
    const instructions = await deliberativeAgent.getInstructions();
    const instructionsText =
      typeof instructions === "string"
        ? instructions
        : Array.isArray(instructions)
          ? instructions.map(i => (typeof i === "string" ? i : i.content)).join("\n")
          : instructions.content;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: instructionsText,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    const decision = extractJSON<DialogueActDecision>(result.text);

    if (!decision) {
      console.error("Failed to parse DialogueActDecision:", result.text);
      return null;
    }

    return decision;
  } catch (error) {
    console.error("Error in selectDialogueAct:", error);
    return null;
  }
}
