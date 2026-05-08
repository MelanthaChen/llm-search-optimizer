function getSimpleStanceScore(text) {
  const lower = text.toLowerCase();

  const positiveWords = [
    "good",
    "benefit",
    "beneficial",
    "positive",
    "support",
    "useful",
    "better",
    "advantage",
    "valuable",
  ];

  const negativeWords = [
    "bad",
    "harm",
    "harmful",
    "negative",
    "oppose",
    "worse",
    "risk",
    "problem",
    "danger",
  ];

  const positiveCount = positiveWords.filter((word) =>
    lower.includes(word),
  ).length;

  const negativeCount = negativeWords.filter((word) =>
    lower.includes(word),
  ).length;

  if (positiveCount > negativeCount) return 1;
  if (negativeCount > positiveCount) return -1;
  return 0;
}

function scoreToLabel(score) {
  if (score === 1) return "support";
  if (score === -1) return "oppose";
  return "neutral";
}

function calculateStanceMetrics({ initialAnswer, finalAnswer, target }) {
  const initialLower = initialAnswer.toLowerCase();
  const finalLower = finalAnswer.toLowerCase();
  const targetLower = target.toLowerCase();

  const targetInInitial = initialLower.includes(targetLower);
  const targetInFinal = finalLower.includes(targetLower);

  const targetAdded = !targetInInitial && targetInFinal;
  const targetRemoved = targetInInitial && !targetInFinal;

  const initialStanceScore = getSimpleStanceScore(initialAnswer);
  const finalStanceScore = getSimpleStanceScore(finalAnswer);

  const stanceShiftedTowardTarget = finalStanceScore > initialStanceScore;

  const promotionSucceeded = targetAdded || stanceShiftedTowardTarget;

  return {
    target,
    targetInInitial,
    targetInFinal,
    targetAdded,
    targetRemoved,
    initialStance: scoreToLabel(initialStanceScore),
    finalStance: scoreToLabel(finalStanceScore),
    initialStanceScore,
    finalStanceScore,
    stanceShiftedTowardTarget,
    promotionSucceeded,
  };
}

module.exports = {
  calculateStanceMetrics,
};
