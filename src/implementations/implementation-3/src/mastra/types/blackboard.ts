/**
 * Implementation 3: 単一LLM × 逐次討論（Self-Deliberative Agent）
 * ブラックボード状態管理の型定義
 */

/**
 * 対話行為の種類
 */
export enum DialogueAct {
  PROPOSE = "propose", // 新しい主張の追加または既存主張の修正
  CRITIQUE = "critique", // 既存主張への反論や弱点の指摘
  QUESTION = "question", // 情報要求、不確実箇所の明確化
  FACT_CHECK = "fact_check", // 出典探索や検証（将来的にツール連携）
  SYNTHESIZE = "synthesize", // 部分合意、要約、論点整理
  PLAN = "plan", // 次の探索方針の更新
  FINALIZE = "finalize", // 収束宣言と最終文生成
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
  resolved: boolean; // 解決済みかどうか
}

/**
 * 質問（Question）
 * 未解決の情報要求を表現
 */
export interface Question {
  id: string;
  text: string;
  targetClaimId?: string; // 対象となる主張ID（任意）
  priority: "high" | "medium" | "low"; // 優先度
  resolved: boolean; // 解決済みかどうか
}

/**
 * 計画（Plan）
 * 現在の探索方針を表現
 */
export interface Plan {
  currentFocus: string; // 現在注力している論点
  nextSteps: string[]; // 次に取り組むべきタスク
  avoidTopics: string[]; // 避けるべき重複トピック
}

/**
 * 執筆パッド（Writepad）
 * 逐次統合されるアウトラインと本文
 */
export interface Writepad {
  outline: string; // アウトライン
  sections: {
    title: string; // セクションタイトル
    content: string; // セクション内容
    claimIds: string[]; // 関連する主張ID
  }[];
  finalDraft?: string; // 最終原稿（完成時）
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

  // 未解決の質問キュー
  questions: Question[];

  // 現在の探索方針
  plan: Plan;

  // 執筆パッド（逐次統合されるアウトライン）
  writepad: Writepad;

  // メタ情報
  meta: {
    stepCount: number; // 現在のステップ数
    tokenBudget: number; // トークン予算
    usedTokens: number; // 使用済みトークン数
    convergenceHistory: number[]; // 収束スコアの履歴
  };
}

/**
 * 対話行為の選択結果
 */
export interface DialogueActDecision {
  dialogueAct: DialogueAct; // 選択された対話行為
  reasoning: string; // 選択理由
  expectedUtility: {
    persuasivenessGain: number; // 説得力の期待改善度 [0.0, 1.0]
    novelty: number; // 新規性 [0.0, 1.0]
    uncertaintyReduction: number; // 不確実性低減 [0.0, 1.0]
    cost: number; // 推定トークン数
  };
  targetClaimIds?: string[]; // 関連するclaim ID（該当する場合）
  shouldFinalize: boolean; // 収束すべきかどうか
  convergenceAnalysis: {
    beliefConvergence: number; // 信念収束度 [0.0, 1.0]
    noveltyRate: number; // 新規性率 [0.0, 1.0]
    unresolvedCriticalAttacks: number; // 未解決の致命的攻撃数
  };
}

/**
 * 対話行為の実行結果
 */
export interface ExecutionResult {
  dialogueAct: DialogueAct; // 実行された対話行為
  newClaims?: Claim[]; // 新しく追加された主張
  updatedClaims?: Claim[]; // 更新された主張
  newAttacks?: Attack[]; // 新しく追加された攻撃
  resolvedAttacks?: string[]; // 解決された攻撃のID
  newQuestions?: Question[]; // 新しく追加された質問
  resolvedQuestions?: string[]; // 解決された質問のID
  updatedPlan?: Partial<Plan>; // 更新された計画
  updatedWritepad?: Partial<Writepad>; // 更新された執筆パッド
  finalDocument?: string; // 最終文書（FINALIZE時）
}

/**
 * 判定結果（メトリクス）
 */
export interface JudgmentMetrics {
  beliefConvergence: number; // 信念収束度 [0.0, 1.0]
  noveltyScore: number; // 新規性スコア [0.0, 1.0]
  attackResolutionRate: number; // 攻撃解決率 [0.0, 1.0]
  diversityScore: number; // 多様性スコア [0.0, 1.0] - 新規追加
  convergenceScore: number; // 総合収束スコア [0.0, 1.0]
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
