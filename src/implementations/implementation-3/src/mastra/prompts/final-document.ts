/**
 * Implementation 3: 最終文書生成用プロンプト
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { BlackboardState } from "../types";
import { analyzeArgumentStances } from "../utils/blackboard";

/**
 * 最終文書生成用のプロンプトを構築（簡潔版）
 * 逐次討論の利点を活かすため、必要最小限の情報のみを提供
 */
function buildFinalDocumentPrompt(blackboard: BlackboardState): string {
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
- 冒頭で立場を明確に示す
- 主張を論理的に統合し、研究や証拠に基づく記述を心がける
- 反対意見への言及と反駁を含める
- 結論で立場を再確認する
- 技術用語やIDは使用しない
- 400-800文字程度
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

評価基準: 説得力、一貫性、根拠の妥当性
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
    // フォールバック: 簡易的な論証文を生成
    return generateFallbackDocument(blackboard);
  }
}

/**
 * フォールバック: 簡易的な論証文を生成
 */
function generateFallbackDocument(blackboard: BlackboardState): string {
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
