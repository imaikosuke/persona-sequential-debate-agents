/**
 * Implementation 3: ExecutorAgent（実行エージェント）
 * 選択された対話行為を実際に実行
 */

import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { buildExecutionPrompt } from "../prompts";
import type { BlackboardState, DialogueAct, ExecutionResult } from "../types";
import { extractJSON } from "../utils/blackboard";

/**
 * ExecutorAgent
 *
 * 指定された対話行為を実際に実行し、ブラックボードを更新する
 */
export const executorAgent = new Agent({
  name: "Executor Agent",
  instructions: `
あなたは対話行為を実行するエージェントです。

指定された対話行為を実際に実行し、ブラックボードを更新するための
具体的な内容を生成してください。

**役割:**
- PROPOSE: 新しい主張を生成する
- CRITIQUE: 既存の主張への反論を生成する
- FINALIZE: 最終的な論証文を生成する

**出力要件:**
- 常にJSON形式で出力する
- 各主張にはID、テキスト、証拠、信念度を含める
- 各攻撃には種類と重要度を明確にする
- 最終文書は説得力のある日本語で記述する

常にJSON形式で回答してください。
  `,
  model: openai("gpt-4o-mini"),
  defaultGenerateOptions: {
    toolChoice: "none",
    maxSteps: 1,
    temperature: 0.8,
  },
});

/**
 * 対話行為を実行する
 */
export async function executeDialogueAct(
  dialogueAct: DialogueAct,
  blackboard: BlackboardState,
): Promise<ExecutionResult | null> {
  const prompt = buildExecutionPrompt(dialogueAct, blackboard);

  try {
    const instructions = await executorAgent.getInstructions();
    const instructionsText =
      typeof instructions === "string"
        ? instructions
        : Array.isArray(instructions)
          ? instructions.map(i => (typeof i === "string" ? i : i.content)).join("\n")
          : instructions.content;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: instructionsText,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      maxTokens: 3000,
    });

    const executionResult = extractJSON<ExecutionResult>(result.text);

    if (!executionResult) {
      console.error("Failed to parse ExecutionResult:", result.text);
      return null;
    }

    // dialogueActを確実に設定
    executionResult.dialogueAct = dialogueAct;

    return executionResult;
  } catch (error) {
    console.error("Error in executeDialogueAct:", error);
    return null;
  }
}
