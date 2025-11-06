import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { generateFinalDocument } from "../../agents/final-writer-agent";
import type { MultiPersonaBlackboard } from "../../types";

export const finalizeStep = createStep({
  id: "finalize",
  description: "結果の最終化（マルチペルソナ）",
  inputSchema: z.object({
    blackboard: z.custom<MultiPersonaBlackboard>(),
    finalStatus: z.string(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    finalDocument: z.string().optional(),
    argument: z.string().optional(),
    claims: z.array(z.any()),
    attacks: z.array(z.any()),
    stepCount: z.number(),
    convergenceHistory: z.array(z.number()),
    status: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { blackboard, finalStatus } = inputData;

    // Ensure final document exists: if absent, synthesize one from blackboard
    const finalDoc = blackboard.writepad?.finalDraft?.trim()
      ? blackboard.writepad.finalDraft
      : await generateFinalDocument(blackboard);

    const result = {
      topic: blackboard.topic,
      finalDocument: finalDoc,
      argument: finalDoc,
      claims: blackboard.claims,
      attacks: blackboard.attacks,
      stepCount: blackboard.meta.stepCount,
      convergenceHistory: blackboard.meta.convergenceHistory,
      status: finalStatus,
    };

    // Write outputs to files under both implementation-4 root and runtime cwd
    try {
      const runtimeDir = process.cwd();
      const compiledDir = dirname(fileURLToPath(new URL(".", import.meta.url)));
      const implRootDir = resolve(compiledDir, "..", "..");

      const outJsonPathRuntime = resolve(runtimeDir, "final-output.json");
      const outMdPathRuntime = resolve(runtimeDir, "final-output.md");

      const outJsonPathRoot = resolve(implRootDir, "final-output.json");
      const outMdPathRoot = resolve(implRootDir, "final-output.md");

      const jsonText = JSON.stringify(result, null, 2);
      await writeFile(outJsonPathRuntime, jsonText, { encoding: "utf8" });
      if (outJsonPathRoot !== outJsonPathRuntime) {
        await writeFile(outJsonPathRoot, jsonText, { encoding: "utf8" });
      }

      const mdLines: string[] = [];
      mdLines.push(`# 最終結果`);
      mdLines.push("");
      mdLines.push(`- トピック: ${result.topic}`);
      mdLines.push(`- ステータス: ${result.status}`);
      mdLines.push(`- ステップ数: ${result.stepCount}`);
      mdLines.push("");
      if (result.finalDocument) {
        mdLines.push(`## 最終ドキュメント`);
        mdLines.push("");
        mdLines.push(result.finalDocument);
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
      if (outMdPathRoot !== outMdPathRuntime) {
        await writeFile(outMdPathRoot, mdText, { encoding: "utf8" });
      }

      console.log(
        `最終結果を書き出しました:\n- root: ${outJsonPathRoot}, ${outMdPathRoot}\n- runtime: ${outJsonPathRuntime}, ${outMdPathRuntime}`,
      );
    } catch (err) {
      console.warn("最終結果のファイル書き出しに失敗しました:", err);
    }

    return result;
  },
});
