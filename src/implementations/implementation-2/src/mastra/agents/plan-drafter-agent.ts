import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { generateText } from "ai";

import { PLAN_DISTILLATION_PROMPT } from "../prompts";

/**
 * PlanDrafterAgent
 *
 * This agent distills a discussion into a structured plan.
 * Corresponds to the Plan Drafting step (Step 3) in the Python code.
 */
export const planDrafterAgent = new Agent({
  name: "Plan Drafter Agent",
  instructions: `
    You are a skilled analyst that distills multi-round discussions into structured plans.
    
    Your role is to:
    1. Analyze the discussion process between debate participants
    2. Extract the key ideas developed by the Main Team
    3. Summarize into a concise, abstract plan
    
    Plan Requirements:
    - Abstract and concise
    - Contains up to 3 main points
    - Each point can have sub-points
    - Optional acknowledgment point
    - Strictly adheres to Main Team's ideas from the discussion
    
    Output a well-structured plan that can be used for generating an argumentative essay.
  `,
  model: openai("gpt-4o-mini"),
});

/**
 * Generate a plan from a debate discussion
 */
export async function generatePlan(proposition: string, discussionText: string): Promise<string> {
  const prompt = PLAN_DISTILLATION_PROMPT.replace("{input_proposition}", proposition).replace(
    "{discussion_process}",
    discussionText,
  );

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: planDrafterAgent.instructions,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    maxTokens: 4000,
    temperature: 1,
  });

  // Clean up newlines

  return String(result.text).replace(/\n\n/g, "\n");
}
