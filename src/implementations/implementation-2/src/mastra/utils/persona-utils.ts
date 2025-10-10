/**
 * Utility functions for persona extraction and manipulation
 * Corresponds to extract_personas_new and extract_personas methods in Python
 */

interface Persona {
  agent_id: number;
  description: string;
  claim: string;
  reason?: string;
}

/**
 * Extract personas from LLM output string
 * Handles various JSON formatting issues
 */
export function extractPersonas(output: string): Persona[] {
  let text = output.trim();

  // Remove markdown code blocks if present
  if (text.startsWith("```json")) {
    text = text.replace("```json", "");
  }
  if (text.endsWith("```")) {
    text = text.replace(/```$/, "");
  }

  // Replace newlines and multiple spaces with single space
  text = text.replace(/\s+/g, " ").trim();

  // Split by '} {' pattern to separate JSON objects
  const jsonStrings = text.split("} {");

  const personaList: Persona[] = [];

  for (let s of jsonStrings) {
    try {
      s = s.trim();

      // Add missing braces
      if (!s.startsWith("{") && !s.endsWith("}")) {
        s = "{" + s + "}";
      } else if (!s.endsWith("}")) {
        s = s + "}";
      } else if (!s.startsWith("{")) {
        s = "{" + s;
      }

      const parsed = JSON.parse(s) as Persona;

      // Clean up description by removing "Agent N:" prefix
      if (parsed.description) {
        parsed.description = parsed.description.replace(/Agent \d{1,2}:?\s*/i, "").trim();
      }

      personaList.push(parsed);
    } catch (error) {
      console.debug(`Failed to parse JSON: ${s}`, error);
      // Continue to next iteration
    }
  }

  return personaList;
}

/**
 * Alternative extraction method that tries line-by-line parsing
 * Corresponds to extract_personas method in Python
 */
export function extractPersonasLineByLine(output: string): Persona[] {
  const lines = output.trim().split("\n");
  const personaList: Persona[] = [];

  for (let line of lines) {
    try {
      line = line.trim().replace(/[,.]$/, ""); // Remove trailing comma or period
      const parsed = JSON.parse(line) as Persona;

      // Clean up description
      if (parsed.description) {
        parsed.description = parsed.description.replace(/Agent \d{1,2}:?\s*/i, "").trim();
      }

      personaList.push(parsed);
    } catch {
      console.debug(`Failed to parse line: ${line}`);
      // Continue to next line
    }
  }

  return personaList;
}

/**
 * Validate that we have at least the minimum required personas
 */
export function validatePersonaCount(personas: Persona[], minCount: number = 3): boolean {
  return personas.length >= minCount;
}
