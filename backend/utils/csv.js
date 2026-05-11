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

    "acceptedExposureRate",

    "evidence",

    "generatedStatementsCount",

    "acceptedExposureSessions",

    "totalExposureSessions",
  ];

  const rows = result.allRuns.map((run) => {
    const m = run.metrics;

    const sessions = run.exposurePopulation?.sessions || [];

    const acceptedSessions = sessions.filter((s) => s.accepted).length;

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

      result.acceptedExposureRate,

      m.evidence,

      run.generatedStatements.length,

      acceptedSessions,

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

    "accepted",

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

          session.accepted,

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
