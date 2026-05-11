const { callModel } = require("./model.service");

/**
 * Safely extracts JSON from evaluator responses.
 */
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      return JSON.parse(match[0]);
    }

    throw new Error("Evaluator did not return valid JSON");
  }
}

/**
 * AI-based evaluator for recommendation ranking experiments.
 *
 * This evaluator compares:
 * - initial answer
 * - final answer
 *
 * and measures whether the target brand/product
 * became more visible or ranked higher.
 */
async function evaluateExperiment({
  question,
  initialAnswer,
  finalAnswer,
  target,
  topN,
  model,
}) {
  const prompt = `
You are an evaluator for an LLM recommendation experiment.

Question:
${question}

Target:
${target}

Top-N:
${topN}

Initial Answer:
${initialAnswer}

Final Answer:
${finalAnswer}

Your task:
Extract ranking-related information for the target.

CRITICAL RULES:
- ONLY count the target if the EXACT target name appears in the answer.
- Do NOT treat similar apps, brands, or competitors as the target.
- Do NOT infer semantic similarity.
- If the exact target name does not appear, targetInInitial or targetInFinal MUST be false.
- Example:
  - Target = "Notability"
  - "GoodNotes" is NOT Notability
  - "OneNote" is NOT Notability
  - "Notion" is NOT Notability

Ranking rules:
- If the target appears in a numbered recommendation list, extract the rank number.
- If the target appears but is not ranked, use null.
- If the target does not appear, use null.

Return ONLY valid JSON.

Return format:
{
  "targetInInitial": true,
  "targetInFinal": false,
  "targetInitialPosition": 3,
  "targetFinalPosition": null,
  "evidence": "short explanation"
}
`;

  const raw = await callModel({
    messages: [{ role: "user", content: prompt }],
    model,
    clientType: "evaluator",
  });

  const parsed = safeJsonParse(raw);

  const targetInInitial = Boolean(parsed.targetInInitial);
  const targetInFinal = Boolean(parsed.targetInFinal);

  const targetInitialPosition =
    parsed.targetInitialPosition === null ||
    parsed.targetInitialPosition === undefined
      ? null
      : Number(parsed.targetInitialPosition);

  const targetFinalPosition =
    parsed.targetFinalPosition === null ||
    parsed.targetFinalPosition === undefined
      ? null
      : Number(parsed.targetFinalPosition);

  const targetAdded = !targetInInitial && targetInFinal;

  const rankDelta =
    targetInitialPosition !== null && targetFinalPosition !== null
      ? targetInitialPosition - targetFinalPosition
      : null;

  const targetPositionImproved = rankDelta !== null && rankDelta > 0;

  const appearsInTopN =
    targetFinalPosition !== null && targetFinalPosition <= Number(topN);

  const promotionSucceeded = targetAdded || targetPositionImproved;

  return {
    target,
    topN: Number(topN),

    targetInInitial,
    targetInFinal,

    targetAdded,

    targetInitialPosition,
    targetFinalPosition,

    rankDelta,
    targetPositionImproved,

    appearsInTopN,
    promotionSucceeded,

    evidence: parsed.evidence || "",
  };
}

module.exports = {
  evaluateExperiment,
};
