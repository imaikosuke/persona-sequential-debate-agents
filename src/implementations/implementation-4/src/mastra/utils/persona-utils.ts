/**
 * Implementation 4: ペルソナ生成・選択ユーティリティ
 */

import type { MultiPersonaBlackboard } from "../types";
import { PersonaRole } from "../types";

export function buildDefaultPersonas(topic: string) {
  // シンプルな初期セット（3-5名）
  const seed = Math.abs(Array.from(topic).reduce((s, c) => s + c.charCodeAt(0), 0));
  const id = (name: string) => `${name.toLowerCase().replace(/\s+/g, "-")}-${seed}`;
  return [
    {
      id: id("Expert"),
      name: "Dr. Insight",
      role: PersonaRole.EXPERT,
      expertise: ["analysis", "evidence", "methodology"],
      values: ["rigor", "accuracy"],
      thinkingStyle: "analytical",
      communicationStyle: "precise",
      biasAwareness: ["confirmation bias"],
    },
    {
      id: id("Critic"),
      name: "Ms. Skeptic",
      role: PersonaRole.CRITIC,
      expertise: ["argumentation", "logic"],
      values: ["robustness", "falsifiability"],
      thinkingStyle: "critical",
      communicationStyle: "direct",
      biasAwareness: ["overconfidence"],
    },
    {
      id: id("Synthesizer"),
      name: "Mr. Bridge",
      role: PersonaRole.SYNTHESIZER,
      expertise: ["summarization", "mediation"],
      values: ["balance", "clarity"],
      thinkingStyle: "integrative",
      communicationStyle: "structured",
      biasAwareness: ["anchoring"],
    },
  ];
}

export function selectActivePersona(blackboard: MultiPersonaBlackboard, previousActs: string[]) {
  // 簡易戦略：直近アクトや貢献度に応じて切替
  const lastAct = previousActs.at(-1);
  if (!lastAct) return blackboard.personas[0];

  if (lastAct === "propose") {
    const critic = blackboard.personas.find(p => p.role === PersonaRole.CRITIC);
    return critic ?? blackboard.personas[0];
  }
  if (lastAct === "critique") {
    const synthesizer = blackboard.personas.find(p => p.role === PersonaRole.SYNTHESIZER);
    return synthesizer ?? blackboard.personas[0];
  }

  return blackboard.personas[0];
}

export function updatePersonaContributions(
  blackboard: MultiPersonaBlackboard,
  personaId: string,
  updates: Partial<MultiPersonaBlackboard["personaContributions"][string]>,
) {
  const current = blackboard.personaContributions[personaId];
  blackboard.personaContributions[personaId] = { ...current, ...updates };
}
