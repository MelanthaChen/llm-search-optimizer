const fs = require("fs");

const path = require("path");

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
 * Save generated promotion statements.
 *
 * This acts as a local synthetic
 * exposure database.
 */
function savePromotionDatabase({
  question,

  target,

  count,

  statements,
}) {
  const dbDir = path.join(__dirname, "..", "data", "promotions");

  ensureDir(dbDir);

  const timestamp = Date.now();

  const filepath = path.join(dbDir, `promotion-db-${timestamp}.json`);

  /**
   * Database structure.
   */
  const data = {
    id: `promotion-db-${timestamp}`,

    question,

    target,

    count,

    createdAt: new Date().toISOString(),

    statements,
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");

  return filepath;
}

module.exports = {
  savePromotionDatabase,
};
