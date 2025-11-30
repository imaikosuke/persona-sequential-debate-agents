/**
 * Implementation 3: 最終文書生成用プロンプト
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { BlackboardState } from "../types";

/**
 * 最終文書生成用のプロンプトを構築
 * 逐次討論の利点を活かすため、必要最小限の情報のみを提供
 */
export function buildFinalDocumentPrompt(blackboard: BlackboardState): string {
  // 主張を信念度順にソートし、上位5個のみ抽出
  const sortedClaims = [...blackboard.claims].sort((a, b) => b.confidence - a.confidence);
  const topClaims = sortedClaims.slice(0, 5);

  // 重要な反論のみ抽出（未解決のもの、または重大度が高いもの）
  const importantAttacks = blackboard.attacks
    .filter(a => !a.resolved || a.severity === "critical" || a.severity === "major")
    .slice(0, 5);

  return `
## トピック
${blackboard.topic}

## 主要な主張
${topClaims.map((c, idx) => `${idx + 1}. ${c.text}`).join("\n")}

## 重要な反論
${importantAttacks.length > 0 ? importantAttacks.map(a => `- ${a.description}`).join("\n") : "（なし）"}

## タスク
上記の内容を基に、自然な論証文を生成してください。

**要件:**
- 主張を論理的に統合
- 反対意見への言及と反駁を含める
- 技術用語やIDは使用しない
- 文字数：1000文字程度
`;
}

/**
 * LLMを使用して最終文書を生成
 */
export async function generateFinalDocument(blackboard: BlackboardState): Promise<string> {
  const prompt = buildFinalDocumentPrompt(blackboard);

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: `あなたは論証文を執筆する専門家です。議論の内容を分析し、自然で読みやすい論証文を生成してください。

評価基準: 説得力、妥当性、効果力
制約: 技術用語やIDは使用しない。自然な日本語で記述する。`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    return result.text.trim();
  } catch (error) {
    console.error("最終文書生成エラー:", error);
    // エラー時は空文字列を返す
    return "";
  }
}
