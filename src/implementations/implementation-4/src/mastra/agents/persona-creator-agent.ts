import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { PERSONA_CREATION_PROMPT, PERSONA_SELECTION_PROMPT } from "../prompts";
import type { Persona } from "../types";
import {
  buildDefaultPersonas,
  convertPersonaCandidateToPersona,
  extractPersonas,
  type PersonaCandidate,
  validatePersonaCount,
} from "../utils/persona-utils";

/**
 * PersonaCreatorAgent
 *
 * This agent is responsible for:
 * 1. Creating a pool of debate personas given a proposition
 * 2. Selecting the most suitable personas for the debate
 *
 * Based on implementation-2 (先行研究に基づく実装)
 */
export const personaCreatorAgent = new Agent({
  name: "Persona Creator Agent",
  instructions: `
    You are a persona creation specialist that helps build diverse debate teams.
    
    Your responsibilities:
    1. Create a pool of 6-10 debate agents with unique perspectives on a controversial topic
    2. Select the 3 most suitable agents that can work together effectively
    3. Ensure diversity and fairness in agent selection
    
    When creating personas:
    - Each persona should have a unique viewpoint
    - Include a clear description and claim
    - Ensure perspectives are relevant to the proposition
    - Represent diverse communities and viewpoints
    
    When selecting personas:
    - Consider how well the team can work together
    - Ensure balanced and fair discussion
    - Provide clear reasoning for each selection
    
    Always output valid JSON format as specified in the prompts.
  `,
  model: openai("gpt-4o-mini", {
    structuredOutputs: false, // We handle JSON parsing manually
  }),
});

/**
 * Generate persona list for a given proposition
 * Based on implementation-2's generatePersonaList function
 */
export async function generatePersonaList(proposition: string): Promise<PersonaCandidate[]> {
  const prompt = PERSONA_CREATION_PROMPT.replace("##input_proposition", proposition);

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: personaCreatorAgent.instructions,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    maxTokens: 4000,
    temperature: 1,
  });

  return extractPersonas(String(result.text));
}

/**
 * Select the best 3 personas from a candidate list
 * Based on implementation-2's selectPersonas function
 */
export async function selectPersonas(
  proposition: string,
  candidateList: PersonaCandidate[],
): Promise<PersonaCandidate[]> {
  const candidateText = candidateList.map(elem => JSON.stringify(elem)).join("\n");

  let prompt = PERSONA_SELECTION_PROMPT.replace("##input_proposition", proposition);
  prompt = prompt.replace("###candidate_list", candidateText);

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: personaCreatorAgent.instructions,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    maxTokens: 4000,
    temperature: 1,
  });

  return extractPersonas(String(result.text));
}

/**
 * Create personas using the 2-stage process (generate → select)
 * Based on implementation-2's approach
 */
export async function createPersonas(topic: string): Promise<Persona[]> {
  // Fallback to default personas
  const fallback = buildDefaultPersonas(topic);

  try {
    // Try up to 3 times to get valid personas
    let personaLists: PersonaCandidate[] = [];
    let selectedPersonaLists: PersonaCandidate[] = [];

    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`\n[Persona Creation] Attempt ${attempt + 1}/3`);

      // Step 1: Create persona pool
      personaLists = await generatePersonaList(topic);
      console.log(`[Persona Creation] Generated ${personaLists.length} personas`);

      // Step 2: Select personas (intelligent selection)
      selectedPersonaLists = await selectPersonas(topic, personaLists);

      console.log(`[Persona Creation] Selected ${selectedPersonaLists.length} personas`);

      // Validate we have at least 3 personas
      if (validatePersonaCount(selectedPersonaLists, 3)) {
        break;
      }

      console.log(`[Warning] Persona generation failed on attempt ${attempt + 1}, retrying...`);
    }

    if (!validatePersonaCount(selectedPersonaLists, 3)) {
      console.log("[Warning] Failed to generate at least 3 valid personas, using fallback");
      return fallback;
    }

    // Convert PersonaCandidate[] to Persona[]
    const personas = selectedPersonaLists.map(candidate =>
      convertPersonaCandidateToPersona(candidate, topic),
    );

    return personas;
  } catch (error) {
    console.error("[Error] Persona creation failed:", error);
    return fallback;
  }
}
