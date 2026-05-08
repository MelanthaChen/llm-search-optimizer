import { useState, useRef } from "react";
import axios from "axios";

function App() {
  const [question, setQuestion] = useState("");
  const [target, setTarget] = useState("");
  const [category, setCategory] = useState("ranking");
  const [topN, setTopN] = useState(5);

  const [iterations, setIterations] = useState(3);
  const [runs, setRuns] = useState(5);
  const [model, setModel] = useState("gpt-4.1-mini");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("Idle");
  const [showChatB, setShowChatB] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("0.0");

  const timerRef = useRef(null);

  const startTimer = () => {
    const start = Date.now();
    setElapsedTime("0.0");

    timerRef.current = setInterval(() => {
      setElapsedTime(((Date.now() - start) / 1000).toFixed(1));
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const runExperiment = async () => {
    setLoading(true);
    setResult(null);
    setShowChatB(false);
    setElapsedTime("0.0");

    try {
      setPhase("Preparing Chat A initial answer and promotion database...");

      const prepared = await axios.post("http://localhost:3001/prepare-experiment", {
        question,
        target,
        category,
        topN: Number(topN),
        iterations: Number(iterations),
        runs: Number(runs),
        model,
      });

      const sessionId = prepared.data.sessionId;

      setPhase("Running exposure rounds...");
      startTimer();

      await axios.post("http://localhost:3001/run-exposure", {
        sessionId,
      });

      stopTimer();

      setPhase("Asking final question and evaluating results...");

      const finalResult = await axios.post("http://localhost:3001/finish-experiment", {
        sessionId,
      });

      setResult(finalResult.data);
      setPhase("Done");
    } catch (err) {
      stopTimer();
      console.error(err);
      alert("Error running experiment");
      setPhase("Error");
    }

    setLoading(false);
  };

  const firstRun = result?.allRuns?.[0];

  const initialAnswer = firstRun?.chatA?.initialAnswer;
  const finalAnswer = firstRun?.chatA?.finalAnswer;
  const chatBConversation = firstRun?.chatB?.fullConversation || [];

  const backendExposureSeconds =
    result?.exposureTiming?.exposureDurationMs !== undefined
      ? (result.exposureTiming.exposureDurationMs / 1000).toFixed(2)
      : null;

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "auto",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h1>LLM Search Optimizer</h1>

      <div
        style={{
          background: loading ? "#fff7e6" : "#f5f5f5",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "20px",
          border: loading ? "1px solid #f0c36d" : "1px solid #ddd",
        }}
      >
        <p>
          <b>Status:</b> {phase}
        </p>
        <p>
          <b>Live Exposure Timer:</b> {elapsedTime}s
        </p>
        {backendExposureSeconds && (
          <p>
            <b>Backend Exposure Time:</b> {backendExposureSeconds} seconds
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <textarea
          placeholder="Enter the question Q..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
        />

        <textarea
          placeholder="Enter target to promote, e.g. Google Pixel"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          rows={3}
        />

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <label>
            Category:
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ marginLeft: "5px" }}
            >
              <option value="ranking">Ranking / Recommendation</option>
              <option value="stance">Stance / Opinion</option>
              <option value="factual">Factual / Correctness</option>
            </select>
          </label>

          {category === "ranking" && (
            <label>
              Top-N:
              <select
                value={topN}
                onChange={(e) => setTopN(e.target.value)}
                style={{ marginLeft: "5px" }}
              >
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
            </label>
          )}

          <label>
            Promotion:
            <input
              type="number"
              min="1"
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
              style={{ width: "90px", marginLeft: "5px" }}
            />
          </label>

          <label>
            Runs:
            <input
              type="number"
              min="1"
              value={runs}
              onChange={(e) => setRuns(e.target.value)}
              style={{ width: "80px", marginLeft: "5px" }}
            />
          </label>

          <label>
            Model:
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ marginLeft: "5px" }}
            >
              <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
              <option value="gpt-4.1">GPT-4.1</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </select>
          </label>

          <button onClick={runExperiment} disabled={loading}>
            {loading ? "Running..." : "Run Experiment"}
          </button>
        </div>
      </div>

      {result && (
        <div>
          <div
            style={{
              background: "#eef",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "20px",
            }}
          >
            <h3>Summary Metrics</h3>

            <p>
              <b>Model:</b> {result.model}
            </p>

            <p>
              <b>Category:</b> {result.category}
            </p>

            {result.category === "ranking" && (
              <p>
                <b>Top-N:</b> {result.topN}
              </p>
            )}

            <p>
              <b>Runs:</b> {result.runs}
            </p>

            <p>
              <b>Promotion Count:</b> {result.iterations}
            </p>

            <p>
              <b>Promotion Success Rate:</b>{" "}
              {(result.promotionSuccessRate * 100).toFixed(2)}%
            </p>

            <p>
              <b>Mention Rate:</b>{" "}
              {(result.mentionRate * 100).toFixed(2)}%
            </p>

            {result.positionImproveRate !== undefined && (
              <p>
                <b>Position Improve Rate:</b>{" "}
                {(result.positionImproveRate * 100).toFixed(2)}%
              </p>
            )}

            {result.topNHitRate !== undefined && (
              <p>
                <b>Top-N Hit Rate:</b>{" "}
                {(result.topNHitRate * 100).toFixed(2)}%
              </p>
            )}

            {result.stanceShiftRate !== undefined && (
              <p>
                <b>Stance Shift Rate:</b>{" "}
                {(result.stanceShiftRate * 100).toFixed(2)}%
              </p>
            )}

            {result.correctnessChangeRate !== undefined && (
              <p>
                <b>Correctness Change Rate:</b>{" "}
                {(result.correctnessChangeRate * 100).toFixed(2)}%
              </p>
            )}

            {result.savedPaths && (
              <p>
                <b>Saved JSON Log:</b> {result.savedPaths.jsonPath}
                <br />
                <b>Saved CSV:</b> {result.savedPaths.csvPath}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "20px" }}>
            <div
              style={{
                flex: 1,
                background: "#f0fff0",
                padding: "15px",
                borderRadius: "8px",
              }}
            >
              <h3>Chat A Initial Answer</h3>
              <pre style={{ whiteSpace: "pre-wrap" }}>{initialAnswer}</pre>
            </div>

            <div
              style={{
                flex: 1,
                background: "#fff0f0",
                padding: "15px",
                borderRadius: "8px",
              }}
            >
              <h3>Chat A Final Answer</h3>
              <pre style={{ whiteSpace: "pre-wrap" }}>{finalAnswer}</pre>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <button onClick={() => setShowChatB(!showChatB)}>
              {showChatB
                ? "Hide Chat B Exposure ▲"
                : `Show Chat B Exposure (${chatBConversation.length}) ▼`}
            </button>

            {showChatB && (
              <div style={{ marginTop: "10px" }}>
                {chatBConversation.map((step, index) => (
                  <div
                    key={index}
                    style={{
                      background: "#fafafa",
                      padding: "10px",
                      marginBottom: "10px",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                    }}
                  >
                    <strong>
                      {step.iteration === 0
                        ? "Chat B Initialization"
                        : `Exposure Iteration ${step.iteration}`}
                    </strong>

                    <p>
                      <b>User / Generated Exposure:</b>
                    </p>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{step.user}</pre>

                    <p>
                      <b>Assistant:</b>
                    </p>
                    <pre style={{ whiteSpace: "pre-wrap" }}>
                      {step.assistant}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: "25px" }}>
            <h3>All Runs</h3>

            <table
              border="1"
              cellPadding="8"
              style={{
                borderCollapse: "collapse",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Promotion Succeeded?</th>
                  <th>Target In Initial?</th>
                  <th>Target In Final?</th>

                  {category === "ranking" && (
                    <>
                      <th>Initial Rank</th>
                      <th>Final Rank</th>
                      <th>Rank Delta</th>
                      <th>Position Improved?</th>
                      <th>Appears In Top-N?</th>
                    </>
                  )}

                  {category === "stance" && (
                    <>
                      <th>Initial Stance</th>
                      <th>Final Stance</th>
                      <th>Shifted Toward Target?</th>
                    </>
                  )}

                  {category === "factual" && (
                    <>
                      <th>Answer Changed?</th>
                      <th>Initial Correct?</th>
                      <th>Final Correct?</th>
                      <th>Correctness Changed?</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {result.allRuns?.map((run) => (
                  <tr key={run.runId}>
                    <td>{run.runId}</td>

                    <td>
                      {run.metrics.promotionSucceeded ? "Yes" : "No"}
                    </td>

                    <td>{run.metrics.targetInInitial ? "Yes" : "No"}</td>

                    <td>{run.metrics.targetInFinal ? "Yes" : "No"}</td>

                    {category === "ranking" && (
                      <>
                        <td>{run.metrics.targetInitialPosition ?? "N/A"}</td>
                        <td>{run.metrics.targetFinalPosition ?? "N/A"}</td>
                        <td>{run.metrics.rankDelta ?? "N/A"}</td>
                        <td>
                          {run.metrics.targetPositionImproved ? "Yes" : "No"}
                        </td>
                        <td>{run.metrics.appearsInTopN ? "Yes" : "No"}</td>
                      </>
                    )}

                    {category === "stance" && (
                      <>
                        <td>{run.metrics.initialStance || "N/A"}</td>
                        <td>{run.metrics.finalStance || "N/A"}</td>
                        <td>
                          {run.metrics.stanceShiftedTowardTarget
                            ? "Yes"
                            : "No"}
                        </td>
                      </>
                    )}

                    {category === "factual" && (
                      <>
                        <td>{run.metrics.answerChanged ? "Yes" : "No"}</td>
                        <td>
                          {run.metrics.initialCorrect === null
                            ? "N/A"
                            : run.metrics.initialCorrect
                            ? "Yes"
                            : "No"}
                        </td>
                        <td>
                          {run.metrics.finalCorrect === null
                            ? "N/A"
                            : run.metrics.finalCorrect
                            ? "Yes"
                            : "No"}
                        </td>
                        <td>
                          {run.metrics.correctnessChanged === null
                            ? "N/A"
                            : run.metrics.correctnessChanged
                            ? "Yes"
                            : "No"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;