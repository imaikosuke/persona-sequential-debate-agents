/**
 * Implementation 3: ワークフロー実行スクリプト
 * ArgumentationWorkflowを実行してテストする
 */

import { mastra } from "./mastra";

/**
 * ワークフローの出力型
 */
interface WorkflowResult {
  topic: string;
  argument?: string;
  claims: Array<{
    id: string;
    text: string;
    confidence: number;
    support: string[];
    createdAt: number;
    lastUpdated: number;
  }>;
  attacks: Array<{
    id: string;
    fromClaimId: string;
    toClaimId: string;
    type: string;
    severity: string;
    description: string;
    resolved: boolean;
  }>;
  stepCount: number;
  convergenceHistory: number[];
  status: string;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Implementation 3: 自律的逐次討論ワークフロー");
  console.log("=".repeat(60));
  console.log();

  // トピックを設定
  const topic = "電子投票制度の導入について";

  console.log(`トピック: ${topic}`);
  console.log(`最大ステップ数: 10`);
  console.log(`トークン予算: 10000`);
  console.log();

  try {
    // ワークフローの実行インスタンスを作成

    const workflow = mastra.getWorkflow("argumentationWorkflow");

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

      const output = result.result as WorkflowResult;

      console.log(`ステータス: ${output.status}`);
      console.log(`総ステップ数: ${output.stepCount}`);
      console.log(`生成された主張数: ${output.claims.length}`);
      console.log(`生成された攻撃数: ${output.attacks.length}`);
      console.log(`収束履歴: ${output.convergenceHistory.join(", ")}`);

      console.log("\n--- 主張一覧 ---");
      for (const claim of output.claims) {
        console.log(
          `[${claim.id}] 信念度: ${claim.confidence.toFixed(2)} - ${claim.text.slice(0, 100)}...`,
        );
      }

      if (output.attacks.length > 0) {
        console.log("\n--- 攻撃一覧 ---");
        for (const attack of output.attacks) {
          console.log(
            `[${attack.id}] ${attack.fromClaimId} → ${attack.toClaimId} (${attack.severity}): ${attack.description.slice(0, 80)}...`,
          );
        }
      }

      if (output.argument) {
        console.log("\n--- 最終文書 ---");
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
  }

  console.log("\n" + "=".repeat(60));
}

void main();
