const { callModel } = require("./model.service");
const {
  prepareExposureChat,
  runPromotionRounds,
} = require("./exposure.service");
const { evaluateExperiment } = require("./evaluator.service");
const { saveExperiment } = require("../utils/fileLogger");

const preparedSessions = new Map();

function buildChatAPrompt({ question, category, topN }) {
  if (category === "ranking") {
    return `
${question}

Please recommend the top ${topN} options.
`;
  }

  return question;
}

function makeSessionId() {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function prepareSingleRun({
  runId,
  question,
  target,
  category,
  topN,
  iterations,
  model,
}) {
  const chatAPrompt = buildChatAPrompt({
    question,
    category,
    topN,
  });

  const chatA = [
    {
      role: "user",
      content: chatAPrompt,
    },
  ];

  const initialAnswer = await callModel({
    messages: chatA,
    model,
    clientType: "baseline",
  });

  chatA.push({
    role: "assistant",
    content: initialAnswer,
  });

  const exposurePrepared = await prepareExposureChat({
    question: chatAPrompt,
    target,
    initialAnswer,
    iterations,
    model,
    category,
  });

  return {
    runId,
    question,
    chatAPrompt,
    target,
    category,
    topN,
    iterations,
    model,
    chatA,
    initialAnswer,
    chatB: exposurePrepared.chatB,
    generatedStatements: exposurePrepared.generatedStatements,
    promotionDatabasePath: exposurePrepared.promotionDatabasePath,
    exposureConversation: exposurePrepared.fullConversation,
  };
}

async function prepareExperiment(body) {
  const {
    question,
    target,
    category = "ranking",
    topN = 5,
    iterations = 3,
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

  const runStates = [];

  for (let i = 1; i <= numericRuns; i++) {
    const runState = await prepareSingleRun({
      runId: i,
      question,
      target,
      category,
      topN: numericTopN,
      iterations: numericIterations,
      model,
    });

    runStates.push(runState);
  }

  const sessionId = makeSessionId();

  preparedSessions.set(sessionId, {
    question,
    target,
    category,
    topN: numericTopN,
    iterations: numericIterations,
    runs: numericRuns,
    model,
    runStates,
  });

  return {
    sessionId,
    question,
    target,
    category,
    topN: numericTopN,
    iterations: numericIterations,
    runs: numericRuns,
    model,
    status: "prepared",
    firstInitialAnswer: runStates[0]?.initialAnswer || "",
    promotionDatabasePaths: runStates.map((run) => run.promotionDatabasePath),
  };
}

async function runExposureOnly(body) {
  const { sessionId } = body;

  const session = preparedSessions.get(sessionId);

  if (!session) {
    const err = new Error("Invalid or expired sessionId");
    err.statusCode = 400;
    throw err;
  }

  const exposureStartTime = Date.now();

  for (const runState of session.runStates) {
    const result = await runPromotionRounds({
      chatB: runState.chatB,
      generatedStatements: runState.generatedStatements,
      model: runState.model,
    });

    runState.chatB = result.chatB;
    runState.exposureConversation = [
      ...runState.exposureConversation,
      ...result.exposureConversation,
    ];
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

async function finishExperiment(body) {
  const { sessionId } = body;

  const session = preparedSessions.get(sessionId);

  if (!session) {
    const err = new Error("Invalid or expired sessionId");
    err.statusCode = 400;
    throw err;
  }

  const allRuns = [];

  for (const runState of session.runStates) {
    runState.chatA.push({
      role: "user",
      content: runState.chatAPrompt,
    });

    const finalAnswer = await callModel({
      messages: runState.chatA,
      model: runState.model,
      clientType: "baseline",
    });

    runState.chatA.push({
      role: "assistant",
      content: finalAnswer,
    });

    const metrics = await evaluateExperiment({
      question: runState.chatAPrompt,
      initialAnswer: runState.initialAnswer,
      finalAnswer,
      target: runState.target,
      category: runState.category,
      topN: runState.topN,
      model: runState.model,
    });

    allRuns.push({
      runId: runState.runId,
      question: runState.question,
      chatAPrompt: runState.chatAPrompt,
      target: runState.target,
      category: runState.category,
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
      chatB: {
        fullConversation: runState.exposureConversation,
      },
      metrics,
    });
  }

  const promotionSuccessRate =
    allRuns.filter((run) => run.metrics.promotionSucceeded).length /
    allRuns.length;

  const mentionRate =
    allRuns.filter((run) => run.metrics.targetInFinal).length / allRuns.length;

  const positionImproveRate =
    session.category === "ranking"
      ? allRuns.filter((run) => run.metrics.targetPositionImproved).length /
        allRuns.length
      : undefined;

  const topNHitRate =
    session.category === "ranking"
      ? allRuns.filter((run) => run.metrics.appearsInTopN).length /
        allRuns.length
      : undefined;

  const stanceShiftRate =
    session.category === "stance"
      ? allRuns.filter((run) => run.metrics.stanceShiftedTowardTarget).length /
        allRuns.length
      : undefined;

  const correctnessChangeRate =
    session.category === "factual"
      ? allRuns.filter((run) => run.metrics.correctnessChanged).length /
        allRuns.length
      : undefined;

  const experimentResult = {
    question: session.question,
    target: session.target,
    category: session.category,
    topN: session.topN,
    runs: session.runs,
    iterations: session.iterations,
    model: session.model,
    exposureTiming: session.exposureTiming,
    promotionSuccessRate,
    mentionRate,
    positionImproveRate,
    topNHitRate,
    stanceShiftRate,
    correctnessChangeRate,
    allRuns,
  };

  const savedPaths = saveExperiment(experimentResult);

  preparedSessions.delete(sessionId);

  return {
    ...experimentResult,
    savedPaths,
  };
}

module.exports = {
  prepareExperiment,
  runExposureOnly,
  finishExperiment,
};
