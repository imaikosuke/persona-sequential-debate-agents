# Implementation 2: Persona Sequential Debate Agents

このプロジェクトは、論争的なトピックに対する反論を生成するために、複数のペルソナ（議論参加者）による議論をモデル化するシステムです。

## 概要

このシステムは4つのステップで構成されています：

1. **Persona Creation & Selection（ペルソナ作成と選択）**
   - 与えられた命題に対して、6-10個の多様なペルソナを生成
   - その中から最も適した3つのペルソナを選択（ランダムまたはインテリジェント選択）

2. **Discussion Modeling（議論モデリング）**
   - 選択された3つのペルソナ（Main Team）と批評者（Critic）による多段階の議論をシミュレート
   - 命題に反対する立場から議論を展開

3. **Plan Drafting（計画立案）**
   - 議論から重要なポイントを抽出
   - 反論のための構造化された計画を作成

4. **Argument Generation（議論文章生成）**
   - 計画に基づいて、説得力のある反論記事を生成

## アーキテクチャ

### エージェント

- **PersonaCreatorAgent**: ペルソナの作成と選択を担当
- **DebateAgent**: 多段階の議論をシミュレート
- **PlanDrafterAgent**: 議論から計画を抽出
- **ArgumentWriterAgent**: 最終的な反論記事を生成

### ワークフロー

- **ArgumentGeneratorWorkflow**: 4つのステップを統合したメインワークフロー
  - `create-personas`: ペルソナ作成・選択ステップ
  - `model-discussion`: 議論モデリングステップ
  - `draft-plan`: 計画立案ステップ
  - `generate-argument`: 議論生成ステップ

### ユーティリティ

- **persona-utils.ts**: ペルソナのJSON抽出とバリデーション機能

## 使用方法

### 基本的な使用方法

```typescript
import { mastra } from "./src/mastra";

// ワークフローを実行
const result = await mastra.workflows.argumentGeneratorWorkflow.execute({
  proposition: "We should make all museums free of charge.",
  isRandom: false, // インテリジェント選択
  selectedNum: 3,
});

console.log("Query:", result.query);
console.log("\nSelected Personas:", result.selectedPersonaLists);
console.log("\nDiscussion:", result.discussion);
console.log("\nPlan:", result.plan);
console.log("\nArgument:", result.argument);
```

### エージェントの直接使用

個別のエージェントを直接使用することもできます：

```typescript
import { generatePersonaList, selectPersonas } from "./src/mastra/agents/persona-creator-agent";
import { generateDebateDiscussion } from "./src/mastra/agents/debate-agent";
import { generatePlan } from "./src/mastra/agents/plan-drafter-agent";
import { generateArgument } from "./src/mastra/agents/argument-writer-agent";

// Step 1: ペルソナ生成
const personas = await generatePersonaList("We should make all museums free of charge.");
const selected = await selectPersonas("We should make all museums free of charge.", personas);

// Step 2: 議論生成
const discussion = await generateDebateDiscussion("We should make all museums free of charge.", selected);

// Step 3: 計画抽出
const plan = await generatePlan("We should make all museums free of charge.", discussion);

// Step 4: 反論生成
const argument = await generateArgument("We should make all museums free of charge.", plan);
```

## 出力形式

ワークフローの出力は以下の構造を持ちます：

```typescript
{
  query: string,                    // 入力された命題
  personaLists: Persona[],          // 生成された全ペルソナ
  selectedPersonaLists: Persona[],  // 選択された3つのペルソナ
  discussion: string,               // 議論の内容
  plan: string,                     // 抽出された計画
  argument: string,                 // 最終的な反論記事
}
```

### Persona型

```typescript
{
  agent_id: number,
  description: string,  // ペルソナの説明
  claim: string,        // ペルソナの主張
  reason?: string,      // 選択理由（選択時のみ）
}
```

## プロンプト

プロンプトは `prompts.ts` で定義されています：

- `PERSONA_CREATION_PROMPT`: ペルソナ作成用
- `PERSONA_SELECTION_PROMPT`: ペルソナ選択用
- `DEBATE_DISCUSSION_PROMPT`: 議論シミュレーション用
- `PLAN_DISTILLATION_PROMPT`: 計画抽出用
- `SURFACE_GENERATION_STEP2_PROMPT`: 反論生成用
