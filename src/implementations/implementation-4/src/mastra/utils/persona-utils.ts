/**
 * Implementation 4: ペルソナ生成・選択ユーティリティ
 * Based on implementation-2 (先行研究に基づく実装)
 */

import type { MultiPersonaBlackboard, Persona } from "../types";

/**
 * Implementation-2形式のペルソナ（生成・選択段階で使用）
 */
export interface PersonaCandidate {
  agent_id: number;
  description: string;
  claim: string;
  reason?: string;
}

/**
 * Extract personas from LLM output string
 * Handles various JSON formatting issues
 * Based on implementation-2's extractPersonas function
 */
export function extractPersonas(output: string): PersonaCandidate[] {
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

  const personaList: PersonaCandidate[] = [];

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

      const parsed = JSON.parse(s) as PersonaCandidate;

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
 * Based on implementation-2's extractPersonasLineByLine function
 */
export function extractPersonasLineByLine(output: string): PersonaCandidate[] {
  const lines = output.trim().split("\n");
  const personaList: PersonaCandidate[] = [];

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

      const parsed = JSON.parse(line) as PersonaCandidate;

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
export function validatePersonaCount(personas: PersonaCandidate[], minCount: number = 3): boolean {
  return personas.length >= minCount;
}

/**
 * Convert implementation-2 format (PersonaCandidate) to implementation-4 format (Persona)
 */
export function convertPersonaCandidateToPersona(
  candidate: PersonaCandidate,
  topic: string,
): Persona {
  const seed = Math.abs(
    Array.from(topic).reduce((s, c) => s + c.charCodeAt(0), 0) + candidate.agent_id,
  );
  const id = `persona-${candidate.agent_id}-${seed}`;

  // Extract name from description (first part before comma or period)
  const nameMatch = candidate.description.match(/^([^,。、]+)/);
  const name = nameMatch
    ? nameMatch[1].trim().replace(/^Agent\s+\d+[:：]?\s*/i, "")
    : `Persona ${candidate.agent_id}`;

  // Use default values (no role/expertise/value extraction)
  // Implementation-2と同様にロールは持たない
  return {
    id,
    name,
    expertise: ["general"],
    values: ["rigor"],
    thinkingStyle: "analytical",
    communicationStyle: "precise",
    biasAwareness: ["confirmation bias"],
  };
}

export function buildDefaultPersonas(topic: string) {
  // シンプルな初期セット（3-5名）
  // Implementation-2と同様にロールは持たない
  const seed = Math.abs(Array.from(topic).reduce((s, c) => s + c.charCodeAt(0), 0));
  const id = (name: string) => `${name.toLowerCase().replace(/\s+/g, "-")}-${seed}`;
  return [
    {
      id: id("Expert"),
      name: "Dr. Insight",
      expertise: ["analysis", "evidence", "methodology"],
      values: ["rigor", "accuracy"],
      thinkingStyle: "analytical",
      communicationStyle: "precise",
      biasAwareness: ["confirmation bias"],
    },
    {
      id: id("Critic"),
      name: "Ms. Skeptic",
      expertise: ["argumentation", "logic"],
      values: ["robustness", "falsifiability"],
      thinkingStyle: "critical",
      communicationStyle: "direct",
      biasAwareness: ["overconfidence"],
    },
    {
      id: id("Synthesizer"),
      name: "Mr. Bridge",
      expertise: ["summarization", "mediation"],
      values: ["balance", "clarity"],
      thinkingStyle: "integrative",
      communicationStyle: "structured",
      biasAwareness: ["anchoring"],
    },
  ];
}

export function selectActivePersona(blackboard: MultiPersonaBlackboard, previousActs: string[]) {
  // 簡易戦略：直近のペルソナを回避して選択
  // Implementation-2と同様にロールに依存しない
  const lastAct = previousActs.at(-1);
  if (!lastAct) return blackboard.personas[0];

  // 直近のペルソナを回避して選択
  const lastPersonaId = blackboard.meta.lastSelectedPersonaId;
  const notLast = blackboard.personas.find(p => p.id !== lastPersonaId);
  return notLast ?? blackboard.personas[0];
}

export function updatePersonaContributions(
  blackboard: MultiPersonaBlackboard,
  personaId: string,
  updates: Partial<MultiPersonaBlackboard["personaContributions"][string]>,
) {
  const current = blackboard.personaContributions[personaId];
  blackboard.personaContributions[personaId] = { ...current, ...updates };
}
