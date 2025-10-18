# Implementation 3: 単一LLM × 逐次討論（Self-Deliberative Agent）

## 目的と原則

- **目的**: エージェントが自律的に議論を制御し、対話行為を選択しながら論証を構築
- **対象**: 単一LLM（複数ペルソナ拡張可能）
- **測定原則**:
  1. 単一モデルでスタート
  2. 逐次的な対話行為選択
  3. 自律的収束判定
  4. ブラックボード方式の状態管理
  5. 効用関数ベースの意思決定
  6. 議論の多様性（賛成/反対両方の視点）

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│              ArgumentationWorkflow                  │
│  Initialize → Loop(Discussion) → Finalize          │
│                    [Blackboard State]               │
└─────────────────────────────────────────────────────┘
         ↓                  ↓                  ↓
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │Deliberate│      │ Execute  │      │  Judge   │
   │  Agent   │      │  Agent   │      │  Agent   │
   └──────────┘      └──────────┘      └──────────┘
```

### エージェント構成

- **DeliberativeAgent**: 次の対話行為を選択（意思決定）
- **ExecutorAgent**: 選択された対話行為を実行
- **JudgeAgent**: 議論の質と収束状態を評価

## 対話行為（Dialogue Acts）

```typescript
enum DialogueAct {
  PROPOSE = "propose", // 新しい主張の追加・修正
  CRITIQUE = "critique", // 既存主張への反論
  QUESTION = "question", // 情報要求・明確化
  FACT_CHECK = "fact_check", // 事実確認（将来的にツール連携）
  SYNTHESIZE = "synthesize", // 論点整理・部分合意
  PLAN = "plan", // 探索方針の更新
  FINALIZE = "finalize", // 収束宣言・最終文生成
}
```

### 効用関数

```
Utility(a | state) = w1·Δ説得力 + w2·新規性 - w3·冗長性 + w4·不確実性低減 - w5·コスト
```

## ブラックボード（状態管理）

```typescript
interface BlackboardState {
  claims: Claim[]; // 主張リスト
  attacks: Attack[]; // 攻撃（反論）リスト
  questions: Question[]; // 未解決の質問
  plan: Plan; // 現在の探索方針
  writepad: Writepad; // 執筆パッド
  meta: MetaInfo; // メタ情報
}

interface Claim {
  id: string;
  text: string;
  support: string[];
  confidence: number; // 信念度 [0.0, 1.0]
  createdAt: number;
  lastUpdated: number;
}

interface Attack {
  id: string;
  fromClaimId: string;
  toClaimId: string;
  type: "logic" | "evidence" | "relevance";
  severity: "critical" | "major" | "minor";
  description: string;
  resolved: boolean;
}

interface StanceAnalysis {
  proCount: number; // 賛成の主張数
  conCount: number; // 反対の主張数
  diversityScore: number; // 多様性スコア [0.0, 1.0]
  needsOpposition: boolean;
  analysis: string;
}
```


## 実装ファイル構成

```
src/implementations/implementation-3/src/mastra/
├── types/blackboard.ts           # データ構造定義
├── utils/blackboard.ts           # 立場分析・ユーティリティ
├── prompts/index.ts              # プロンプト生成
├── agents/
│   ├── deliberative-agent.ts    # 意思決定
│   ├── executor-agent.ts        # 実行
│   └── judge-agent.ts           # 評価
└── workflows/
    ├── argumentation-workflow.ts # メインワークフロー
    └── steps/                    # 各ステップ実装
        ├── initialize-step.ts
        ├── deliberation-loop-step.ts
        └── finalize-step.ts
```
