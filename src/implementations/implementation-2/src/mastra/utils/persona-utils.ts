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
  if (text.startsWith("```")) {
    text = text.replace("```", "");
  }
  if (text.endsWith("```")) {
    text = text.replace(/```$/, "");
  }

  // Remove any leading/trailing array or object brackets that might wrap the output
  text = text.replace(/^\s*\{\s*\[/, "[").replace(/\]\s*\}\s*$/, "]");
  text = text.replace(/^\s*\[/, "").replace(/\]\s*$/, "");

  // Try line-by-line parsing first (preferred method for JSON Lines format)
  const lineByLineResult = extractPersonasLineByLine(text);
  if (lineByLineResult.length > 0) {
    return lineByLineResult;
  }

  // Fallback: Replace newlines and multiple spaces with single space
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
      line = line.trim();

      // Skip empty lines
      if (!line) continue;

      // Skip lines that are just brackets
      if (line === "{" || line === "}" || line === "[" || line === "]") continue;

      // Remove trailing comma or period
      line = line.replace(/[,.]$/, "");

      // Remove leading/trailing array brackets if present
      line = line.replace(/^\[/, "").replace(/\]$/, "");

      const parsed = JSON.parse(line) as Persona;

      // Validate required fields
      if (typeof parsed.agent_id !== "number" || !parsed.description || !parsed.claim) {
        console.debug(`Invalid persona object: ${line}`);
        continue;
      }

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
