/**
 * Implementation 4: マルチペルソナ対応ブラックボード型
 */

export enum DialogueAct {
  PROPOSE = "propose", // 新しい主張の追加
  CRITIQUE = "critique", // 既存主張への反論
  FINALIZE = "finalize", // 議論の終了
}

export interface Claim {
  id: string;
  text: string;
  support: string[];
  confidence: number; // [0.0, 1.0]
  createdAt: number;
  lastUpdated: number;
  personaContext?: {
    personaId: string;
  };
}

export interface Attack {
  id: string;
  fromClaimId: string;
  toClaimId: string;
  type: "logic" | "evidence" | "relevance";
  severity: "critical" | "major" | "minor";
  description: string;
  resolved: boolean;
}

export interface Question {
  id: string;
  text: string;
  targetClaimId?: string;
  priority: "high" | "medium" | "low";
  resolved: boolean;
}

export interface Plan {
  currentFocus: string;
  nextSteps: string[];
  avoidTopics: string[];
}

export interface Writepad {
  outline: string;
  sections: {
    title: string;
    content: string;
    claimIds: string[];
  }[];
  finalDraft?: string;
}

export interface CrossReference {
  id: string;
  fromPersonaId: string;
  toPersonaId: string;
  type: "support" | "challenge" | "clarification";
  claimId: string;
  description: string;
  timestamp: number;
}

export interface DiversityMetrics {
  expertiseSpread: number; // 0-1
  valueAlignment: number; // 0-1 (低いほど多様)
  perspectiveCoverage: number; // 0-1
}

export interface BlackboardState {
  topic: string;
  claims: Claim[];
  attacks: Attack[];
  questions: Question[];
  plan: Plan;
  writepad: Writepad;
  meta: {
    stepCount: number;
    tokenBudget: number;
    usedTokens: number;
    convergenceHistory: number[];
    lastSelectedPersonaId?: string;
  };
}

export interface MultiPersonaBlackboard extends BlackboardState {
  personas: import("./persona").Persona[];
  personaContributions: {
    [personaId: string]: {
      claimCount: number;
      acceptedClaims: number;
      challengeCount: number;
      supportCount: number;
    };
  };
  crossReferences: CrossReference[];
  consensusLevel: number; // 0-1
  diversityMetrics: DiversityMetrics;
}

export interface DialogueActDecision {
  dialogueAct: DialogueAct;
  reasoning: string;
  expectedUtility: {
    persuasivenessGain: number;
    novelty: number;
    uncertaintyReduction: number;
    cost: number;
  };
  targetClaimIds?: string[];
  shouldFinalize: boolean;
  convergenceAnalysis: {
    beliefConvergence: number;
    noveltyRate: number;
    unresolvedCriticalAttacks: number;
  };
  selectedPersonaId?: string;
}

export interface ExecutionResult {
  dialogueAct: DialogueAct;
  newClaims?: Claim[];
  updatedClaims?: Claim[];
  newAttacks?: Attack[];
  resolvedAttacks?: string[];
  newQuestions?: Question[];
  resolvedQuestions?: string[];
  updatedPlan?: Partial<Plan>;
  updatedWritepad?: Partial<Writepad>;
  finalDocument?: string;
  crossReferences?: CrossReference[];
}

export interface JudgmentMetrics {
  beliefConvergence: number;
  noveltyScore: number;
  attackResolutionRate: number;
  diversityScore: number;
  convergenceScore: number;
}
