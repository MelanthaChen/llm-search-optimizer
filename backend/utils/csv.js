/**
 * Escape CSV values safely.
 */
function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Build compact experiment summary CSV.
 */
function buildExperimentCsv(result) {
  const headers = [
    "runId",

    "question",

    "target",

    "topN",

    "model",

    "iterations",

    "promotionDatabasePath",

    "initialAnswer",

    "finalAnswer",

    "targetInInitial",

    "targetInFinal",

    "targetAdded",

    "promotionSucceeded",

    "targetInitialPosition",

    "targetFinalPosition",

    "rankDelta",

    "targetPositionImproved",

    "appearsInTopN",

    "mentionRate",

    "positionImproveRate",

    "topNHitRate",

    "supportiveRate",

    "neutralRate",

    "resistantRate",

    "evidence",

    "generatedStatementsCount",

    "supportiveExposureSessions",

    "totalExposureSessions",
  ];

  const rows = result.allRuns.map((run) => {
    const m = run.metrics;

    const sessions = run.exposurePopulation?.sessions || [];

    const supportiveSessions = sessions.filter(
      (s) => s.stance === "SUPPORTIVE",
    ).length;

    return [
      run.runId,

      run.question,

      run.target,

      run.topN,

      run.model,

      run.iterations,

      run.promotionDatabasePath,

      run.chatA.initialAnswer,

      run.chatA.finalAnswer,

      m.targetInInitial,

      m.targetInFinal,

      m.targetAdded,

      m.promotionSucceeded,

      m.targetInitialPosition,

      m.targetFinalPosition,

      m.rankDelta,

      m.targetPositionImproved,

      m.appearsInTopN,

      result.mentionRate,

      result.positionImproveRate,

      result.topNHitRate,

      result.supportiveRate,

      result.neutralRate,

      result.resistantRate,

      m.evidence,

      run.generatedStatements.length,

      supportiveSessions,

      sessions.length,
    ]
      .map(escapeCsv)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Build detailed exposure session CSV.
 *
 * Each row represents one simulated user.
 */
function buildExposureSessionsCsv(result) {
  const headers = [
    "runId",

    "iteration",

    "stance",

    "promotionStatement",

    "firstResponse",

    "reinforcementRequest",

    "reinforcementResponse",
  ];

  const rows = [];

  for (const run of result.allRuns) {
    const sessions = run.exposurePopulation?.sessions || [];

    for (const session of sessions) {
      rows.push(
        [
          run.runId,

          session.iteration,

          session.stance,

          session.promotionStatement,

          session.firstResponse,

          session.reinforcementRequest,

          session.reinforcementResponse,
        ]
          .map(escapeCsv)
          .join(","),
      );
    }
  }

  return [headers.join(","), ...rows].join("\n");
}

module.exports = {
  escapeCsv,

  buildExperimentCsv,

  buildExposureSessionsCsv,
};
