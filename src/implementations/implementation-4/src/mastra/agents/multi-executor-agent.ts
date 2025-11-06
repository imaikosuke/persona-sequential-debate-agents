import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { buildPersonaExecutionPrompt } from "../prompts";
import type { Claim, DialogueAct, ExecutionResult, MultiPersonaBlackboard } from "../types";

export const multiExecutorAgent = new Agent({
  name: "Multi-Executor Agent",
  instructions: `
あなたは選択されたペルソナの視点で対話行為を実行するエージェントです。\n- JSONで出力\n- newClaims には personaContext を含める\n- 必要に応じて crossReferences を生成
`,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: { toolChoice: "none", maxSteps: 1, temperature: 0.8 },
});

export async function executeDialogueActWithPersona(
  act: DialogueAct,
  persona: MultiPersonaBlackboard["personas"][number],
  blackboard: MultiPersonaBlackboard,
): Promise<ExecutionResult | null> {
  const prompt = buildPersonaExecutionPrompt(act, persona, blackboard);
  try {
    const instructions = await multiExecutorAgent.getInstructions();
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
      temperature: 0.8,
      maxTokens: 3000,
    });

    const json = extractJSON<ExecutionResult>(result.text);
    if (!json) return null;

    // Normalize newClaims shape: sometimes models return a single object or non-array
    const maybeNewClaims: unknown = (json as { newClaims?: unknown }).newClaims;
    let normalizedNewClaims: Claim[] | undefined;
    if (maybeNewClaims == null) {
      normalizedNewClaims = undefined;
    } else if (Array.isArray(maybeNewClaims)) {
      normalizedNewClaims = maybeNewClaims as Claim[];
    } else {
      normalizedNewClaims = [maybeNewClaims as Claim];
    }

    json.dialogueAct = act;

    if (normalizedNewClaims) {
      json.newClaims = normalizedNewClaims.map((c: Claim) => ({
        ...c,
        personaContext: c.personaContext ?? { personaId: persona.id },
      }));
    }
    return json;
  } catch (error) {
    console.error("Error in executeDialogueActWithPersona:", error);
    return null;
  }
}

function extractJSON<T>(text: string): T | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed as T;
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        const parsed: unknown = JSON.parse(match[1]);
        return parsed as T;
      } catch {
        void 0;
      }
    }
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && first < last) {
      try {
        const parsed: unknown = JSON.parse(text.slice(first, last + 1));
        return parsed as T;
      } catch {
        void 0;
      }
    }
    return null;
  }
}
