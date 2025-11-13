# Implementation 3: 単一LLM × 逐次討論（Self-Deliberative Agent）

このプロジェクトは、エージェントが自律的に議論を制御し、対話行為を選択しながら論証を構築するシステムです。

## 概要

Implementation 3は、LLMエージェントが自分自身で議論の進行を制御し、最適なタイミングで議論を収束させる「自律的な逐次討論」を実装しています。

### 特徴

- **自律的な制御**: エージェントが次のアクションと終了タイミングを自分で決定
- **対話行為の選択**: PROPOSE（提案）、CRITIQUE（批判）、FINALIZE（終了）から選択
- **ブラックボード方式**: 議論の状態（Claims, Attacks, Questions）を共有メモリで管理
- **収束判定**: 信念度、攻撃解決率、新規性などの指標で自動的に収束を判定

## プロジェクト構造

```
src/
├── mastra/
│   ├── agents/                    # エージェント定義
│   │   ├── deliberative-agent.ts  # 熟考エージェント（対話行為選択）
│   │   ├── executor-agent.ts      # 実行エージェント（対話行為実行）
│   │   ├── judge-agent.ts         # 判定エージェント（議論評価）
│   │   └── index.ts               # エージェントエクスポート
│   ├── prompts/
│   │   └── index.ts               # プロンプト生成関数
│   ├── types/
│   │   ├── blackboard.ts          # 型定義
│   │   └── index.ts               # 型エクスポート
│   ├── utils/
│   │   └── blackboard.ts          # ブラックボード操作ユーティリティ
│   ├── workflows/
│   │   ├── steps/                 # ワークフローステップ
│   │   │   ├── initialize-step.ts         # 初期化ステップ
│   │   │   ├── deliberation-loop-step.ts  # 討論ループステップ
│   │   │   ├── finalize-step.ts           # 最終化ステップ
│   │   │   ├── logging.ts                 # ログ出力ヘルパー
│   │   │   └── index.ts                   # ステップエクスポート
│   │   ├── argumentation-workflow.ts      # ワークフロー定義
│   │   └── index.ts                       # ワークフローエクスポート
│   └── index.ts                   # Mastraインスタンス
└── run-workflow.ts                # 実行スクリプト
```

## アーキテクチャ

### エージェント構成

1. **DeliberativeAgent（熟考エージェント）**
   - 現在の議論状態を分析
   - 次に取るべき対話行為を選択
   - 効用関数に基づく意思決定

2. **ExecutorAgent（実行エージェント）**
   - 選択された対話行為を実行
   - 新しい主張や反論を生成
   - ブラックボード更新用のデータを生成

3. **JudgeAgent（判定エージェント）**
   - 議論の質と進捗を評価
   - 収束度、新規性、攻撃解決率を算出
   - 収束スコアを提供

### ワークフロー

**ArgumentationWorkflow** は以下の3ステップで構成されます：

1. **Initialize**: ブラックボードの初期化
2. **Deliberation Loop**: 対話行為の選択→実行→評価を繰り返す
3. **Finalize**: 結果の最終化と整形

## 使用方法

### 基本的な実行

```typescript
import { mastra } from "./src/mastra";

// ワークフローを実行
const run = await mastra.getWorkflow("argumentationWorkflow").createRunAsync();

const result = await run.start({
  inputData: {
    topic: "電子投票制度の導入について",
    tokenBudget: 10000,
    maxSteps: 10,
  },
});

console.log("最終文書:", result.output.argument);
console.log("生成された主張数:", result.output.claims.length);
console.log("総ステップ数:", result.output.stepCount);
```

### 開発モードで実行

```bash
# ルートディレクトリから
make dev-3

# または
pnpm --filter implementation-3 dev
```

## データ構造

### BlackboardState

議論の状態を管理する中心的なデータ構造：

```typescript
interface BlackboardState {
  topic: string; // 議論のトピック
  claims: Claim[]; // 主張リスト
  attacks: Attack[]; // 攻撃（反論）リスト
  questions: Question[]; // 質問リスト
  plan: Plan; // 探索方針
  writepad: Writepad; // 執筆パッド
  meta: {
    // メタ情報
    stepCount: number;
    tokenBudget: number;
    usedTokens: number;
    convergenceHistory: number[];
  };
}
```

### 対話行為（Dialogue Acts）

```typescript
enum DialogueAct {
  PROPOSE = "propose", // 新しい主張の追加
  CRITIQUE = "critique", // 既存主張への反論
  FINALIZE = "finalize", // 議論の終了
}
```

_注: MVP版では3つの対話行為のみ実装。将来的にQUESTION、FACT_CHECK、SYNTHESIZE、PLANを追加予定_

## 収束判定

エージェントは以下の条件で自動的に議論を終了します：

1. **信念収束**: 主張の信念度が0.75以上で安定
2. **反論閉包**: 致命的な未解決の攻撃が0件
3. **ステップ制限**: 最大ステップ数に到達
4. **収束スコア**: 総合的な収束スコアが閾値を超える

## 出力例

```typescript
{
  topic: "電子投票制度の導入について",
  argument: "電子投票制度の導入に関する論証文...",
  claims: [
    {
      id: "claim-1",
      text: "電子投票は投票率を向上させる可能性がある",
      confidence: 0.8,
      support: ["海外の事例", "利便性の向上"]
    },
    // ...
  ],
  attacks: [
    {
      id: "attack-1",
      fromClaimId: "claim-2",
      toClaimId: "claim-1",
      type: "evidence",
      severity: "major",
      description: "セキュリティリスクが高い"
    }
  ],
  stepCount: 7,
  convergenceHistory: [0.3, 0.5, 0.65, 0.75, 0.8],
  status: "収束条件を満たして終了しました"
}
```

## 実装の段階（Phase）

### ✅ Phase 1: MVP（現在）

- ブラックボードデータ構造
- 3つの基本エージェント
- 簡易的なワークフロー
- PROPOSE, CRITIQUE, FINALIZE の3つの対話行為

### 🚧 Phase 2: 完全な対話行為セット（今後）

- 全7種類の対話行為
- 効用関数ベースの選択ロジック
- 完全なブラックボード更新

### 🚧 Phase 3: 自律的収束判定（今後）

- 動的な閾値調整
- 議論グラフの分析機能
- 複雑度に応じた適応的制御

### 🚧 Phase 4: 最適化と拡張（今後）

- トークン使用量の最適化
- ツール統合（FACT_CHECK用）
- 複数ペルソナへの拡張
- メモリ機能の統合

## Implementation 1/2 との比較

| 観点       | Implementation 1 | Implementation 2          | Implementation 3 |
| ---------- | ---------------- | ------------------------- | ---------------- |
| アプローチ | One-shot生成     | 固定4ステップワークフロー | 自律的逐次討論   |
| 制御       | なし             | 外部定義                  | エージェント内生 |
| ステップ数 | 1回              | 4回（固定）               | 可変（収束まで） |
| 状態管理   | なし             | ワークフロー変数          | ブラックボード   |
| 収束判定   | N/A              | 固定完了                  | 自己判定         |
| 複雑度     | 低               | 中                        | 高               |
| 柔軟性     | 低               | 中                        | 高               |

## 技術スタック

- **Mastra**: AIエージェント・ワークフローフレームワーク
- **OpenAI GPT-4o-mini**: 言語モデル
- **TypeScript**: プログラミング言語
- **Zod**: スキーマバリデーション

## 開発情報

詳細な実装方針については、`/docs/implementation-3.md` を参照してください。

## 次のステップ

1. ワークフローの動作検証
2. Implementation 1/2との比較実験
3. Phase 2の機能追加
4. メモリ機能の統合
