import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { generateFinalDocument, removeClaimIds } from "../../agents/final-writer-agent";
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
    argument: z.string().optional(),
    claims: z.array(z.any()),
    attacks: z.array(z.any()),
    stepCount: z.number(),
    status: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { blackboard, finalStatus } = inputData;

    // Ensure final document exists: if absent, synthesize one from blackboard
    const finalDocRaw = blackboard.writepad?.finalDraft?.trim()
      ? blackboard.writepad.finalDraft
      : await generateFinalDocument(blackboard);
    // ID参照を除去（writepad.finalDraftから来た場合も含む）
    const finalDoc = removeClaimIds(finalDocRaw);

    const result = {
      topic: blackboard.topic,
      argument: finalDoc,
      claims: blackboard.claims,
      attacks: blackboard.attacks,
      stepCount: blackboard.meta.stepCount,
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

      // Also write to arguments folder for comparison (プロジェクトルートのargumentsフォルダ)
      // プロジェクトルートを取得（関数スコープ内で計算して衝突を回避）
      const stepFilename = fileURLToPath(import.meta.url);
      const stepDirname = dirname(stepFilename);
      const projectRoot = resolve(stepDirname, "..", "..", "..", "..", "..", "..", "..");
      const argumentsDir = resolve(projectRoot, "arguments");
      const outArgumentsPath = resolve(argumentsDir, "output-implementation-4.md");

      // arguments ディレクトリが存在しない場合は作成
      try {
        await mkdir(argumentsDir, { recursive: true });
      } catch (mkdirErr) {
        // ディレクトリが既に存在する場合は無視
        if ((mkdirErr as NodeJS.ErrnoException).code !== "EEXIST") {
          throw mkdirErr;
        }
      }

      // 論証文だけを保存
      const mdText = result.argument || "";
      await writeFile(outMdPathRuntime, mdText, { encoding: "utf8" });
      if (outMdPathRoot !== outMdPathRuntime) {
        await writeFile(outMdPathRoot, mdText, { encoding: "utf8" });
      }
      await writeFile(outArgumentsPath, mdText, { encoding: "utf8" });

      console.log(
        `最終結果を書き出しました:\n- root: ${outJsonPathRoot}, ${outMdPathRoot}\n- runtime: ${outJsonPathRuntime}, ${outMdPathRuntime}\n- arguments: ${outArgumentsPath}`,
      );
    } catch (err) {
      console.warn("最終結果のファイル書き出しに失敗しました:", err);
    }

    return result;
  },
});
