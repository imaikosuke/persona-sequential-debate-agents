import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { PERSONA_CREATION_PROMPT, PERSONA_SELECTION_PROMPT } from "../prompts";
import { extractPersonas } from "../utils/persona-utils";

/**
 * PersonaCreatorAgent
 *
 * This agent is responsible for:
 * 1. Creating a pool of debate personas given a proposition
 * 2. Selecting the most suitable personas for the debate
 *
 * Corresponds to the PersonaCreator class in the Python code
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
 */
export async function generatePersonaList(proposition: string) {
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
 */
export async function selectPersonas(
  proposition: string,
  candidateList: Array<{
    agent_id: number;
    description: string;
    claim: string;
  }>,
) {
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
