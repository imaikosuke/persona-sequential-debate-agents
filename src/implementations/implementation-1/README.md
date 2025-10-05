# Implementation 1: 単一LLM × 一括生成（One-shot）

## 概要

最もシンプルな実装。単一のLLMに一度だけプロンプトを送信し、論証文を生成します。

## 特徴

- 単一モデルのみ使用
- 一括生成（一度のプロンプト送信で完結）
- 外部知識・ツール不使用
- Few-shot例示なし
- 思考過程の開示なし
- パラメータ固定（temperature: 0.0, top_p: 1.0, max_tokens: 2048）

## 使い方

### 1. 開発サーバーの起動

```bash
make dev-1
```

### 2. Mastra Playgroundでエージェントを実行

ブラウザで `http://localhost:4111` を開き、Essay Agent を選択します。

### 3. テーマを入力

例：

```
テーマ：国政選挙への電子投票・インターネット投票の導入について
```

エージェントが論証文を一度の生成で出力します。

## ディレクトリ構造

```
src/
└── mastra/
    ├── agents/
    │   └── essay-agent.ts  # 論証文生成エージェント
    └── index.ts            # Mastra設定
```
