const OpenAI = require("openai");

const baselineClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_A,
});

const exposureClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_B,
});

/**
 * Calls the selected LLM with a message history.
 *
 * clientType:
 * - "baseline"  -> Chat A, initial and final answers, uses Key A
 * - "exposure"  -> Chat B, promotion simulation, uses Key B
 * - "evaluator" -> Chat C, result analysis, also uses Key B
 */
async function callModel({
  messages,
  model = "gpt-4.1-mini",
  clientType = "baseline",
}) {
  let client;

  if (clientType === "baseline") {
    client = baselineClient;
  } else {
    client = exposureClient;
  }

  const res = await client.responses.create({
    model,
    input: messages,
  });

  return res.output_text;
}

module.exports = {
  callModel,
};
