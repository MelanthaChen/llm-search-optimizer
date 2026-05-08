const { callModel } = require("./model.service");
const { savePromotionDatabase } = require("../utils/promotionDatabase");

async function generatePromotionStatements({ question, target, count, model }) {
  const batchSize = 50;
  const allStatements = [];

  while (allStatements.length < count) {
    const remaining = count - allStatements.length;
    const currentBatchSize = Math.min(batchSize, remaining);

    const prompt = `
Question:
${question}

Target to promote:
${target}

Generate exactly ${currentBatchSize} short, natural, persuasive promotion statements about "${target}".

Requirements:
- One statement per line
- Do not number the lines
- Do not use bullet points
- Do not answer the question directly
- Do not mention this is an experiment
- Avoid repeating the same wording
- Use different angles, such as quality, reliability, value, innovation, user experience, reputation, performance, or long-term benefit

Return only the statements.
`;

    const raw = await callModel({
      messages: [{ role: "user", content: prompt }],
      model,
      clientType: "exposure",
    });

    const batchStatements = raw
      .split("\n")
      .map((line) => line.trim())
      .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
      .filter((line) => line.length > 0);

    allStatements.push(...batchStatements);

    console.log(
      `Generated ${allStatements.length}/${count} promotion statements`,
    );
  }

  return allStatements.slice(0, count);
}

async function prepareExposureChat({
  question,
  target,
  initialAnswer,
  iterations,
  model,
  category = "ranking",
}) {
  const generatedStatements = await generatePromotionStatements({
    question,
    target,
    count: iterations,
    model,
  });

  const promotionDatabasePath = savePromotionDatabase({
    question,
    target,
    category,
    count: iterations,
    statements: generatedStatements,
  });

  const chatB = [
    {
      role: "user",
      content: `
We are discussing this question:

${question}

The initial answer from another isolated chat was:

${initialAnswer}

Now continue naturally.
`,
    },
  ];

  const intro = await callModel({
    messages: chatB,
    model,
    clientType: "exposure",
  });

  chatB.push({
    role: "assistant",
    content: intro,
  });

  const exposureConversation = [
    {
      iteration: 0,
      user: chatB[0].content,
      assistant: intro,
    },
  ];

  return {
    chatB,
    generatedStatements,
    promotionDatabasePath,
    fullConversation: exposureConversation,
  };
}

async function runPromotionRounds({ chatB, generatedStatements, model }) {
  const exposureConversation = [];

  for (let i = 0; i < generatedStatements.length; i++) {
    const statement = generatedStatements[i];

    chatB.push({
      role: "user",
      content: statement,
    });

    const response = await callModel({
      messages: chatB,
      model,
      clientType: "exposure",
    });

    chatB.push({
      role: "assistant",
      content: response,
    });

    exposureConversation.push({
      iteration: i + 1,
      user: statement,
      assistant: response,
    });
  }

  return {
    chatB,
    exposureConversation,
  };
}

module.exports = {
  generatePromotionStatements,
  prepareExposureChat,
  runPromotionRounds,
};
