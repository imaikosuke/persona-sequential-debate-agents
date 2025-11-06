import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import type { Persona } from "../types";
import { buildDefaultPersonas } from "../utils/persona-utils";

export const personaCreatorAgent = new Agent({
  name: "Persona Creator Agent",
  instructions: `
あなたは議題に応じて最適なペルソナセットを設計・提案するエージェントです。
- 3-5名の多様な役割（expert/critic/synthesizer/advocate/moderator など）を含める
- 専門性、価値観、思考・コミュニケーションスタイルに多様性を持たせる
- JSONで返す
`,
  model: openai("gpt-4o-mini"),
});

export async function createPersonas(topic: string): Promise<Persona[]> {
  // まずはデフォルトの安全なセットを用意
  const fallback = buildDefaultPersonas(topic);

  try {
    const instructions = await personaCreatorAgent.getInstructions();
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
        {
          role: "user",
          content: `トピック: ${topic}\n3-5名の多様なペルソナをJSONで提案してください。\nスキーマ: { id, name, role, expertise[], values[], thinkingStyle, communicationStyle, biasAwareness[] }`,
        },
      ],
      temperature: 0.7,
      maxTokens: 1500,
    });

    const json = extractJSON<Persona[]>(result.text);
    if (json && Array.isArray(json) && json.length >= 3) return json;
    return fallback;
  } catch {
    return fallback;
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
        // ignore
      }
    }
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && first < last) {
      try {
        return JSON.parse(text.slice(first, last + 1)) as T;
      } catch {
        // ignore
      }
    }
    return null;
  }
}
