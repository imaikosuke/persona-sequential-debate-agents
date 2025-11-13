import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { deliberationLoopStep, finalizeStep, initializeStep, personaCreationStep } from "./steps";

export const multiPersonaArgumentationWorkflow = createWorkflow({
  id: "multiPersonaArgumentationWorkflow",
  inputSchema: z.object({
    topic: z.string(),
    tokenBudget: z.number().optional().default(10000),
    maxSteps: z.number().optional().default(10),
  }),
  outputSchema: z.object({
    topic: z.string(),
    argument: z.string().optional(),
    claims: z.array(z.any()),
    attacks: z.array(z.any()),
    stepCount: z.number(),
    convergenceHistory: z.array(z.number()),
    status: z.string(),
  }),
})
  .then(initializeStep)
  .then(personaCreationStep)
  .then(deliberationLoopStep)
  .then(finalizeStep)
  .commit();
