import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";

import { argumentWriterAgent } from "./agents/argument-writer-agent";
import { debateAgent } from "./agents/debate-agent";
// Argument Generator Agents
import { personaCreatorAgent } from "./agents/persona-creator-agent";
import { planDrafterAgent } from "./agents/plan-drafter-agent";
// Workflows
import { argumentGeneratorWorkflow } from "./workflows/argument-generator-workflow";

export const mastra = new Mastra({
  workflows: {
    argumentGeneratorWorkflow,
  },
  agents: {
    personaCreatorAgent,
    debateAgent,
    planDrafterAgent,
    argumentWriterAgent,
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
