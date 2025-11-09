/**
 * Implementation 4: ペルソナ関連の型定義
 * Implementation-2と同様にロールは持たない
 */

export interface Persona {
  id: string;
  name: string;
  expertise: string[];
  values: string[];
  thinkingStyle: string;
  communicationStyle: string;
  biasAwareness: string[];
}
