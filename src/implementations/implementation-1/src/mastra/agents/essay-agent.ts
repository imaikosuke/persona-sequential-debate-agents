import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

/**
 * Implementation 1: 単一LLM × 一括生成（One-shot）
 *
 * 論証文を生成する最もシンプルな実装。
 * - ツール不使用
 * - 外部知識不使用
 * - 一度のプロンプト送信で完結
 * - パラメータ固定（temperature: 0.7, top_p: 1.0, max_tokens: 2000）
 */
export const essayAgent = new Agent({
  name: "Essay Agent",
  instructions: `あなたは丁寧な日本語のライティングアシスタントです。
与えられたテーマについて、論証文を1本だけ生成してください。

制約：
- 禁則：箇条書きや思考説明をしない
- 思考過程の開示は行わず、最終テキストのみを出力してください
- 文字数：1000文字程度で生成してください`,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: {
    toolChoice: "none",
    maxSteps: 1,
    temperature: 0.7,
    topP: 1.0,
    maxTokens: 2000,
  },
});
