/**
 * Implementation 4: ワークフロー実行スクリプト
 * MultiPersonaArgumentationWorkflowを実行して論証文を生成
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

// プロジェクトルートの.envファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// implementation-4/src/run-workflow.ts から プロジェクトルートへ
// __dirname = src/implementations/implementation-4/src
// .. = src/implementations/implementation-4
// .. = src/implementations
// .. = src
// .. = プロジェクトルート
const projectRoot = resolve(__dirname, "..", "..", "..", "..");
config({ path: resolve(projectRoot, ".env") });

import { mastra } from "./mastra";

async function main() {
  const topic = process.argv[2] || "小学生はスマートフォンを持つべきか";

  console.log("=".repeat(60));
  console.log("Implementation 4: ペルソナ多様性 × 逐次討論");
  console.log("=".repeat(60));
  console.log();
  console.log(`トピック: ${topic}`);
  console.log(`最大ステップ数: 10`);
  console.log(`トークン予算: 10000`);
  console.log();

  try {
    // ワークフローの実行インスタンスを作成
    const workflow = mastra.getWorkflow("multiPersonaArgumentationWorkflow");

    const run = await workflow.createRunAsync();

    console.log("ワークフローを開始します...\n");

    // ワークフローを実行
    const result = await run.start({
      inputData: {
        topic,
        tokenBudget: 10000,
        maxSteps: 10,
      },
    });

    // 結果を表示
    console.log("\n" + "=".repeat(60));
    console.log("実行結果");
    console.log("=".repeat(60));

    if (result.status === "success") {
      console.log("\n✅ ワークフローが正常に完了しました\n");

      interface Claim {
        id: string;
        text: string;
        support: string[];
        createdAt: number;
        lastUpdated: number;
      }

      interface Attack {
        id: string;
        fromClaimId: string;
        toClaimId: string;
        type: string;
        severity: string;
        description: string;
      }

      const output = result.result as {
        topic: string;
        argument?: string;
        claims: Array<Claim>;
        attacks: Array<Attack>;
        stepCount: number;
        status: string;
      };

      console.log(`ステータス: ${output.status}`);
      console.log(`総ステップ数: ${output.stepCount}`);
      console.log(`生成された主張数: ${output.claims.length}`);
      console.log(`生成された攻撃数: ${output.attacks.length}`);
      console.log();

      if (output.argument) {
        console.log("--- 生成された論証文 ---");
        console.log(output.argument);
      } else {
        console.log("\n⚠️  最終文書が生成されませんでした");
      }
    } else if (result.status === "failed") {
      console.error("\n❌ ワークフローが失敗しました");
      console.error("エラー:", result.error);
    } else if (result.status === "suspended") {
      console.log("\n⏸️  ワークフローが中断されました");
    }
  } catch (error) {
    console.error("\n❌ エラーが発生しました:");
    console.error(error);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
}

void main();
