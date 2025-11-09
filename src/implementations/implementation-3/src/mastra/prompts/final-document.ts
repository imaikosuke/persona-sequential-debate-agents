/**
 * Implementation 3: 最終文書生成用プロンプト
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { BlackboardState } from "../types";
import { analyzeArgumentStances } from "../utils/blackboard";

/**
 * 最終文書生成用のプロンプトを構築
 */
function buildFinalDocumentPrompt(blackboard: BlackboardState): string {
  const stanceAnalysis = analyzeArgumentStances(blackboard);
  const unresolvedAttacks = blackboard.attacks.filter(a => !a.resolved);

  // 主張を信念度順にソート
  const sortedClaims = [...blackboard.claims].sort((a, b) => b.confidence - a.confidence);

  return `
## タスク: 最終論証文の生成

以下の議論の内容を基に、自然な論証文を生成してください。

### トピック
${blackboard.topic}

### 議論の概要
- 総主張数: ${blackboard.claims.length}件
- 賛成の主張: ${stanceAnalysis.proCount}件
- 反対の主張: ${stanceAnalysis.conCount}件
- 反論数: ${blackboard.attacks.length}件
- 未解決の反論: ${unresolvedAttacks.length}件

### 主な主張（信念度順）

${sortedClaims
  .map((c, idx) => `${idx + 1}. [${c.id}] ${c.text} (信念度: ${c.confidence.toFixed(2)})`)
  .join("\n")}

### 反論の関係

${blackboard.attacks
  .map(
    a =>
      `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}] ${a.resolved ? "✓解決済" : "❌未解決"}`,
  )
  .join("\n")}

### 生成要件

以下の形式で自然な論証文を生成してください。**論証文は説得力、一貫性、根拠の妥当性の観点で評価されます。**

#### 評価基準

1. **説得力**
   - 明確で論理的な主張の展開
   - 反対意見への適切な反駁
   - 読者を納得させる論理的な流れ

2. **一貫性**
   - 主張間の矛盾がないこと
   - 論理的な整合性の維持
   - 立場の一貫性

3. **根拠の妥当性**
   - 研究や証拠に基づく主張
   - 具体的な例やデータの引用（可能な範囲で）
   - 信頼性の高い情報源への言及

#### 生成形式

1. **明確な立場表明**
   - 冒頭で自分の立場を明確に示す（例：「私は...という立場を取ります」）
   - 立場の根拠を簡潔に示す

2. **主張の統合と論理的な展開**
   - 主張を時系列や論理的な流れで統合する
   - **根拠の妥当性**: 研究や証拠に基づく主張を強調する（「近年の研究によれば」「具体的には」「たとえば」など）
   - 信念度の高い主張を中心に据える
   - **一貫性**: 主張間の矛盾がないよう注意する

3. **反対意見への言及と反駁**
   - 反対意見を適切に言及する（「反対意見として...がある」など）
   - **説得力**: 反論を活用して反対意見を反駁する（「しかし、これは...によって反証されている」「たとえば、...という研究が示している」など）
   - 解決済みの反論を活用して論点を強化する
   - 反対意見の妥当性も認めつつ、自分の立場の優位性を示す

4. **結論**
   - 立場を再確認する
   - 今後の展望や推奨事項を示す
   - **一貫性**: 冒頭の立場表明と結論が一致していることを確認する

5. **文体**
   - 自然な日本語で記述する
   - 技術的な用語（「主張」「反論」「信念度」など）は使わない
   - 段落ごとに論点を整理し、読みやすくする
   - 400-800文字程度の適切な長さにする
   - **説得力**: 断定的すぎず、適度な謙虚さを保つ

### 出力形式

論証文のみを出力してください。見出しやマークダウン記号は不要です。自然な文章として出力してください。
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

**重要な評価基準:**
- **説得力**: 明確で論理的な主張の展開、反対意見への適切な反駁、読者を納得させる論理的な流れ
- **一貫性**: 主張間の矛盾がないこと、論理的な整合性の維持、立場の一貫性
- **根拠の妥当性**: 研究や証拠に基づく主張、具体的な例やデータの引用、信頼性の高い情報源への言及

これらの評価基準を満たす論証文を生成してください。`,
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
