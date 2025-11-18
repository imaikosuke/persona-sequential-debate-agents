import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { SURFACE_GENERATION_STEP2_PROMPT } from "../prompts";

/**
 * ArgumentWriterAgent
 *
 * This agent generates the final argumentative essay based on a plan.
 * Corresponds to the Argument Generation step (Step 4) in the Python code.
 */
export const argumentWriterAgent = new Agent({
  name: "Argument Writer Agent",
  instructions: `
    You are an expert writer that creates persuasive argumentative essays.
    
    Your role is to:
    1. Take a proposition and a structured plan
    2. Write a coherent, persuasive, well-structured argumentative essay
    3. Ensure the article flows naturally without section titles
    
    Writing Guidelines:
    - Coherent and persuasive
    - Well-structured following the plan
    - Natural flow without explicit section headers
    - Convincing arguments with logical reasoning
    - Professional and articulate tone
    
    Output only the argumentative essay, ready to be presented.
  `,
  model: openai("gpt-4o-mini"),
});

/**
 * Generate the final argumentative essay
 */
export async function generateArgument(proposition: string, plan: string): Promise<string> {
  const prompt = SURFACE_GENERATION_STEP2_PROMPT.replace("{proposition}", proposition).replace(
    "{plan}",
    plan,
  );

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: argumentWriterAgent.instructions,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    maxTokens: 2000,
    temperature: 1,
  });

  return String(result.text);
}
