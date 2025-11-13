/**
 * Implementation 3: 最終化ステップ
 * 結果を整形して返す（ファイル出力機能付き）
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import type { BlackboardState } from "../../types/blackboard";

/**
 * 最終化ステップ
 * 結果を整形して返す
 */
export const finalizeStep = createStep({
  id: "finalize",
  description: "結果の最終化",
  inputSchema: z.object({
    blackboard: z.custom<BlackboardState>(),
    finalStatus: z.string(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    argument: z.string().optional(),
    claims: z.array(z.any()),
    attacks: z.array(z.any()),
    stepCount: z.number(),
    convergenceHistory: z.array(z.number()),
    status: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { blackboard, finalStatus } = inputData;

    const result = {
      topic: blackboard.topic,
      argument: blackboard.writepad?.finalDraft,
      claims: blackboard.claims,
      attacks: blackboard.attacks,
      stepCount: blackboard.meta.stepCount,
      convergenceHistory: blackboard.meta.convergenceHistory,
      status: finalStatus,
    };

    // Write outputs to files under runtime cwd
    try {
      const runtimeDir = process.cwd();

      const outJsonPathRuntime = resolve(runtimeDir, "final-output.json");
      const outMdPathRuntime = resolve(runtimeDir, "final-output.md");

      const jsonText = JSON.stringify(result, null, 2);
      await writeFile(outJsonPathRuntime, jsonText, { encoding: "utf8" });

      const mdLines: string[] = [];
      mdLines.push(`# 最終結果`);
      mdLines.push("");
      mdLines.push(`- トピック: ${result.topic}`);
      mdLines.push(`- ステータス: ${result.status}`);
      mdLines.push(`- ステップ数: ${result.stepCount}`);
      mdLines.push("");
      if (result.argument) {
        mdLines.push(`## 最終ドキュメント`);
        mdLines.push("");
        mdLines.push(result.argument);
        mdLines.push("");
      }
      mdLines.push(`## 主張 (Claims)`);
      mdLines.push("");
      for (const c of result.claims) {
        mdLines.push(`- [${c.id}] ${c.text} (信念度: ${Number(c.confidence).toFixed(2)})`);
      }
      mdLines.push("");
      mdLines.push(`## 攻撃 (Attacks)`);
      mdLines.push("");
      for (const a of result.attacks) {
        mdLines.push(
          `- ${a.fromClaimId} → ${a.toClaimId}: ${a.description} [${a.severity}] ${a.resolved ? "✓解決済" : "未解決"}`,
        );
      }

      const mdText = mdLines.join("\n");
      await writeFile(outMdPathRuntime, mdText, { encoding: "utf8" });

      console.log(`最終結果を書き出しました:\n- ${outJsonPathRuntime}\n- ${outMdPathRuntime}`);
    } catch (err) {
      console.warn("最終結果のファイル書き出しに失敗しました:", err);
    }

    return result;
  },
});
