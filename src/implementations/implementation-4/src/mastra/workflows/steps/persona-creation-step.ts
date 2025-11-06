import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { createPersonas } from "../../agents/persona-creator-agent";
import type { MultiPersonaBlackboard, Persona } from "../../types";
import { initializeBlackboard } from "../../utils/blackboard";
import { buildDefaultPersonas } from "../../utils/persona-utils";

export const personaCreationStep = createStep({
  id: "persona-creation",
  description: "ペルソナ生成とブラックボード作成",
  inputSchema: z.object({
    topic: z.string(),
    tokenBudget: z.number(),
    maxSteps: z.number(),
  }),
  outputSchema: z.object({
    blackboard: z.custom<MultiPersonaBlackboard>(),
    maxSteps: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { topic, tokenBudget, maxSteps } = inputData;
    let personas: Persona[] = buildDefaultPersonas(topic);
    try {
      const generated = await createPersonas(topic);
      if (generated?.length) personas = generated;
    } catch {
      // fallback already set
    }

    const blackboard = initializeBlackboard(topic, personas, tokenBudget);
    return { blackboard, maxSteps };
  },
});
