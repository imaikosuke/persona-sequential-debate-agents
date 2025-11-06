/**
 * Implementation 4: 合意形成・多様性分析ユーティリティ
 */

import type { DiversityMetrics, MultiPersonaBlackboard } from "../types";

export function computeDiversityMetrics(blackboard: MultiPersonaBlackboard): DiversityMetrics {
  const personas = blackboard.personas;
  if (personas.length === 0) {
    return { expertiseSpread: 0, valueAlignment: 0, perspectiveCoverage: 0 };
  }

  const expertiseSet = new Set<string>();
  const valuesSet = new Set<string>();
  for (const p of personas) {
    p.expertise.forEach(e => expertiseSet.add(e));
    p.values.forEach(v => valuesSet.add(v));
  }

  // 簡易スコア: ユニーク数を人数で正規化
  const expertiseSpread = Math.min(1, expertiseSet.size / (personas.length * 3));
  const valueAlignment = Math.max(0, 1 - valuesSet.size / (personas.length * 2));

  // 視点カバレッジ: 役割のバランスで近似
  const roles = new Set(personas.map(p => p.role));
  const perspectiveCoverage = Math.min(1, roles.size / 5);

  return { expertiseSpread, valueAlignment, perspectiveCoverage };
}

export function updateConsensusAndDiversity(blackboard: MultiPersonaBlackboard) {
  const metrics = computeDiversityMetrics(blackboard);
  blackboard.diversityMetrics = metrics;

  // consensusLevelはutils/blackboardの関数を使用して更新される想定
}
