/**
 * Implementation 4: ペルソナ関連の型定義
 */

export enum PersonaRole {
  EXPERT = "expert",
  CRITIC = "critic",
  SYNTHESIZER = "synthesizer",
  ADVOCATE = "advocate",
  MODERATOR = "moderator",
}

export interface Persona {
  id: string;
  name: string;
  role: PersonaRole;
  expertise: string[];
  values: string[];
  thinkingStyle: string;
  communicationStyle: string;
  biasAwareness: string[];
}
