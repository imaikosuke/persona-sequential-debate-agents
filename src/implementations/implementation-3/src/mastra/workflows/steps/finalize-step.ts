/**
 * Implementation 3: 最終化ステップ
 * 結果を整形して返す（ファイル出力機能付き）
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
    status: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { blackboard, finalStatus } = inputData;

    // 最終文書を生成（writepadがないため、常に生成する）
    const { generateFinalDocument } = await import("../../prompts/final-document");
    const finalDocument = await generateFinalDocument(blackboard);

    const result = {
      topic: blackboard.topic,
      argument: finalDocument,
      claims: blackboard.claims,
      attacks: blackboard.attacks,
      stepCount: blackboard.meta.stepCount,
      status: finalStatus,
    };

    // Write outputs to files under runtime cwd and arguments folder
    try {
      const runtimeDir = process.cwd();

      const outJsonPathRuntime = resolve(runtimeDir, "final-output.json");
      const outMdPathRuntime = resolve(runtimeDir, "final-output.md");

      // Also write to arguments folder for comparison (プロジェクトルートのargumentsフォルダ)
      // プロジェクトルートを取得（関数スコープ内で計算して衝突を回避）
      const stepFilename = fileURLToPath(import.meta.url);
      const stepDirname = dirname(stepFilename);
      const projectRoot = resolve(stepDirname, "..", "..", "..", "..", "..", "..", "..");
      const argumentsDir = resolve(projectRoot, "arguments");
      const outArgumentsPath = resolve(argumentsDir, "output-implementation-3.md");

      // arguments ディレクトリが存在しない場合は作成
      try {
        await mkdir(argumentsDir, { recursive: true });
      } catch (mkdirErr) {
        // ディレクトリが既に存在する場合は無視
        if ((mkdirErr as NodeJS.ErrnoException).code !== "EEXIST") {
          throw mkdirErr;
        }
      }

      const jsonText = JSON.stringify(result, null, 2);
      await writeFile(outJsonPathRuntime, jsonText, { encoding: "utf8" });

      // 論証文だけを保存
      const mdText = result.argument || "";
      await writeFile(outMdPathRuntime, mdText, { encoding: "utf8" });
      await writeFile(outArgumentsPath, mdText, { encoding: "utf8" });

      console.log(
        `最終結果を書き出しました:\n- ${outJsonPathRuntime}\n- ${outMdPathRuntime}\n- ${outArgumentsPath}`,
      );
    } catch (err) {
      console.warn("最終結果のファイル書き出しに失敗しました:", err);
    }

    return result;
  },
});
