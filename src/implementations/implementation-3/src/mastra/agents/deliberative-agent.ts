/**
 * Implementation 3: DeliberativeAgent（決定エージェント）
 * 議論の状態を分析し、次の対話行為を選択する
 */

import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { buildDeliberationPrompt } from "../prompts";
import type { BlackboardState, DialogueActDecision } from "../types";
import { extractJSON } from "../utils/blackboard";

/**
 * DeliberativeAgentのinstructions
 * （AgentインスタンスはMastraに登録するために必要だが、実際の処理では直接使用しない）
 */
const DELIBERATIVE_AGENT_INSTRUCTIONS = `
あなたは議論の熟考エージェントです。
- 現在の議論状態を分析し、次に取るべき対話行為を選択してください
- 反論率が低い場合（30%未満）、既存の主張への反論（CRITIQUE）を優先的に選択してください
- 主張数が3つ以上ある場合、新しい主張（PROPOSE）よりも反論（CRITIQUE）を優先してください
- JSON形式で返してください
`;

/**
 * DeliberativeAgent
 *
 * ブラックボード状態を分析し、次の対話行為を選択するエージェント
 * （Mastraに登録するために必要）
 */
export const deliberativeAgent = new Agent({
  name: "Deliberative Agent",
  instructions: DELIBERATIVE_AGENT_INSTRUCTIONS,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: {
    toolChoice: "none",
    maxSteps: 1,
    temperature: 0.7,
  },
});

/**
 * 次の対話行為を選択する
 */
export async function selectDialogueAct(
  blackboard: BlackboardState,
): Promise<DialogueActDecision | null> {
  const prompt = buildDeliberationPrompt(blackboard);

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: DELIBERATIVE_AGENT_INSTRUCTIONS,
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
