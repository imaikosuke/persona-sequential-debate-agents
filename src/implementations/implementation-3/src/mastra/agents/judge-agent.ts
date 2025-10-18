/**
 * Implementation 3: JudgeAgent（判定エージェント）
 * 議論の質と収束状態を評価
 */

import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { buildJudgmentPrompt } from "../prompts";
import type { BlackboardState, JudgmentMetrics } from "../types";
import { extractJSON } from "../utils/blackboard";

/**
 * JudgeAgent
 *
 * 議論の進捗と質を評価する
 */
export const judgeAgent = new Agent({
  name: "Judge Agent",
  instructions: `
あなたは議論の質と進捗を評価する判定エージェントです。

現在のブラックボード状態から以下を算出してください:
- 信念収束度（主要主張のconfidenceの安定性）
- 新規性スコア（最近のステップでの新情報の割合）
- 反論解決率（resolved attacksの割合）
- 総合的な収束スコア（0.0-1.0）

**評価基準:**
1. 信念収束度: 主張の信念度が安定し、高い値になっているか
2. 新規性スコア: 新しい情報や視点が追加されているか
3. 反論解決率: 提起された反論が適切に対処されているか
4. 収束スコア: 総合的に議論が収束に向かっているか

常にJSON形式で各メトリクスを返してください。
  `,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: {
    toolChoice: "none",
    maxSteps: 1,
    temperature: 0.3,
  },
});

/**
 * 議論の質を評価する
 */
export async function evaluateDiscussion(
  blackboard: BlackboardState,
): Promise<JudgmentMetrics | null> {
  const prompt = buildJudgmentPrompt(blackboard);

  try {
    const instructions = await judgeAgent.getInstructions();
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
      temperature: 0.3,
      maxTokens: 1000,
    });

    const metrics = extractJSON<JudgmentMetrics>(result.text);

    if (!metrics) {
      console.error("Failed to parse JudgmentMetrics:", result.text);
      return null;
    }

    return metrics;
  } catch (error) {
    console.error("Error in evaluateDiscussion:", error);
    return null;
  }
}
