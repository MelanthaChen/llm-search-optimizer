const { callModel } = require("./model.service");
const {
  preparedSessions,
  updateExperimentProgress,
} = require("./progress.service");

const {
  prepareExposureChat,
  runPromotionRounds,
} = require("./exposure.service");

const { evaluateExperiment } = require("./evaluator.service");

const { saveExperiment } = require("../utils/fileLogger");

/**
 * Build the recommendation question prompt.
 */
function buildChatAPrompt({ question, topN }) {
  return `
${question}

Please recommend the top ${topN} options.
`;
}

/**
 * Generate a unique session ID.
 */
function makeSessionId() {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Prepare one experiment run.
 *
 * Each run contains:
 * - baseline recommendation
 * - promotion database
 * - exposure preparation
 */
async function prepareSingleRun({
  sessionId,
  runId,
  question,
  target,
  topN,
  iterations,
  model,
}) {
  /**
   * Build baseline recommendation prompt.
   */
  const chatAPrompt = buildChatAPrompt({
    question,
    topN,
  });

  /**
   * Chat A = evaluation model.
   *
   * This model is used for:
   * - initial recommendation
   * - final recommendation
   */
  const chatA = [
    {
      role: "user",
      content: chatAPrompt,
    },
  ];

  /**
   * Generate baseline answer.
   */
  const initialAnswer = await callModel({
    messages: chatA,
    model,
    clientType: "baseline",
  });

  chatA.push({
    role: "assistant",
    content: initialAnswer,
  });

  return {
    runId,

    question,

    target,

    topN,

    iterations,

    model,

    chatAPrompt,

    chatA,

    initialAnswer,

    generatedStatements: [],

    promotionDatabasePath: null,

    exposureConversation: [],
  };
}

/**
 * Prepare full experiment.
 */
async function prepareExperiment(body) {
  const {
    question,
    target,
    topN = 5,
    iterations = 100,
    runs = 1,
    model = "gpt-4.1-mini",
  } = body;

  if (!question || !target) {
    const err = new Error("Missing question or target");

    err.statusCode = 400;

    throw err;
  }

  const numericRuns = Number(runs);

  const numericIterations = Number(iterations);

  const numericTopN = Number(topN);

  const sessionId = makeSessionId();

  const runStates = [];

  /**
   * Prepare all runs.
   */
  for (let i = 1; i <= numericRuns; i++) {
    const runState = await prepareSingleRun({
      sessionId,
      runId: i,

      question,

      target,

      topN: numericTopN,

      iterations: numericIterations,

      model,
    });

    runStates.push(runState);
  }

  preparedSessions.set(sessionId, {
    question,

    target,

    topN: numericTopN,

    iterations: numericIterations,

    runs: numericRuns,

    model,

    runStates,

    progress: {
      phase: "Preparing Experiment",

      completed: 0,

      total: numericIterations,

      percentage: 0,
    },
  });

  return {
    sessionId,

    question,

    target,

    topN: numericTopN,

    iterations: numericIterations,

    runs: numericRuns,

    model,

    status: "prepared",

    firstInitialAnswer: runStates[0]?.initialAnswer || "",

    promotionDatabasePaths: runStates.map((run) => run.promotionDatabasePath),
  };
}

/**
 * Run all exposure sessions.
 *
 * This is where thousands of simulated users
 * interact with the exposure model.
 */
async function runExposureOnly(body) {
  const { sessionId } = body;

  const session = preparedSessions.get(sessionId);

  if (!session) {
    const err = new Error("Invalid or expired sessionId");

    err.statusCode = 400;

    throw err;
  }

  const exposureStartTime = Date.now();

  /**
   * Run exposure population for each run.
   */
  for (const runState of session.runStates) {
    updateExperimentProgress(
      sessionId,
      "Generating Promotion Statements",
      0,
      runState.iterations,
    );
    const exposurePrepared = await prepareExposureChat({
      question: runState.chatAPrompt,

      target: runState.target,

      iterations: runState.iterations,

      model: runState.model,

      sessionId,
    });

    runState.generatedStatements = exposurePrepared.generatedStatements;

    runState.promotionDatabasePath = exposurePrepared.promotionDatabasePath;

    updateExperimentProgress(
      sessionId,
      "Running Exposure Sessions",
      0,
      runState.generatedStatements.length,
    );

    const result = await runPromotionRounds({
      generatedStatements: runState.generatedStatements,

      model: runState.model,

      target: runState.target,

      question: runState.chatAPrompt,

      sessionId,
    });

    runState.exposureConversation = result.exposureConversation;
  }

  const exposureEndTime = Date.now();

  const exposureDurationMs = exposureEndTime - exposureStartTime;

  session.exposureTiming = {
    exposureStartTime,

    exposureEndTime,

    exposureDurationMs,
  };

  preparedSessions.set(sessionId, session);

  return {
    sessionId,

    status: "exposure_done",

    exposureTiming: session.exposureTiming,
  };
}

/**
 * Finish experiment and evaluate recommendation drift.
 */
async function finishExperiment(body) {
  const { sessionId } = body;

  updateExperimentProgress(
    sessionId,

    "Evaluating Final Recommendation",

    1,

    1,
  );

  const session = preparedSessions.get(sessionId);

  if (!session) {
    const err = new Error("Invalid or expired sessionId");

    err.statusCode = 400;

    throw err;
  }

  const allRuns = [];

  /**
   * Evaluate each run.
   */
  for (const runState of session.runStates) {
    /**
     * Ask the same recommendation question again.
     */
    runState.chatA.push({
      role: "user",
      content: runState.chatAPrompt,
    });

    /**
     * Generate final answer.
     */
    const finalAnswer = await callModel({
      messages: runState.chatA,

      model: runState.model,

      clientType: "baseline",
    });

    runState.chatA.push({
      role: "assistant",
      content: finalAnswer,
    });

    /**
     * Evaluate ranking changes.
     */
    const metrics = await evaluateExperiment({
      question: runState.chatAPrompt,

      initialAnswer: runState.initialAnswer,

      finalAnswer,

      target: runState.target,

      topN: runState.topN,

      model: runState.model,
    });

    allRuns.push({
      runId: runState.runId,

      question: runState.question,

      target: runState.target,

      topN: runState.topN,

      iterations: runState.iterations,

      model: runState.model,

      promotionDatabasePath: runState.promotionDatabasePath,

      exposureTiming: session.exposureTiming,

      generatedStatements: runState.generatedStatements,

      chatA: {
        initialAnswer: runState.initialAnswer,

        finalAnswer,

        fullConversation: runState.chatA,
      },

      exposurePopulation: {
        sessions: runState.exposureConversation,
      },

      metrics,
    });
  }

  /**
   * Exposure acceptance statistics.
   */
  const acceptedSessions = allRuns
    .flatMap((run) => run.exposurePopulation.sessions)
    .filter((s) => s.accepted).length;

  const totalSessions = allRuns.flatMap(
    (run) => run.exposurePopulation.sessions,
  ).length;

  const acceptedExposureRate = acceptedSessions / totalSessions;

  /**
   * Global experiment metrics.
   */
  const promotionSuccessRate =
    allRuns.filter((run) => run.metrics.promotionSucceeded).length /
    allRuns.length;

  const mentionRate =
    allRuns.filter((run) => run.metrics.targetInFinal).length / allRuns.length;

  const positionImproveRate =
    allRuns.filter((run) => run.metrics.targetPositionImproved).length /
    allRuns.length;

  const topNHitRate =
    allRuns.filter((run) => run.metrics.appearsInTopN).length / allRuns.length;

  /**
   * Final experiment result.
   */
  const experimentResult = {
    question: session.question,

    target: session.target,

    topN: session.topN,

    runs: session.runs,

    iterations: session.iterations,

    model: session.model,

    exposureTiming: session.exposureTiming,

    promotionSuccessRate,

    mentionRate,

    positionImproveRate,

    topNHitRate,

    acceptedExposureRate,

    allRuns,
  };

  /**
   * Save logs.
   */
  const savedPaths = saveExperiment(experimentResult);

  /**
   * Remove completed session.
   */
  // preparedSessions.delete(sessionId);

  return {
    ...experimentResult,

    downloadableFiles: {
      fullJson: savedPaths.fullJson,

      summaryCsv: savedPaths.summaryCsv,

      sessionsCsv: savedPaths.sessionsCsv,
    },

    savedPaths: {
      jsonPath: savedPaths.jsonPath,

      csvPath: savedPaths.csvPath,

      sessionsCsvPath: savedPaths.sessionsCsvPath,
    },
  };
}

module.exports = {
  prepareExperiment,

  runExposureOnly,

  finishExperiment,

  preparedSessions,

  updateExperimentProgress,
};
