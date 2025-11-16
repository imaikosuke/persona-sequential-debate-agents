.PHONY: help dev build start clean install lint lint-fix format format-fix typecheck check run-1 run-2 run-3 run-4

# デフォルトターゲット
help:
	@echo "Persona Sequential Debate Agents - 利用可能なコマンド:"
	@echo ""
	@echo "開発・実行:"
	@echo "  make dev-1     - Implementation 1を開発モードで実行"
	@echo "  make dev-2     - Implementation 2を開発モードで実行"
	@echo "  make dev-3     - Implementation 3を開発モードで実行"
	@echo "  make dev-4     - Implementation 4を開発モードで実行"
	@echo ""
	@echo "ワークフロー実行（ルートから実行可能）:"
	@echo "  make run-1 [TOPIC=\"トピック\"]  - Implementation 1を実行して論証文を生成（デフォルト: 小学生はスマートフォンを持つべきか）"
	@echo "  make run-2 [TOPIC=\"トピック\"]  - Implementation 2を実行して論証文を生成（デフォルト: 小学生はスマートフォンを持つべきか）"
	@echo "  make run-3 [TOPIC=\"トピック\"]  - Implementation 3を実行して論証文を生成（デフォルト: 小学生はスマートフォンを持つべきか）"
	@echo "  make run-4 [TOPIC=\"トピック\"]  - Implementation 4を実行して論証文を生成（デフォルト: 小学生はスマートフォンを持つべきか）"
	@echo ""
	@echo "ビルド:"
	@echo "  make build-1   - Implementation 1をビルド"
	@echo "  make build-2   - Implementation 2をビルド"
	@echo "  make build-3   - Implementation 3をビルド"
	@echo "  make build-4   - Implementation 4をビルド"
	@echo ""
	@echo "本番実行:"
	@echo "  make start-1   - Implementation 1を本番モードで実行"
	@echo "  make start-2   - Implementation 2を本番モードで実行"
	@echo "  make start-3   - Implementation 3を本番モードで実行"
	@echo "  make start-4   - Implementation 4を本番モードで実行"
	@echo ""
	@echo "ユーティリティ:"
	@echo "  make install   - 依存関係をインストール"
	@echo "  make clean      - ビルド成果物をクリーンアップ"
	@echo "  make lint      - ESLintでコードをチェック"
	@echo "  make lint-fix   - ESLintで自動修正"
	@echo "  make format     - Prettierでコードフォーマットをチェック"
	@echo "  make format-fix - Prettierでコードフォーマットを自動修正"
	@echo "  make typecheck  - TypeScriptの型チェック"
	@echo "  make check      - コードチェック"
# 依存関係のインストール
install:
	@echo "依存関係をインストール中..."
	pnpm install

# クリーンアップ
clean:
	@echo "ビルド成果物をクリーンアップ中..."
	find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name ".mastra" -type d -exec rm -rf {} + 2>/dev/null || true

# Implementation 1
dev-1:
	@echo "Implementation 1を開発モードで実行中..."
	pnpm --filter implementation-1 dev

build-1:
	@echo "Implementation 1をビルド中..."
	pnpm --filter implementation-1 build

start-1:
	@echo "Implementation 1を本番モードで実行中..."
	pnpm --filter implementation-1 start

# Implementation 2
dev-2:
	@echo "Implementation 2を開発モードで実行中..."
	pnpm --filter implementation-2 dev

build-2:
	@echo "Implementation 2をビルド中..."
	pnpm --filter implementation-2 build

start-2:
	@echo "Implementation 2を本番モードで実行中..."
	pnpm --filter implementation-2 start

# Implementation 3
dev-3:
	@echo "Implementation 3を開発モードで実行中..."
	pnpm --filter implementation-3 dev

build-3:
	@echo "Implementation 3をビルド中..."
	pnpm --filter implementation-3 build

start-3:
	@echo "Implementation 3を本番モードで実行中..."
	pnpm --filter implementation-3 start

# Implementation 4
dev-4:
	@echo "Implementation 4を開発モードで実行中..."
	pnpm --filter implementation-4 dev

build-4:
	@echo "Implementation 4をビルド中..."
	pnpm --filter implementation-4 build

start-4:
	@echo "Implementation 4を本番モードで実行中..."
	pnpm --filter implementation-4 start

lint:
	pnpm lint

lint-fix:
	pnpm lint:fix

format:
	pnpm format

format-fix:
	pnpm format:fix

typecheck:
	pnpm typecheck

check:
	pnpm lint
	pnpm format
	pnpm typecheck

# デフォルトトピック
DEFAULT_TOPIC := 小学生はスマートフォンを持つべきか

# Implementation 1: ワークフロー実行
run-1:
	@if [ -z "$(TOPIC)" ]; then \
		echo "TOPICが指定されていないため、デフォルト値を使用します: $(DEFAULT_TOPIC)"; \
		pnpm --filter implementation-1 save-output "$(DEFAULT_TOPIC)"; \
	else \
		echo "Implementation 1を実行中..."; \
		pnpm --filter implementation-1 save-output "$(TOPIC)"; \
	fi

# Implementation 2: ワークフロー実行
run-2:
	@if [ -z "$(TOPIC)" ]; then \
		echo "TOPICが指定されていないため、デフォルト値を使用します: $(DEFAULT_TOPIC)"; \
		pnpm --filter implementation-2 run-workflow "$(DEFAULT_TOPIC)"; \
	else \
		echo "Implementation 2を実行中..."; \
		pnpm --filter implementation-2 run-workflow "$(TOPIC)"; \
	fi

# Implementation 3: ワークフロー実行
run-3:
	@if [ -z "$(TOPIC)" ]; then \
		echo "TOPICが指定されていないため、デフォルト値を使用します: $(DEFAULT_TOPIC)"; \
		pnpm --filter implementation-3 run-workflow "$(DEFAULT_TOPIC)"; \
	else \
		echo "Implementation 3を実行中..."; \
		pnpm --filter implementation-3 run-workflow "$(TOPIC)"; \
	fi

# Implementation 4: ワークフロー実行
run-4:
	@if [ -z "$(TOPIC)" ]; then \
		echo "TOPICが指定されていないため、デフォルト値を使用します: $(DEFAULT_TOPIC)"; \
		pnpm --filter implementation-4 run-workflow "$(DEFAULT_TOPIC)"; \
	else \
		echo "Implementation 4を実行中..."; \
		pnpm --filter implementation-4 run-workflow "$(TOPIC)"; \
	fi