import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { buildPersonaExecutionPrompt } from "../prompts";
import type { Claim, DialogueAct, ExecutionResult, MultiPersonaBlackboard } from "../types";

export const multiExecutorAgent = new Agent({
  name: "Multi-Executor Agent",
  instructions: `
あなたは選択されたペルソナの視点で対話行為を実行するエージェントです。

**逐次討論の原則:**
- **1回のアクションで追加できる主張は最大2個まで**です
- 議論を段階的に深めるため、一度に多くの主張を追加しないでください
- 既存の主張や反論をよく検討してから、次のステップで何を追加すべきか判断してください
- **1つの主張は1つの論点のみを含む**ようにしてください

**論証の質の評価基準:**
- **説得力**: 明確で論理的な主張の展開、反対意見への適切な反駁
- **一貫性**: 主張間の矛盾がないこと、論理的な整合性の維持
- **根拠の妥当性**: 研究や証拠に基づく主張、具体的な例やデータの引用（可能な範囲で）

**⚠️ 重要: 未解決の反論への対応**
- 未解決の反論がある場合、それらへの再反論を最優先で検討してください
- 新しい主張を追加する際は、その主張で既存の未解決の反論を攻撃することを優先してください
- 反論解決を優先することで、議論の質が向上します

**出力要件:**
- 常にJSON形式で出力してください
- newClaims には personaContext を含める
- 必要に応じて crossReferences を生成する
- **重複反論の防止**: 既存の反論と同じ内容の反論を生成しないでください
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
