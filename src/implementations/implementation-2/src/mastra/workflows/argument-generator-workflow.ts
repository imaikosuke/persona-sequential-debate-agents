import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { generateArgument } from "../agents/argument-writer-agent";
import { generateDebateDiscussion } from "../agents/debate-agent";
import { generatePersonaList, selectPersonas } from "../agents/persona-creator-agent";
import { generatePlan } from "../agents/plan-drafter-agent";
import { validatePersonaCount } from "../utils/persona-utils";

/**
 * Persona Schema
 */
const personaSchema = z.object({
  agent_id: z.number(),
  description: z.string(),
  claim: z.string(),
  reason: z.string().optional(),
});

/**
 * Step 1: Persona Creation and Selection
 *
 * Corresponds to the PersonaCreator.generate_one() method in Python
 */
const createPersonas = createStep({
  id: "create-personas",
  description: "Creates and selects debate personas for the given proposition",
  inputSchema: z.object({
    proposition: z.string().describe("The controversial proposition to debate"),
    isRandom: z
      .boolean()
      .default(false)
      .describe("Whether to randomly select personas or use intelligent selection"),
    selectedNum: z.number().default(3).describe("Number of personas to select"),
  }),
  outputSchema: z.object({
    proposition: z.string(),
    personaLists: z.array(personaSchema),
    selectedPersonaLists: z.array(personaSchema),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const { proposition, isRandom, selectedNum } = inputData;

    // Try up to 3 times to get valid personas
    let personaLists: Array<{
      agent_id: number;
      description: string;
      claim: string;
      reason?: string;
    }> = [];
    let selectedPersonaLists: Array<{
      agent_id: number;
      description: string;
      claim: string;
      reason?: string;
    }> = [];

    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`\n[Persona Creation] Attempt ${attempt + 1}/3`);

      // Step 1: Create persona pool
      personaLists = await generatePersonaList(proposition);
      console.log(`[Persona Creation] Generated ${personaLists.length} personas`);

      // Step 2: Select personas (random or intelligent)
      if (isRandom && personaLists.length >= selectedNum) {
        // Random selection
        const shuffled = [...personaLists].sort(() => 0.5 - Math.random());
        selectedPersonaLists = shuffled.slice(0, selectedNum);
      } else {
        // Intelligent selection
        selectedPersonaLists = await selectPersonas(proposition, personaLists);
      }

      console.log(`[Persona Creation] Selected ${selectedPersonaLists.length} personas`);

      // Validate we have at least 3 personas
      if (validatePersonaCount(selectedPersonaLists, 3)) {
        break;
      }

      console.log(`[Warning] Persona generation failed on attempt ${attempt + 1}, retrying...`);
    }

    if (!validatePersonaCount(selectedPersonaLists, 3)) {
      throw new Error("Failed to generate at least 3 valid personas after 3 attempts");
    }

    return {
      proposition,
      personaLists,
      selectedPersonaLists,
    };
  },
});

/**
 * Step 2: Discussion Modeling
 *
 * Simulates a multi-round debate between the selected personas and a critic
 */
const modelDiscussion = createStep({
  id: "model-discussion",
  description: "Simulates a multi-round debate discussion",
  inputSchema: z.object({
    proposition: z.string(),
    personaLists: z.array(personaSchema),
    selectedPersonaLists: z.array(personaSchema),
  }),
  outputSchema: z.object({
    proposition: z.string(),
    personaLists: z.array(personaSchema),
    selectedPersonaLists: z.array(personaSchema),
    discussion: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const { proposition, personaLists, selectedPersonaLists } = inputData;

    console.log("\n[Discussion Modeling] Starting debate simulation...");

    // Generate debate discussion
    const discussion = await generateDebateDiscussion(proposition, selectedPersonaLists);

    console.log(`[Discussion Modeling] Generated discussion (${discussion.length} chars)`);

    return {
      proposition,
      personaLists,
      selectedPersonaLists,
      discussion,
    };
  },
});

/**
 * Step 3: Plan Drafting
 *
 * Distills the discussion into a structured plan
 */
const draftPlan = createStep({
  id: "draft-plan",
  description: "Distills the debate discussion into a structured plan",
  inputSchema: z.object({
    proposition: z.string(),
    personaLists: z.array(personaSchema),
    selectedPersonaLists: z.array(personaSchema),
    discussion: z.string(),
  }),
  outputSchema: z.object({
    proposition: z.string(),
    personaLists: z.array(personaSchema),
    selectedPersonaLists: z.array(personaSchema),
    discussion: z.string(),
    plan: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const { proposition, personaLists, selectedPersonaLists, discussion } = inputData;

    console.log("\n[Plan Drafting] Extracting plan from discussion...");

    // Generate plan from discussion
    const plan = await generatePlan(proposition, discussion);

    console.log(`[Plan Drafting] Generated plan (${plan.length} chars)`);

    return {
      proposition,
      personaLists,
      selectedPersonaLists,
      discussion,
      plan,
    };
  },
});

/**
 * Step 4: Argument Generation
 *
 * Generates the final argumentative essay based on the plan
 */
const generateArgumentStep = createStep({
  id: "generate-argument",
  description: "Generates the final argumentative essay",
  inputSchema: z.object({
    proposition: z.string(),
    personaLists: z.array(personaSchema),
    selectedPersonaLists: z.array(personaSchema),
    discussion: z.string(),
    plan: z.string(),
  }),
  outputSchema: z.object({
    query: z.string(),
    personaLists: z.array(personaSchema),
    selectedPersonaLists: z.array(personaSchema),
    discussion: z.string(),
    plan: z.string(),
    argument: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const { proposition, personaLists, selectedPersonaLists, discussion, plan } = inputData;

    console.log("\n[Argument Generation] Writing final argumentative essay...");

    // Generate final argument
    const argument = await generateArgument(proposition, plan);

    console.log(`[Argument Generation] Generated argument (${argument.length} chars)`);

    const result = {
      query: proposition,
      personaLists,
      selectedPersonaLists,
      discussion,
      plan,
      argument,
    };

    // Write output to arguments folder for comparison
    try {
      const { writeFile, mkdir } = await import("node:fs/promises");
      const pathModule = await import("node:path");
      const { fileURLToPath } = await import("node:url");

      // プロジェクトルートのargumentsフォルダを探す
      // このファイルは implementation-2/src/mastra/workflows/argument-generator-workflow.ts
      const currentFile = fileURLToPath(import.meta.url);
      const currentDir = pathModule.dirname(currentFile);
      // currentDir = .../implementation-2/src/mastra/workflows
      // .. = .../implementation-2/src/mastra
      // .. = .../implementation-2/src
      // .. = .../implementation-2
      // .. = .../implementations
      // .. = .../src
      // .. = プロジェクトルート
      const projectRoot = pathModule.resolve(currentDir, "..", "..", "..", "..", "..", "..");
      const argumentsDir = pathModule.resolve(projectRoot, "arguments");
      const outArgumentsPath = pathModule.resolve(argumentsDir, "output-implementation-2.md");

      // argumentsフォルダが存在しない場合は作成
      await mkdir(argumentsDir, { recursive: true });

      // 論証文だけを保存
      const mdText = argument;
      await writeFile(outArgumentsPath, mdText, { encoding: "utf8" });

      console.log(`最終結果をargumentsフォルダに書き出しました: ${outArgumentsPath}`);
    } catch (err) {
      console.warn("argumentsフォルダへの書き出しに失敗しました:", err);
    }

    return result;
  },
});

/**
 * Argument Generator Workflow
 *
 * This workflow orchestrates the entire argument generation process:
 * 1. Persona Creation & Selection
 * 2. Discussion Modeling
 * 3. Plan Drafting
 * 4. Argument Generation
 *
 * Corresponds to the ArgumentGenerator.generate_one() method in Python
 */
const argumentGeneratorWorkflow = createWorkflow({
  id: "argumentGeneratorWorkflow",
  inputSchema: z.object({
    proposition: z.string().describe("The controversial proposition to debate"),
    isRandom: z.boolean().default(false).describe("Whether to randomly select personas"),
    selectedNum: z.number().default(3).describe("Number of personas to select"),
  }),
  outputSchema: z.object({
    query: z.string(),
    personaLists: z.array(personaSchema),
    selectedPersonaLists: z.array(personaSchema),
    discussion: z.string(),
    plan: z.string(),
    argument: z.string(),
  }),
})
  .then(createPersonas)
  .then(modelDiscussion)
  .then(draftPlan)
  .then(generateArgumentStep);

argumentGeneratorWorkflow.commit();

export { argumentGeneratorWorkflow };
