/**
 * Implementation 3: DebateAgent（統合エージェント）
 * 議論の状態を分析し、次のアクションを決定・実行する
 */

import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { buildDebatePrompt } from "../prompts";
import type { BlackboardState, DebateAction } from "../types";
import { extractJSON } from "../utils/blackboard";

/**
 * DebateAgent
 *
 * ブラックボード状態を分析し、次のアクションを決定・実行する統合エージェント
 */
export const debateAgent = new Agent({
  name: "Debate Agent",
  instructions: `
あなたは議論を進めるエージェントです。

現在の議論状態を分析し、次のアクションを決定して実行してください。

**逐次討論の原則:**
- **1回のアクションで追加できる主張は最大2個まで**です
- 議論を段階的に深めるため、一度に多くの主張を追加しないでください
- 既存の主張や反論をよく検討してから、次のステップで何を追加すべきか判断してください
- **1つの主張は1つの論点のみを含む**ようにしてください

**論証の質の評価基準:**
- **説得力**: 明確で論理的な主張の展開、反対意見への適切な反駁
- **一貫性**: 主張間の矛盾がないこと、論理的な整合性の維持
- **根拠の妥当性**: 研究や証拠に基づく主張、具体的な例やデータの引用（可能な範囲で）

これらの評価基準を満たすような主張や反論を生成してください。

**利用可能なアクション:**
- **PROPOSE**: 新しい主張を追加する
  - 1回のアクションで追加できる主張は1〜2個まで
  - 未解決の反論への再反論を積極的に検討する
  - **反論解決**: 新しい主張が既存の反論の論点を直接的に覆す場合、その反論は「解決済み」とみなされます
- **CRITIQUE**: 既存主張に反論する
  - 既存の主張への反論を生成する
  - **反論解決**: 新しい反論を追加する際は、既存の未解決の反論を解決することを検討してください
    - 新しい反論が既存の反論の元主張（fromClaimId）を攻撃する場合、その既存の反論は「反論された」とみなされます
  - **重複防止**: 既存の反論と同じ内容の反論を生成しないでください
- **FINALIZE**: 議論を終了し、最終文書を生成する

**判断基準:**
- 議論が十分に深まっているか（主張数、反論の有無、議論の深さ）
- 多様な視点が含まれているか（賛成・反対の両方）
- 未解決の反論があるか（それらへの再反論が必要か）
- 新しい情報を追加できるか

**終了条件（すべて満たす必要がある）:**
- 十分な主張数（5個以上）
- 賛成・反対の両方の視点がある
- 反論が3個以上含まれている
- 最低4ステップ以上経過している（議論の深さを確保）
- 未解決の重要な反論が少ない（5件以下）
- これ以上追加すべき内容がない

**⚠️ 重要: 未解決の反論への対応**
- 未解決の反論がある場合、それらへの再反論を最優先で検討してください
- 新しい主張を追加する際は、その主張で既存の未解決の反論を攻撃することを優先してください
- 反論解決を優先することで、議論の質が向上します

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
 * 次のアクションを決定・実行する
 */
export async function decideAndExecute(blackboard: BlackboardState): Promise<DebateAction | null> {
  const prompt = buildDebatePrompt(blackboard);

  try {
    const instructions = await debateAgent.getInstructions();
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
      maxTokens: 3000,
    });

    const action = extractJSON<DebateAction>(result.text);

    if (!action) {
      console.error("Failed to parse DebateAction:", result.text);
      return null;
    }

    return action;
  } catch (error) {
    console.error("Error in decideAndExecute:", error);
    return null;
  }
}
