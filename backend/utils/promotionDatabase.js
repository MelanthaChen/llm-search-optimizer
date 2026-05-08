const fs = require("fs");
const path = require("path");

/**
 * Make sure a folder exists.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save generated promotion statements into a JSON file.
 * This acts like a simple local promotion database.
 */
function savePromotionDatabase({
  question,
  target,
  category,
  count,
  statements,
}) {
  const dbDir = path.join(__dirname, "..", "data", "promotions");

  ensureDir(dbDir);

  const timestamp = Date.now();

  const filepath = path.join(dbDir, `promotion-db-${timestamp}.json`);

  const data = {
    id: `promotion-db-${timestamp}`,
    question,
    target,
    category,
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
