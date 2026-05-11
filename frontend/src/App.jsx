import {
  useState,
  useRef,
} from "react";

import axios from "axios";

function App() {
  const [question, setQuestion] = useState("");
  const [target, setTarget] = useState("");
  const [topN, setTopN] = useState(5);

  const [iterations, setIterations] = useState(100);
  const [runs, setRuns] = useState(1);

  const [model, setModel] = useState("gpt-4.1-mini");

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [phase, setPhase] = useState("Idle");

  const [showExposure, setShowExposure] =
    useState(false);

  const [elapsedTime, setElapsedTime] =
    useState("0.0");

  const [progress, setProgress] =useState({
    phase: "Idle",

    completed: 0,

    total: 0,

    percentage: 0,
  });

  const timerRef = useRef(null);

  const progressRef = useRef(null);

  /**
   * Start frontend timer.
   */
  const startTimer = () => {
    const start = Date.now();

    setElapsedTime("0.0");

    timerRef.current = setInterval(() => {
      setElapsedTime(
        ((Date.now() - start) / 1000).toFixed(1),
      );
    }, 100);
  };

  /**
   * Stop frontend timer.
   */
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);

      timerRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);

      progressRef.current = null;
    }
  };

  /**
   * Full experiment pipeline.
   */
  const runExperiment = async () => {
    setLoading(true);

    setResult(null);

    setShowExposure(false);

    setElapsedTime("0.0");

    try {
      /**
       * Step 1:
       * Prepare experiment.
       */
      setPhase(
        "Preparing baseline recommendation and exposure population...",
      );

      const prepared = await axios.post(
        "https://llm-search-optimizer-backend.onrender.com/prepare-experiment",
        {
          question,

          target,

          topN: Number(topN),

          iterations: Number(iterations),

          runs: Number(runs),

          model,
        },
      );

      const sessionId = prepared.data.sessionId;

      /**
      * Start live progress polling.
      */
      progressRef.current = setInterval(async () => {
        try {
          const progressRes = await axios.get(
            `https://llm-search-optimizer-backend.onrender.com/experiment-progress/${sessionId}`,
          );
          setProgress(progressRes.data);
        } catch (err) {
          console.error(err);
        }
      }, 1000);

      /**
       * Step 2:
       * Run exposure population.
       */
      setPhase(
        "Running simulated user exposure sessions...",
      );

      startTimer();

      await axios.post(
        "https://llm-search-optimizer-backend.onrender.com/run-exposure",
        {
          sessionId,
        },
      );

      stopTimer();

      /**
       * Step 3:
       * Ask final recommendation question.
       */
      setPhase(
        "Evaluating final recommendation drift...",
      );

      const finalResult = await axios.post(
        "https://llm-search-optimizer-backend.onrender.com/finish-experiment",
        {
          sessionId,
        },
      );

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

  /**
   * First run display.
   */
  const firstRun = result?.allRuns?.[0];

  const initialAnswer =
    firstRun?.chatA?.initialAnswer;

  const finalAnswer =
    firstRun?.chatA?.finalAnswer;

  /**
   * Exposure sessions.
   */
  const exposureSessions =
    firstRun?.exposurePopulation?.sessions || [];

  /**
   * Backend timing.
   */
  const backendExposureSeconds =
    result?.exposureTiming?.exposureDurationMs !==
    undefined
      ? (
          result.exposureTiming.exposureDurationMs /
          1000
        ).toFixed(2)
      : null;

  return (
    <div
      style={{
        maxWidth: "1200px",

        margin: "auto",

        padding: "20px",

        fontFamily: "Arial",
      }}
    >
      <h1>
        LLM Search Optimizer 
      </h1>

      {/* STATUS PANEL */}

      <div
        style={{
          background: loading
            ? "#fff7e6"
            : "#f5f5f5",

          padding: "12px",

          borderRadius: "6px",

          marginBottom: "20px",

          border: loading
            ? "1px solid #f0c36d"
            : "1px solid #ddd",
        }}
      >
        <p>
          <b>Status:</b> {phase}
        </p>

        <p>
          <b>Current Phase:</b>{" "}
          {progress.phase}
        </p>

        <p>
          <b>Progress:</b>{" "}
          {progress.completed} /
          {progress.total}
        </p>

        <p>
          <b>Completion:</b>{" "}
          {progress.percentage}%
        </p>

        <div
          style={{
            width: "100%",
            height: "20px",
            background: "#ddd",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress.percentage}%`,
              height: "100%",
              background: "#4caf50",
              transition: "0.3s",
            }}
          />
        </div>

        <p>
          <b>Live Exposure Timer:</b>{" "}
          {elapsedTime}s
        </p>

        {backendExposureSeconds && (
          <p>
            <b>Backend Exposure Time:</b>{" "}
            {backendExposureSeconds} seconds
          </p>
        )}
      </div>

      {/* INPUTS */}

      <div
        style={{
          display: "flex",

          flexDirection: "column",

          gap: "10px",

          marginBottom: "20px",
        }}
      >
        <textarea
          placeholder="Enter the recommendation question..."
          value={question}
          onChange={(e) =>
            setQuestion(e.target.value)
          }
          rows={3}
        />

        <textarea
          placeholder="Enter target brand/product..."
          value={target}
          onChange={(e) =>
            setTarget(e.target.value)
          }
          rows={2}
        />

        <div
          style={{
            display: "flex",

            gap: "10px",

            flexWrap: "wrap",
          }}
        >
          <label>
            Top-N:
            <input
              type="number"
              min="1"
              value={topN}
              onChange={(e) =>
                setTopN(e.target.value)
              }
              style={{
                width: "70px",

                marginLeft: "5px",
              }}
            />
          </label>

          <label>
            Simulated Users:
            <input
              type="number"
              min="1"
              value={iterations}
              onChange={(e) =>
                setIterations(e.target.value)
              }
              style={{
                width: "90px",

                marginLeft: "5px",
              }}
            />
          </label>

          <label>
            Runs:
            <input
              type="number"
              min="1"
              value={runs}
              onChange={(e) =>
                setRuns(e.target.value)
              }
              style={{
                width: "80px",

                marginLeft: "5px",
              }}
            />
          </label>

          <label>
            Model:
            <select
              value={model}
              onChange={(e) =>
                setModel(e.target.value)
              }
              style={{
                marginLeft: "5px",
              }}
            >
              <option value="gpt-4.1-mini">
                GPT-4.1 Mini
              </option>

              <option value="gpt-4.1">
                GPT-4.1
              </option>

              <option value="gpt-4o-mini">
                GPT-4o Mini
              </option>
            </select>
          </label>

          <button
            onClick={runExperiment}
            disabled={loading}
          >
            {loading
              ? "Running..."
              : "Run Experiment"}
          </button>
        </div>
      </div>

      {/* RESULTS */}

      {result && (
        <div>
          {/* SUMMARY */}

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
              <b>Runs:</b> {result.runs}
            </p>

            <p>
              <b>Simulated Users:</b>{" "}
              {result.iterations}
            </p>

            <p>
              <b>Promotion Success Rate:</b>{" "}
              {(
                result.promotionSuccessRate * 100
              ).toFixed(2)}
              %
            </p>

            <p>
              <b>Mention Rate:</b>{" "}
              {(
                result.mentionRate * 100
              ).toFixed(2)}
              %
            </p>

            <p>
              <b>Position Improve Rate:</b>{" "}
              {(
                result.positionImproveRate *
                100
              ).toFixed(2)}
              %
            </p>

            <p>
              <b>Top-N Hit Rate:</b>{" "}
              {(
                result.topNHitRate * 100  
              ).toFixed(2)}
              %
            </p>

            <p>
              <b>Acceptance Rate:</b>{" "}
              {(
                result.acceptedExposureRate * 100
                ).toFixed(2)}%
            </p>

            {result.savedPaths && (
              <p>
                <b>Saved JSON:</b>{" "}
                {result.savedPaths.jsonPath}

                <br />

                <b>Saved CSV:</b>{" "}
                {result.savedPaths.csvPath}
              </p>
            )}
          </div>

          {/* CHAT A */}

          <div
            style={{
              display: "flex",

              gap: "20px",
            }}
          >
            <div
              style={{
                flex: 1,

                background: "#f0fff0",

                padding: "15px",

                borderRadius: "8px",
              }}
            >
              <h3>Initial Recommendation</h3>

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                }}
              >
                {initialAnswer}
              </pre>
            </div>

            <div
              style={{
                flex: 1,

                background: "#fff0f0",

                padding: "15px",

                borderRadius: "8px",
              }}
            >
              <h3>Final Recommendation</h3>

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                }}
              >
                {finalAnswer}
              </pre>
            </div>
          </div>

          {/* EXPOSURE POPULATION */}

          <div style={{ marginTop: "25px" }}>
            <button
              onClick={() =>
                setShowExposure(!showExposure)
              }
            >
              {showExposure
                ? "Hide Exposure Population ▲"
                : `Show Exposure Population (${exposureSessions.length}) ▼`}
            </button>

            {showExposure && (
              <div
                style={{
                  marginTop: "15px",
                }}
              >
                {exposureSessions.map(
                  (session, index) => (
                    <div
                      key={index}
                      style={{
                        background: "#fafafa",

                        padding: "12px",

                        marginBottom: "15px",

                        borderRadius: "6px",

                        border:
                          "1px solid #ddd",
                      }}
                    >
                      <strong>
                        Simulated User Session{" "}
                        {session.iteration}
                      </strong>

                      <p>
                        <b>
                          User Promotion:
                        </b>
                      </p>

                      <pre
                        style={{
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        {
                          session.promotionStatement
                        }
                      </pre>

                      <p>
                        <b>
                          AI Response:
                        </b>
                      </p>

                      <pre
                        style={{
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        {
                          session.firstResponse
                        }
                      </pre>

                      <p>
                        <b>
                          Accepted?
                        </b>{" "}
                        {session.accepted
                          ? "Yes"
                          : "No"}
                      </p>

                      {session.accepted && (
                        <>
                          <p>
                            <b>
                              Reinforcement
                              Request:
                            </b>
                          </p>

                          <pre
                            style={{
                              whiteSpace:
                                "pre-wrap",
                            }}
                          >
                            {
                              session.reinforcementRequest
                            }
                          </pre>

                          <p>
                            <b>
                              Reinforcement
                              Response:
                            </b>
                          </p>

                          <pre
                            style={{
                              whiteSpace:
                                "pre-wrap",
                            }}
                          >
                            {
                              session.reinforcementResponse
                            }
                          </pre>
                        </>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* RUN TABLE */}

          <div style={{ marginTop: "30px" }}>
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

                  <th>
                    Promotion
                    Succeeded
                  </th>

                  <th>
                    Target In Initial
                  </th>

                  <th>
                    Target In Final
                  </th>

                  <th>
                    Initial Position
                  </th>

                  <th>
                    Final Position
                  </th>

                  <th>Rank Delta</th>
                </tr>
              </thead>

              <tbody>
                {result.allRuns?.map((run) => (
                  <tr key={run.runId}>
                    <td>{run.runId}</td>

                    <td>
                      {run.metrics
                        .promotionSucceeded
                        ? "Yes"
                        : "No"}
                    </td>

                    <td>
                      {run.metrics
                        .targetInInitial
                        ? "Yes"
                        : "No"}
                    </td>

                    <td>
                      {run.metrics
                        .targetInFinal
                        ? "Yes"
                        : "No"}
                    </td>

                    <td>
                      {
                        run.metrics
                          .targetInitialPosition
                      }
                    </td>

                    <td>
                      {
                        run.metrics
                          .targetFinalPosition
                      }
                    </td>

                    <td>
                      {
                        run.metrics.rankDelta
                      }
                    </td>
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
