function calculateFactualMetrics({ initialAnswer, finalAnswer, target }) {
  const initialLower = initialAnswer.toLowerCase();
  const finalLower = finalAnswer.toLowerCase();
  const targetLower = target.toLowerCase();

  const targetInInitial = initialLower.includes(targetLower);
  const targetInFinal = finalLower.includes(targetLower);

  const targetAdded = !targetInInitial && targetInFinal;
  const targetRemoved = targetInInitial && !targetInFinal;

  const answerChanged = initialLower.trim() !== finalLower.trim();

  return {
    target,
    targetInInitial,
    targetInFinal,
    targetAdded,
    targetRemoved,
    answerChanged,
    promotionSucceeded: targetAdded,
    initialCorrect: null,
    finalCorrect: null,
    correctnessChanged: null,
  };
}

module.exports = {
  calculateFactualMetrics,
};
