require("dotenv").config();
const express = require("express");
const cors = require("cors");

const {
  prepareExperiment,
  runExposureOnly,
  finishExperiment,
} = require("./services/experiment.service");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/prepare-experiment", async (req, res) => {
  try {
    const result = await prepareExperiment(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post("/run-exposure", async (req, res) => {
  try {
    const result = await runExposureOnly(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post("/finish-experiment", async (req, res) => {
  try {
    const result = await finishExperiment(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log("LLM Search Optimizer running on http://localhost:3001");
});
