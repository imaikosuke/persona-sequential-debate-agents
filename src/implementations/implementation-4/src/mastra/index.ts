import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";

import { personaDeliberativeAgent } from "./agents/deliberative-agent";
import { multiExecutorAgent } from "./agents/multi-executor-agent";
import { personaCreatorAgent } from "./agents/persona-creator-agent";
import { multiPersonaArgumentationWorkflow } from "./workflows/multi-persona-argumentation-workflow";

export const mastra = new Mastra({
  workflows: { multiPersonaArgumentationWorkflow },
  agents: {
    personaCreatorAgent,
    personaDeliberativeAgent,
    multiExecutorAgent,
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
