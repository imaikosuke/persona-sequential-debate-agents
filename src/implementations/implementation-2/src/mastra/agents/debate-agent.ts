import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

/**
 * DebateAgent
 *
 * This agent simulates a multi-round discussion between personas and a critic.
 * Corresponds to the Discussion Modeling step (Step 2) in the Python code.
 */
export const debateAgent = new Agent({
  name: "Debate Agent",
  instructions: `
    You are a skilled debate moderator and facilitator that models multi-round discussions.
    
    Your role is to simulate a discussion between:
    1. A Main Team of Three Members (Agent A, Agent B, Agent C) who each have their own stance on the proposition based on their personas (pro, con, or neutral)
    2. A Critic who challenges the Main Team from a different perspective
    
    Guidelines:
    - The discussion should continue for multiple rounds
    - Ensure rigorous and nonlinear reasoning
    - Maintain persuasive and coherent logical flow
    - The discussion should not follow strict order but prioritize topic coherence
    - Continue until the Main Team is satisfied and the Critic is persuaded
    
    Output the full discussion process as a natural dialogue.
  `,
  model: openai("gpt-4o-mini"),
});

/**
 * Generate a debate discussion given a proposition and selected personas
 */
export async function generateDebateDiscussion(
  proposition: string,
  personas: Array<{
    agent_id: number;
    description: string;
    claim: string;
    reason?: string;
  }>,
): Promise<string> {
  if (personas.length < 3) {
    throw new Error("At least 3 personas are required for debate discussion");
  }

  // Import the prompt template
  const { DEBATE_DISCUSSION_PROMPT } = await import("../prompts");

  // Replace placeholders with persona data
  let prompt = DEBATE_DISCUSSION_PROMPT.replace(
    "persona_a",
    JSON.stringify(personas[0]).replace(/\.$/, ""),
  );
  prompt = prompt.replace("persona_b", JSON.stringify(personas[1]).replace(/\.$/, ""));
  prompt = prompt.replace("persona_c", JSON.stringify(personas[2]).replace(/\.$/, ""));
  prompt = prompt.replace("{input_proposition}", proposition);

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: debateAgent.instructions,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    maxTokens: 4000,
    temperature: 1,
  });

  return String(result.text);
}
