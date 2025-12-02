/**
 * Implementation 3: 単一LLM × 逐次討論（Self-Deliberative Agent）
 * ブラックボード状態管理の型定義
 */

/**
 * 対話行為の種類
 */
export enum DialogueAct {
  PROPOSE = "propose", // 新しい主張の追加
  CRITIQUE = "critique", // 既存主張への反論
  FINALIZE = "finalize", // 議論を終了し最終文書を生成
}

/**
 * 主張（Claim）
 * 議論における個々の主張を表現
 */
export interface Claim {
  id: string;
  text: string;
  support: string[]; // 支持する証拠
  confidence: number; // 信念度 [0.0, 1.0]
  createdAt: number; // ステップ番号
  lastUpdated: number; // 最終更新ステップ番号
}

/**
 * 攻撃（Attack）
 * 主張間の反論関係を表現
 */
export interface Attack {
  id: string;
  fromClaimId: string; // 攻撃元の主張ID
  toClaimId: string; // 攻撃対象の主張ID
  type: "logic" | "evidence" | "relevance"; // 攻撃の種類
  severity: "critical" | "major" | "minor"; // 重要度
  description: string; // 攻撃の内容
}

/**
 * ブラックボード状態（BlackboardState）
 * 議論の進捗を追跡する共有メモリ
 */
export interface BlackboardState {
  // 議論のトピック
  topic: string;

  // 主張リスト
  claims: Claim[];

  // 攻撃（反論）リスト
  attacks: Attack[];

  // メタ情報
  meta: {
    stepCount: number; // 現在のステップ数
    tokenBudget: number; // トークン予算
    usedTokens: number; // 使用済みトークン数
  };
}

/**
 * 対話行為の決定結果
 * DeliberativeAgentが生成する
 */
export interface DialogueActDecision {
  dialogueAct: DialogueAct;
  reasoning: string;
  expectedUtility?: {
    persuasivenessGain: number;
    novelty: number;
    uncertaintyReduction: number;
    cost: number;
  };
  targetClaimIds?: string[];
  shouldFinalize: boolean;
  convergenceAnalysis?: {
    beliefConvergence: number;
    noveltyRate: number;
  };
}

/**
 * 対話行為の実行結果
 * ExecutorAgentが生成する
 */
export interface ExecutionResult {
  dialogueAct: DialogueAct;
  newClaims?: Claim[];
  newAttacks?: Attack[];
  finalDocument?: string;
}

/**
 * 議論の立場分析結果
 */
export interface StanceAnalysis {
  proCount: number; // 賛成の主張数
  conCount: number; // 反対の主張数
  neutralCount: number; // 中立の主張数
  diversityScore: number; // 多様性スコア [0.0, 1.0]
  needsOpposition: boolean; // 反対意見が必要か
  needsCritique: boolean; // 反論が必要か
  analysis: string; // 分析結果の説明
}
