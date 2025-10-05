import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";

import { essayAgent } from "./agents/essay-agent";

/**
 * Implementation 1: 単一LLM × 一括生成（One-shot）
 *
 * 最もシンプルな実装。ツールやワークフローを使わず、
 * 単一のエージェントが一度のプロンプトで論証文を生成します。
 */
export const mastra = new Mastra({
  agents: { essayAgent },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Implementation-1",
    level: "info",
  }),
});
