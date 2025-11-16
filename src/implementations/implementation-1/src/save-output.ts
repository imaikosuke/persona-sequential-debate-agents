/**
 * Implementation 1: 出力保存スクリプト
 * エージェントの実行結果をargumentsフォルダに保存する
 */

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { config } from "dotenv";

// プロジェクトルートの.envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// implementation-1/src/save-output.ts から プロジェクトルートへ
// __dirname = src/implementations/implementation-1/src
// .. = src/implementations/implementation-1
// .. = src/implementations
// .. = src
// .. = プロジェクトルート
const projectRoot = resolve(__dirname, "..", "..", "..", "..");
config({ path: resolve(projectRoot, ".env") });

async function main() {
  const topic = process.argv[2] || "小学生はスマートフォンを持つべきか";

  console.log("=".repeat(60));
  console.log("Implementation 1: 単一LLM × 一括生成");
  console.log("=".repeat(60));
  console.log();
  console.log(`トピック: ${topic}`);
  console.log();

  try {
    // 直接generateTextを使用（Mastra 0.20とAI SDK v4の互換性問題を回避）
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: `あなたは丁寧な日本語のライティングアシスタントです。
与えられたテーマについて、論証文を1本だけ生成してください。

制約：
- 禁則：箇条書きや思考説明をしない
- 思考過程の開示は行わず、最終テキストのみを出力してください`,
        },
        {
          role: "user",
          content: topic,
        },
      ],
      temperature: 0.0,
      topP: 1.0,
      maxTokens: 2048,
    });

    const argument = result.text;

    console.log("✅ 論証文が生成されました");
    console.log(`長さ: ${argument.length}文字`);
    console.log();

    // argumentsフォルダに保存
    // プロジェクトルートのargumentsフォルダを探す
    const currentDir = process.cwd();
    let argumentsDir = resolve(currentDir, "arguments");

    // もし現在のディレクトリがimplementation-1内なら、プロジェクトルートに移動
    if (currentDir.includes("implementation-1")) {
      // implementation-1から3階層上がプロジェクトルート
      const projectRoot = resolve(currentDir, "..", "..", "..");
      argumentsDir = resolve(projectRoot, "arguments");
    }

    const outArgumentsPath = resolve(argumentsDir, "output-implementation-1.md");

    // 論証文だけを保存
    const mdText = argument;
    await writeFile(outArgumentsPath, mdText, { encoding: "utf8" });

    console.log(`✅ 最終結果をargumentsフォルダに書き出しました: ${outArgumentsPath}`);
    console.log();
    console.log("--- 生成された論証文 ---");
    console.log(argument);
  } catch (error) {
    console.error("\n❌ エラーが発生しました:");
    console.error(error);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
}

void main();
