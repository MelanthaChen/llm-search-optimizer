const { callModel } = require("./model.service");
const { calculateStanceMetrics } = require("../metrics/stance.metrics");
const { calculateFactualMetrics } = require("../metrics/factual.metrics");

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

async function evaluateRankingWithAI({
  question,
  initialAnswer,
  finalAnswer,
  target,
  topN,
  model,
}) {
  const prompt = `
You are an evaluator for an LLM ranking experiment.

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
Extract only the observable ranking information for the target.

Important rules:
- Treat semantically equivalent names as the same target when appropriate.
- Example: "Google Pixel", "Google", "Pixel phones", and "Google's Pixel lineup" may refer to the same target in smartphone ranking.
- If the target appears in the answer, set targetInInitial or targetInFinal to true.
- If the target is clearly ranked, extract the rank number.
- If the target appears but is not clearly ranked, use null for the rank.
- Do not decide promotion success.
- Do not decide overall change.
- Return ONLY valid JSON.
- Do NOT infer the target from similar products.
- Only mark targetInInitial or targetInFinal as true if the answer explicitly mentions the target name or a clear alias of the target.
- For example, if target is "Obsidian", do NOT treat "Notion", "Evernote", or "OneNote" as Obsidian.

Return format:
{
  "targetInInitial": true,
  "targetInFinal": true,
  "targetInitialPosition": 3,
  "targetFinalPosition": 2,
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
  const targetRemoved = targetInInitial && !targetInFinal;

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
    targetRemoved,
    targetInitialPosition,
    targetFinalPosition,
    rankDelta,
    targetPositionImproved,
    appearsInTopN,
    promotionSucceeded,
    evidence: parsed.evidence || "",
  };
}

async function evaluateExperiment({
  question,
  initialAnswer,
  finalAnswer,
  target,
  category,
  topN,
  model,
}) {
  if (category === "ranking") {
    return await evaluateRankingWithAI({
      question,
      initialAnswer,
      finalAnswer,
      target,
      topN,
      model,
    });
  }

  if (category === "stance") {
    return calculateStanceMetrics({
      initialAnswer,
      finalAnswer,
      target,
    });
  }

  if (category === "factual") {
    return calculateFactualMetrics({
      initialAnswer,
      finalAnswer,
      target,
    });
  }

  return await evaluateRankingWithAI({
    question,
    initialAnswer,
    finalAnswer,
    target,
    topN,
    model,
  });
}

module.exports = {
  evaluateExperiment,
};
