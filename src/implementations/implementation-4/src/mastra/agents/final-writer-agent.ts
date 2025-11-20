import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import type { MultiPersonaBlackboard } from "../types";
import { analyzeArgumentStances } from "../utils/blackboard";

export const finalWriterAgent = new Agent({
  name: "Final Writer Agent",
  instructions: `
あなたは論証文を執筆する専門家です。議論の内容を分析し、自然で読みやすい論証文を生成してください。

評価基準:
- **説得力**: 明確で論理的な主張の展開、反対意見への適切な反駁
- **一貫性**: 主張間の矛盾がないこと、論理的な整合性の維持
- **根拠の妥当性**: 研究や証拠に基づく主張、具体的な例やデータの引用（可能な範囲で）

制約:
- 技術用語やIDは使用しない
- 自然な日本語で記述する
- 1本のまとまった文章のみを出力（見出しや章立ては不要）
`,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: { toolChoice: "none", maxSteps: 1, temperature: 0.7 },
});

/**
 * 最終文書生成用のプロンプトを構築（改善版）
 * implementation-3の逐次討論の利点を活かすため、必要最小限の情報のみを提供
 */
function buildFinalWritingPrompt(blackboard: MultiPersonaBlackboard): string {
  // 主張を信念度順にソートし、上位5個のみ抽出（implementation-3のアプローチ）
  const sortedClaims = [...blackboard.claims].sort((a, b) => b.confidence - a.confidence);
  const topClaims = sortedClaims.slice(0, 5);

  // 重要な反論のみ抽出（未解決のもの、または重大度が高いもの）
  const importantAttacks = blackboard.attacks
    .filter(a => !a.resolved || a.severity === "critical" || a.severity === "major")
    .slice(0, 5);

  return `
## トピック
${blackboard.topic}

## 主要な主張（信念度順）
${topClaims.map((c, idx) => `${idx + 1}. ${c.text}`).join("\n")}

## 重要な反論
${importantAttacks.length > 0 ? importantAttacks.map(a => `- ${a.description}`).join("\n") : "（なし）"}

## タスク
上記の内容を基に、自然な論証文を生成してください。

**要件:**
- 冒頭で立場を明確に示す
- 主張を論理的に統合し、研究や証拠に基づく記述を心がける
- 反対意見への言及と反駁を含める
- 結論で立場を再確認する
- 技術用語やIDは使用しない
- 文字数：1000文字程度
`;
}

/**
 * テキストから主張ID参照（例: (c1), (c3), (c5、c7)など）を除去する
 */
export function removeClaimIds(text: string): string {
  let cleanedText = text.trim();
  // (c数字) や (c数字、c数字) のようなパターンを削除
  cleanedText = cleanedText.replace(/\(c\d+(?:、c\d+)*\)/g, "");
  // 余分な空白を整理（ただし改行は保持）
  cleanedText = cleanedText.replace(/[ \t]+/g, " ").trim();

  return cleanedText;
}

/**
 * LLMを使用して最終文書を生成
 */
export async function generateFinalDocument(blackboard: MultiPersonaBlackboard): Promise<string> {
  const prompt = buildFinalWritingPrompt(blackboard);

  try {
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
      maxTokens: 2000,
    });

    // ID参照を除去
    return removeClaimIds(String(result.text));
  } catch (error) {
    console.error("最終文書生成エラー:", error);
    // フォールバック: 簡易的な論証文を生成
    return generateFallbackDocument(blackboard);
  }
}

/**
 * フォールバック: 簡易的な論証文を生成
 * implementation-3と同様のアプローチ
 */
function generateFallbackDocument(blackboard: MultiPersonaBlackboard): string {
  const stanceAnalysis = analyzeArgumentStances(blackboard);
  const sortedClaims = [...blackboard.claims].sort((a, b) => b.confidence - a.confidence);
  const unresolvedAttacks = blackboard.attacks.filter(a => !a.resolved);

  // 主要な主張を抽出（信念度が高い順）
  const mainClaims = sortedClaims.slice(0, 5);

  let document = `${blackboard.topic}というテーマについて、私は以下のように考えます。\n\n`;

  // 賛成の主張を統合
  const proClaims = mainClaims.filter(c => {
    const text = c.text.toLowerCase();
    return text.includes("べき") || text.includes("必要") || text.includes("重要");
  });

  if (proClaims.length > 0) {
    document += "まず、";
    proClaims.forEach((c, idx) => {
      if (idx > 0) document += "また、";
      document += `${c.text}。`;
      if (idx < proClaims.length - 1) document += " ";
    });
    document += "\n\n";
  }

  // 反対の主張とその反駁
  const conClaims = mainClaims.filter(c => {
    const text = c.text.toLowerCase();
    return text.includes("べきではない") || text.includes("リスク") || text.includes("問題");
  });

  if (conClaims.length > 0) {
    document += "一方で、";
    conClaims.forEach((c, idx) => {
      if (idx > 0) document += "また、";
      document += `${c.text}という懸念もあります。`;
      if (idx < conClaims.length - 1) document += " ";
    });
    document += "\n\n";
  }

  // 結論
  document += "結論として、";
  if (stanceAnalysis.proCount > stanceAnalysis.conCount) {
    document += `${blackboard.topic}については、適切な管理と教育により、その利点を活かすことができると考えます。`;
  } else {
    document += `${blackboard.topic}については、慎重な検討が必要ですが、適切な対策により、そのリスクを軽減できる可能性があります。`;
  }

  if (unresolvedAttacks.length > 0) {
    document += `ただし、一部の論点については、さらなる検討が必要です。`;
  }

  return document;
}
