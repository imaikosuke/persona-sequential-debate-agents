import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { buildPanelJudgmentPrompt } from "../prompts";
import type { JudgmentMetrics, MultiPersonaBlackboard } from "../types";

export const judgePanelAgent = new Agent({
  name: "Judge Panel Agent",
  instructions: `
あなたは複数視点から議論の質と収束状態を評価するパネルです。\n- beliefConvergence/noveltyScore/attackResolutionRate/diversityScore/convergenceScore を0-1でJSON返却
`,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: { toolChoice: "none", maxSteps: 1, temperature: 0.3 },
});

export async function evaluateDiscussionPanel(
  blackboard: MultiPersonaBlackboard,
): Promise<JudgmentMetrics | null> {
  const prompt = buildPanelJudgmentPrompt(blackboard);
  try {
    const instructions = await judgePanelAgent.getInstructions();
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
      temperature: 0.3,
      maxTokens: 1000,
    });

    const json = extractJSON<JudgmentMetrics>(result.text);
    return json ?? null;
  } catch (error) {
    console.error("Error in evaluateDiscussionPanel:", error);
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
