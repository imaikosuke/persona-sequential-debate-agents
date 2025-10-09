# Persona Sequential Debate Agents

Initializing a project with Mastra made with TypeScript and progressing with development.

## Makefile Commands

| カテゴリ           | コマンド          | 説明                                        |
| ------------------ | ----------------- | ------------------------------------------- |
| **開発・実行**     | `make dev-1`      | Implementation 1を開発モードで実行          |
|                    | `make dev-2`      | Implementation 2を開発モードで実行          |
|                    | `make dev-3`      | Implementation 3を開発モードで実行          |
|                    | `make dev-4`      | Implementation 4を開発モードで実行          |
| **ビルド**         | `make build-1`    | Implementation 1をビルド                    |
|                    | `make build-2`    | Implementation 2をビルド                    |
|                    | `make build-3`    | Implementation 3をビルド                    |
|                    | `make build-4`    | Implementation 4をビルド                    |
| **本番実行**       | `make start-1`    | Implementation 1を本番モードで実行          |
|                    | `make start-2`    | Implementation 2を本番モードで実行          |
|                    | `make start-3`    | Implementation 3を本番モードで実行          |
|                    | `make start-4`    | Implementation 4を本番モードで実行          |
| **ユーティリティ** | `make install`    | 依存関係をインストール                      |
|                    | `make clean`      | ビルド成果物をクリーンアップ                |
|                    | `make lint`       | ESLintでコードをチェック                    |
|                    | `make lint-fix`   | ESLintで自動修正                            |
|                    | `make format`     | Prettierでコードフォーマットをチェック      |
|                    | `make format-fix` | Prettierでコードフォーマットを自動修正      |
|                    | `make typecheck`  | TypeScriptの型チェック                      |
|                    | `make check`      | コードチェック（lint + format + typecheck） |
| **ヘルプ**         | `make help`       | 利用可能なコマンド一覧を表示                |
