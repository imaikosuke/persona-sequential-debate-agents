import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { buildPersonaDeliberationPrompt } from "../prompts";
import type { DialogueActDecision, MultiPersonaBlackboard } from "../types";

export const personaDeliberativeAgent = new Agent({
  name: "Persona-Aware Deliberative Agent",
  instructions: `
あなたはマルチペルソナ議論の熟考エージェントです。\n- 状態を分析し、次に取るべき対話行為を選択\n- その行為に最適な担当ペルソナを選ぶ\n- JSONで返す
`,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: { toolChoice: "none", maxSteps: 1, temperature: 0.7 },
});

export async function selectDialogueActWithPersona(
  blackboard: MultiPersonaBlackboard,
): Promise<DialogueActDecision | null> {
  const prompt = buildPersonaDeliberationPrompt(blackboard);
  try {
    const instructions = await personaDeliberativeAgent.getInstructions();
    const instructionsText =
      typeof instructions === "string"
        ? instructions
        : Array.isArray(instructions)
          ? instructions.map(i => (typeof i === "string" ? i : i.content)).join("\n")
          : instructions.content;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: instructionsText },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    const decision = extractJSON<DialogueActDecision>(result.text);
    return decision ?? null;
  } catch (error) {
    console.error("Error in selectDialogueActWithPersona:", error);
    return null;
  }
}

function extractJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        void 0;
      }
    }
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && first < last) {
      try {
        return JSON.parse(text.slice(first, last + 1)) as T;
      } catch {
        void 0;
      }
    }
    return null;
  }
}
