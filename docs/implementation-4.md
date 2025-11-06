# Implementation 4: ペルソナ多様性 × 逐次討論（Multi-Persona Self-Deliberative Agent）

## 目的と原則

- **目的**: ペルソナの多様性と自律的逐次討論を組み合わせ、単一LLMの限界を克服
- **対象**: 複数ペルソナ × 単一またはマルチLLM
- **期待効果**:
  1. **自己一貫性バイアスの緩和**: 単一LLMが持つ固定的な思考パターンを複数視点で補完
  2. **多角的論証構造の形成**: ペルソナ間の相互参照により、より説得力のある議論を構築
  3. **逐次的思考展開の促進**: 長文入力依存を減らし、段階的な思考プロセスを実現
  4. **議論の深化**: 異なる専門性・価値観を持つペルソナが協働して論証を洗練

## Implementation-3との主な差分

| 要素                 | Implementation-3    | Implementation-4                     |
| -------------------- | ------------------- | ------------------------------------ |
| **エージェント構成** | 単一LLM（汎用）     | 複数ペルソナLLM                      |
| **意思決定**         | 統一的な効用関数    | ペルソナ特性を反映した多様な判断     |
| **バイアス対策**     | なし                | ペルソナ間の相互チェック機構         |
| **専門性**           | 汎用的な知識        | 各ペルソナの専門領域を活用           |
| **議論の多様性**     | 賛成/反対の視点のみ | 専門性・価値観・思考スタイルの多様性 |
| **収束判定**         | 単一の評価基準      | 複数視点からの合意形成               |

## アーキテクチャ

```
┌───────────────────────────────────────────────────────────┐
│           ArgumentationWorkflow (Enhanced)                │
│  Initialize → PersonaCreation → Loop(Discussion) → Finalize│
│                    [Multi-Persona Blackboard]              │
└───────────────────────────────────────────────────────────┘
         ↓                  ↓                  ↓
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │Persona   │      │ Multi-   │      │  Judge   │
   │Creator   │      │ Executor │      │  Agent   │
   │  Agent   │      │  Agent   │      │  (Panel) │
   └──────────┘      └──────────┘      └──────────┘
                           ↓
        ┌────────────────────────────────────┐
        │  Persona Pool (3-5 Personas)       │
        │  - Expert, Critic, Synthesizer...  │
        └────────────────────────────────────┘
```

### エージェント構成

- **PersonaCreatorAgent**: 議題に応じた最適なペルソナセットを生成・選択
- **MultiExecutorAgent**: 各ペルソナの特性を活かして対話行為を実行
- **JudgePanelAgent**: 複数視点から議論の質と収束状態を評価

## ペルソナ設計

### ペルソナの役割タイプ

```typescript
enum PersonaRole {
  EXPERT = "expert", // 専門家（深い知識・分析）
  CRITIC = "critic", // 批評者（反論・問題発見）
  SYNTHESIZER = "synthesizer", // 統合者（論点整理・調停）
  ADVOCATE = "advocate", // 主張者（強い立場・説得）
  MODERATOR = "moderator", // 進行役（バランス・方向性）
}
```

### ペルソナ構造

```typescript
interface Persona {
  id: string;
  name: string;
  role: PersonaRole;
  expertise: string[]; // 専門領域
  values: string[]; // 価値観・優先事項
  thinkingStyle: string; // 思考スタイル
  communicationStyle: string; // コミュニケーションスタイル
  biasAwareness: string[]; // 認識している自身のバイアス
}
```

### ペルソナ生成戦略

1. **議題分析**: トピックから必要な専門性と視点を抽出
2. **多様性最大化**: 専門性・価値観・思考スタイルの分散を確保
3. **役割バランス**: EXPERT, CRITIC, SYNTHESIZER を基本セットとして確保
4. **動的調整**: 議論の進行に応じてペルソナの追加・交代を検討

## 対話行為（Implementation-3から拡張）

```typescript
enum DialogueAct {
  // 基本行為（Implementation-3から継承）
  PROPOSE = "propose",
  CRITIQUE = "critique",
  QUESTION = "question",
  FACT_CHECK = "fact_check",
  SYNTHESIZE = "synthesize",
  PLAN = "plan",
  FINALIZE = "finalize",

  // ペルソナ間相互作用（新規）
  CROSS_REFERENCE = "cross_reference", // 他ペルソナの主張を参照
  CHALLENGE = "challenge", // 他ペルソナへの挑戦
  SUPPORT = "support", // 他ペルソナへの支援
  REFRAME = "reframe", // 視点の転換提案
}
```

### ペルソナ固有の対話行為選択

各ペルソナは、その特性に応じて対話行為の選択傾向が異なる：

- **EXPERT**: PROPOSE, FACT_CHECK を優先
- **CRITIC**: CRITIQUE, CHALLENGE を優先
- **SYNTHESIZER**: SYNTHESIZE, CROSS_REFERENCE を優先
- **ADVOCATE**: PROPOSE, SUPPORT を優先
- **MODERATOR**: PLAN, REFRAME を優先

## ブラックボード（Multi-Persona対応）

```typescript
interface MultiPersonaBlackboard extends BlackboardState {
  personas: Persona[]; // アクティブなペルソナリスト
  personaContributions: {
    // ペルソナごとの貢献度
    [personaId: string]: {
      claimCount: number;
      acceptedClaims: number;
      challengeCount: number;
      supportCount: number;
    };
  };
  crossReferences: CrossReference[]; // ペルソナ間の相互参照
  consensusLevel: number; // 合意レベル [0.0, 1.0]
  diversityMetrics: DiversityMetrics; // 多様性指標
}

interface CrossReference {
  id: string;
  fromPersonaId: string;
  toPersonaId: string;
  type: "support" | "challenge" | "clarification";
  claimId: string;
  description: string;
  timestamp: number;
}

interface DiversityMetrics {
  expertiseSpread: number; // 専門性の分散度
  valueAlignment: number; // 価値観の一致度（低いほど多様）
  perspectiveCoverage: number; // 視点のカバレッジ
}
```

## 効用関数（ペルソナ考慮）

```
Utility(a, p | state) =
  w1·Δ説得力(p視点)
  + w2·新規性(p専門性)
  - w3·冗長性
  + w4·ペルソナ間補完性
  - w5·コスト
  + w6·合意形成貢献度

where:
  p = 現在のペルソナ
  w4 = 他ペルソナとの視点の補完性
  w6 = 全体の合意形成への貢献
```

## 実装ファイル構成

```
src/implementations/implementation-4/src/mastra/
├── types/
│   ├── blackboard.ts           # Multi-Persona対応データ構造
│   └── persona.ts              # ペルソナ関連型定義
├── utils/
│   ├── blackboard.ts           # 拡張ユーティリティ
│   ├── persona-utils.ts        # ペルソナ生成・選択
│   └── consensus-utils.ts      # 合意形成・多様性分析
├── prompts/
│   ├── index.ts                # 基本プロンプト
│   └── persona-prompts.ts      # ペルソナ固有プロンプト
├── agents/
│   ├── persona-creator-agent.ts    # ペルソナ生成
│   ├── deliberative-agent.ts       # 意思決定（ペルソナ考慮）
│   ├── multi-executor-agent.ts     # 実行（ペルソナ切替）
│   └── judge-panel-agent.ts        # 評価（複数視点）
└── workflows/
    ├── multi-persona-argumentation-workflow.ts
    └── steps/
        ├── initialize-step.ts
        ├── persona-creation-step.ts    # 新規
        ├── deliberation-loop-step.ts   # 拡張
        └── finalize-step.ts
```

## 実装の重要ポイント

### 1. ペルソナ切り替え機構

```typescript
// 各ターンでアクティブなペルソナを決定
const activePersona = selectActivePersona(personas, blackboard, previousActs);

// ペルソナのコンテキストでExecutorAgentを実行
const result = await executorAgent.generate(buildPersonaContext(activePersona, blackboard), selectedAct);
```

### 2. 相互参照の追跡

```typescript
// 他ペルソナの主張を参照する際の記録
function recordCrossReference(fromPersona: Persona, toPersona: Persona, claim: Claim, type: "support" | "challenge") {
  blackboard.crossReferences.push({
    fromPersonaId: fromPersona.id,
    toPersonaId: toPersona.id,
    claimId: claim.id,
    type,
    timestamp: Date.now(),
  });
}
```

### 3. 合意形成の判定

```typescript
// 複数ペルソナ間の合意レベルを計算
function calculateConsensusLevel(blackboard: MultiPersonaBlackboard): number {
  const supportRate = calculateSupportRate(blackboard.crossReferences);
  const conflictRate = calculateConflictRate(blackboard.attacks);
  const convergence = calculateConvergence(blackboard.claims);

  return supportRate * 0.4 + (1 - conflictRate) * 0.3 + convergence * 0.3;
}
```

### 4. バイアス緩和メカニズム

```typescript
// ペルソナの自己バイアス認識を活用
function checkForBias(claim: Claim, persona: Persona, otherPersonas: Persona[]): BiasCheckResult {
  // 自身が認識しているバイアスとの照合
  const selfCheck = matchBiasPatterns(claim, persona.biasAwareness);

  // 他ペルソナからの視点チェック
  const crossChecks = otherPersonas.map(p => checkFromPerspective(claim, p));

  return aggregateBiasChecks(selfCheck, crossChecks);
}
```
