/**
 * Implementation 2: ワークフロー実行スクリプト
 * ArgumentGeneratorWorkflowを実行して論証文を生成
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

// プロジェクトルートの.envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// implementation-2/src/run-workflow.ts から プロジェクトルートへ
// __dirname = src/implementations/implementation-2/src
// .. = src/implementations/implementation-2
// .. = src/implementations
// .. = src
// .. = プロジェクトルート
const projectRoot = resolve(__dirname, "..", "..", "..", "..");
config({ path: resolve(projectRoot, ".env") });

import { mastra } from "./mastra";

async function main() {
  const proposition = process.argv[2] || "小学生はスマートフォンを持つべきか";

  console.log("=".repeat(60));
  console.log("Implementation 2: ペルソナ多様性 × 一括生成");
  console.log("=".repeat(60));
  console.log();
  console.log(`命題: ${proposition}`);
  console.log();

  try {
    console.log("ワークフローを開始します...\n");

    // ワークフローを取得して実行
    const workflow = mastra.getWorkflow("argumentGeneratorWorkflow");
    if (!workflow) {
      throw new Error("argumentGeneratorWorkflowが見つかりません");
    }

    const run = await workflow.createRunAsync();
    const result = await run.start({
      inputData: {
        proposition,
        isRandom: false, // インテリジェント選択
        selectedNum: 3,
      },
    });

    if (result.status !== "success") {
      const errorMessage =
        result.status === "failed" ? result.error?.message || "不明なエラー" : "不明なエラー";
      throw new Error(`ワークフローが失敗しました: ${errorMessage}`);
    }

    const output = result.result as {
      query: string;
      personaLists: Array<{
        agent_id: number;
        description: string;
        claim: string;
        reason?: string;
      }>;
      selectedPersonaLists: Array<{
        agent_id: number;
        description: string;
        claim: string;
        reason?: string;
      }>;
      discussion: string;
      plan: string;
      argument: string;
    };

    console.log("\n" + "=".repeat(60));
    console.log("実行結果");
    console.log("=".repeat(60));
    console.log("\n✅ ワークフローが正常に完了しました\n");

    console.log(`選択されたペルソナ数: ${output.selectedPersonaLists.length}`);
    console.log(`生成された論証文の長さ: ${output.argument.length}文字`);
    console.log();

    if (output.argument) {
      console.log("--- 生成された論証文 ---");
      console.log(output.argument);
    }
  } catch (error) {
    console.error("\n❌ エラーが発生しました:");
    console.error(error);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
}

void main();
