const fs = require("fs");

const path = require("path");

const {
  buildExperimentCsv,

  buildExposureSessionsCsv,
} = require("./csv");

/**
 * Ensure directory exists.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
}

/**
 * Save:
 * - full JSON logs
 * - compact CSV summary
 * - detailed exposure sessions CSV
 */
function saveExperiment(result) {
  const baseDir = path.join(__dirname, "..", "logs");

  const jsonDir = path.join(baseDir, "json");

  const csvDir = path.join(baseDir, "csv");

  ensureDir(jsonDir);

  ensureDir(csvDir);

  const timestamp = Date.now();

  /**
   * Output paths.
   */
  const jsonPath = path.join(jsonDir, `exp-${timestamp}.json`);

  const csvPath = path.join(csvDir, `exp-${timestamp}.csv`);

  const sessionsCsvPath = path.join(csvDir, `exp-${timestamp}-sessions.csv`);

  /**
   * Save full JSON logs.
   */
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  /**
   * Save summary CSV.
   */
  const csvContent = buildExperimentCsv(result);

  fs.writeFileSync(csvPath, csvContent);

  /**
   * Save detailed session CSV.
   */
  const sessionsCsvContent = buildExposureSessionsCsv(result);

  fs.writeFileSync(sessionsCsvPath, sessionsCsvContent);

  return {
    jsonPath,
    csvPath,
    sessionsCsvPath,

    fullJson: JSON.stringify(result, null, 2),

    summaryCsv: csvContent,

    sessionsCsv: sessionsCsvContent,
  };
}

module.exports = {
  saveExperiment,
};
