const fs = require("fs");
const path = require("path");

const { buildExperimentCsv } = require("./csv");

/**
 * Creates a directory if it does not exist.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Saves full JSON logs and compact CSV summaries separately.
 */
function saveExperiment(result) {
  const baseDir = path.join(__dirname, "..", "logs");
  const jsonDir = path.join(baseDir, "json");
  const csvDir = path.join(baseDir, "csv");

  ensureDir(jsonDir);
  ensureDir(csvDir);

  const timestamp = Date.now();

  const jsonPath = path.join(jsonDir, `exp-${timestamp}.json`);
  const csvPath = path.join(csvDir, `exp-${timestamp}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  const csvContent = buildExperimentCsv(result);
  fs.writeFileSync(csvPath, csvContent);

  return {
    jsonPath,
    csvPath,
  };
}

module.exports = {
  saveExperiment,
};
