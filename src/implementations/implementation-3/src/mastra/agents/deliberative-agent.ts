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
 * DeliberativeAgent
 *
 * ブラックボード状態を分析し、次の対話行為を選択するエージェント
 */
export const deliberativeAgent = new Agent({
  name: "Deliberative Agent",
  instructions: `
あなたは議論の熟考エージェントです。
- 現在の議論状態を分析し、次に取るべき対話行為を選択してください
- JSON形式で返してください
`,
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
