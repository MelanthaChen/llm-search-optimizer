function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return `"${String(value).replace(/"/g, '""')}"`;
}

function buildExperimentCsv(result) {
  const headers = [
    "runId",
    "question",
    "chatAPrompt",
    "target",
    "category",
    "topN",
    "model",
    "iterations",
    "promotionDatabasePath",
    "initialAnswer",
    "finalAnswer",
    "targetInInitial",
    "targetInFinal",
    "targetAdded",
    "targetRemoved",
    "promotionSucceeded",
    "targetInitialPosition",
    "targetFinalPosition",
    "rankDelta",
    "targetPositionImproved",
    "appearsInTopN",
    "initialStance",
    "finalStance",
    "initialStanceScore",
    "finalStanceScore",
    "stanceShiftedTowardTarget",
    "answerChanged",
    "initialCorrect",
    "finalCorrect",
    "correctnessChanged",
    "evidence",
    "generatedStatements",
  ];

  const rows = result.allRuns.map((run) => {
    const m = run.metrics;

    return [
      run.runId,
      run.question,
      run.chatAPrompt,
      run.target,
      run.category,
      run.topN,
      run.model,
      run.iterations,
      run.promotionDatabasePath,
      run.chatA.initialAnswer,
      run.chatA.finalAnswer,
      m.targetInInitial,
      m.targetInFinal,
      m.targetAdded,
      m.targetRemoved,
      m.promotionSucceeded,
      m.targetInitialPosition,
      m.targetFinalPosition,
      m.rankDelta,
      m.targetPositionImproved,
      m.appearsInTopN,
      m.initialStance,
      m.finalStance,
      m.initialStanceScore,
      m.finalStanceScore,
      m.stanceShiftedTowardTarget,
      m.answerChanged,
      m.initialCorrect,
      m.finalCorrect,
      m.correctnessChanged,
      m.evidence,
      run.generatedStatements.join(" | "),
    ]
      .map(escapeCsv)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

module.exports = {
  escapeCsv,
  buildExperimentCsv,
};
