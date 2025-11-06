import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import type { MultiPersonaBlackboard } from "../types";

export const finalWriterAgent = new Agent({
  name: "Final Writer Agent",
  instructions: `
あなたは議論のブラックボード状態（主張/攻撃/計画など）から、
日本語で一貫性のある最終的な論証文（1本の文章）を執筆する専門家です。

要件:
- 1本のまとまった文章のみを出力（見出しや章立ては不要）
- 冒頭で立場と論旨を明確化し、重要な根拠を統合
- 反対意見・懸念への言及と反駁を適度に含める
- 結論で立場と示唆を簡潔に再提示
- 冗長さを避け、読みやすく、説得的に
`,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: { toolChoice: "none", maxSteps: 1, temperature: 0.7 },
});

function buildFinalWritingPrompt(blackboard: MultiPersonaBlackboard): string {
  const claimsText =
    blackboard.claims
      .map(c => `- [${c.id}] ${c.text} (信念度: ${c.confidence.toFixed(2)})`)
      .join("\n") || "（主張なし）";

  const attacksText =
    blackboard.attacks
      .map(
        a =>
          `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}] ${a.resolved ? "✓解決済" : "未解決"}`,
      )
      .join("\n") || "（攻撃なし）";

  return `
【トピック】
${blackboard.topic}

【主張一覧】
${claimsText}

【攻撃（反論・指摘）】
${attacksText}

【計画・注力点】
- 注力点: ${blackboard.plan.currentFocus}
- 次のステップ: ${blackboard.plan.nextSteps.join(", ")}
- 避けるべきトピック: ${blackboard.plan.avoidTopics.join(", ") || "なし"}

【合意レベル（暫定）】 ${blackboard.consensusLevel.toFixed(2)}

タスク:
- 上記を踏まえ、1本の最終的な論証文を日本語で執筆してください。
- 箇条書きや見出しは用いず、自然な段落で連続した文章として出力してください。
- 800〜1200語程度を目安とし、過度に冗長にならないようにしてください。
`;
}

export async function generateFinalDocument(blackboard: MultiPersonaBlackboard): Promise<string> {
  const prompt = buildFinalWritingPrompt(blackboard);

  const instructions = await finalWriterAgent.getInstructions();
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
    maxTokens: 3000,
  });

  return String(result.text).trim();
}

