const preparedSessions = new Map();

function updateExperimentProgress(sessionId, phase, completed, total) {
  const session = preparedSessions.get(sessionId);

  if (!session) return;

  session.progress = {
    phase,
    completed,
    total,
    percentage: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
  };

  preparedSessions.set(sessionId, session);
}

module.exports = {
  preparedSessions,
  updateExperimentProgress,
};
