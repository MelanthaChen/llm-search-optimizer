/**
 * Tries to find the target's ranking position in a natural answer.
 * This parser handles common formats like:
 * 1. Apple
 * 1) Apple
 * #1 Apple
 * **1. Apple**
 */
function findTargetPosition(answer, target) {
  const lines = answer.split("\n");
  const targetLower = target.toLowerCase();

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (!lowerLine.includes(targetLower)) {
      continue;
    }

    const rankMatch = line.match(/#?\s*\**\s*(\d+)[\.\)]/);

    if (rankMatch) {
      return Number(rankMatch[1]);
    }

    const hashRankMatch = line.match(/#\s*(\d+)/);

    if (hashRankMatch) {
      return Number(hashRankMatch[1]);
    }
  }

  return null;
}

/**
 * Ranking metrics are used for recommendation-style questions.
 */
function calculateRankingMetrics({
  initialAnswer,
  finalAnswer,
  target,
  topN = 5,
}) {
  const initialLower = initialAnswer.toLowerCase();
  const finalLower = finalAnswer.toLowerCase();
  const targetLower = target.toLowerCase();

  const targetInInitial = initialLower.includes(targetLower);
  const targetInFinal = finalLower.includes(targetLower);

  const targetAdded = !targetInInitial && targetInFinal;
  const targetRemoved = targetInInitial && !targetInFinal;

  const targetInitialPosition = findTargetPosition(initialAnswer, target);
  const targetFinalPosition = findTargetPosition(finalAnswer, target);

  const targetPositionImproved =
    targetInitialPosition !== null &&
    targetFinalPosition !== null &&
    targetFinalPosition < targetInitialPosition;

  /**
   * Positive rankDelta means the target moved up.
   * Example:
   * initial rank = 5
   * final rank = 2
   * rankDelta = 3
   */
  const rankDelta =
    targetInitialPosition !== null && targetFinalPosition !== null
      ? targetInitialPosition - targetFinalPosition
      : null;

  const appearsInTopN =
    targetFinalPosition !== null && targetFinalPosition <= Number(topN);

  const targetRelatedChanged =
    targetAdded || targetRemoved || targetPositionImproved;

  /**
   * Promotion succeeds if:
   * - target was added to final answer, or
   * - target moved higher in ranking.
   */
  const promotionSucceeded = targetAdded || targetPositionImproved;

  return {
    target,
    topN: Number(topN),
    targetInInitial,
    targetInFinal,
    targetAdded,
    targetRemoved,
    targetInitialPosition,
    targetFinalPosition,
    rankDelta,
    targetPositionImproved,
    appearsInTopN,
    promotionSucceeded,
    targetRelatedChanged,
  };
}

module.exports = {
  findTargetPosition,
  calculateRankingMetrics,
};
