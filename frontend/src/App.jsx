import {
  useState,
  useRef,
} from "react";

import axios from "axios";

import "./App.css";

function App() {
  // Question input
  const [question, setQuestion] =
    useState("");

  // Target product/brand
  const [target, setTarget] =
    useState("");

  // Top-N ranking range
  const [topN, setTopN] =
    useState(5);

  // Simulated user count
  const [iterations, setIterations] =
    useState(100);

  // Experiment runs
  const [runs, setRuns] =
    useState(1);

  // Selected model
  const [model, setModel] =
    useState("gpt-4.1-mini");

  // Final backend result
  const [result, setResult] =
    useState(null);

  // Loading state
  const [loading, setLoading] =
    useState(false);

  // Frontend timer
  const [elapsedTime, setElapsedTime] =
    useState("0.0");

  // Realtime progress state
  const [progress, setProgress] =
    useState({
      phase: "Idle",
      completed: 0,
      total: 0,
      percentage: 0,
    });

  // Timer refs
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
        (
          (Date.now() - start) /
          1000
        ).toFixed(1),
      );
    }, 100);
  };

  /**
   * Stop timers.
   */
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(
        timerRef.current,
      );

      timerRef.current = null;
    }

    if (progressRef.current) {
      clearInterval(
        progressRef.current,
      );

      progressRef.current = null;
    }
  };

  /**
   * Main experiment pipeline.
   */
  const runExperiment =
    async () => {
      setLoading(true);

      setResult(null);

      setProgress({
        phase: "Preparing",
        completed: 0,
        total: Number(iterations),
        percentage: 0,
      });

      try {
        const prepared =
          await axios.post(
            "https://llm-search-optimizer-backend.onrender.com/prepare-experiment",
            {
              question,
              target,
              topN: Number(topN),
              iterations:
                Number(iterations),
              runs: Number(runs),
              model,
            },
          );

        const sessionId =
          prepared.data.sessionId;

        console.log(
          "SESSION ID:",
          sessionId,
        );

        /**
         * Start realtime polling
         */
        progressRef.current =
          setInterval(
            async () => {
              try {
                const progressRes =
                  await axios.get(
                    `https://llm-search-optimizer-backend.onrender.com/experiment-progress/${sessionId}`,
                  );

                console.log(
                  "LIVE PROGRESS:",
                  progressRes.data,
                );

                setProgress(
                  progressRes.data,
                );
                if (
                  progressRes.data.phase ===
                    "Running Exposure Sessions" &&
                  !timerRef.current
                ) {
                  console.log(
                    "Exposure phase detected. Starting timer.",
                  );
                  startTimer();
                }
              } catch (err) {
                console.error(
                  "Polling error:",
                  err,
                );
              }
            },
            300,
          );

        const exposurePromise =
          axios.post(
            "https://llm-search-optimizer-backend.onrender.com/run-exposure",
            {
              sessionId,
            },
          );

        await exposurePromise;

        const finalResult =
          await axios.post(
            "https://llm-search-optimizer-backend.onrender.com/finish-experiment",
            {
              sessionId,
            },
          );

        console.log(
          "FINAL RESULT:",
          finalResult.data,
        );

        setResult(
          finalResult.data,
        );

        /**
        * Auto-download experiment files
        */
        const files =
          finalResult.data
            .downloadableFiles;

        const downloadFile = (
          content,
          filename,
          type,
        ) => {
          const blob = new Blob(
            [content],
            { type },
          );

          const url =
            URL.createObjectURL(blob);

          const a =
            document.createElement("a");

          a.href = url;

          a.download = filename;

          a.click();

          URL.revokeObjectURL(url);
        };

        const timestamp =
          Date.now();

        /**
        * Download full JSON
        */
        downloadFile(
          files.fullJson,
          `experiment-${timestamp}.json`,
          "application/json",
        );

        /**
        * Download summary CSV
         */
        downloadFile(
          files.summaryCsv,
          `experiment-summary-${timestamp}.csv`,
          "text/csv",
        );

        /**
        * Download sessions CSV
        */
        downloadFile(
          files.sessionsCsv,
          `experiment-sessions-${timestamp}.csv`,
          "text/csv",
        );
        
        stopTimer();

        setProgress({
          phase: "Completed",
          completed:
            Number(iterations),
          total:
            Number(iterations),
          percentage: 100,
        });

      } catch (err) {
        stopTimer();

        console.error(err);

        alert(
          "Error running experiment",
        );
      }

      setLoading(false);
    };

  return (
    <div className="app-container">
      <h1>
        LLM Search Optimizer
      </h1>

      {/* STATUS PANEL */}

      <div className="status-panel">
        <p>
          <b>Status:</b>{" "}
          {progress.phase}
        </p>

        <div className="progress-bar-background">
          <div
            className="progress-bar-fill"
            style={{
              width: `${progress.percentage}%`,
            }}
          />
        </div>

        <p>
          <b>
            Live Exposure Timer:
          </b>{" "}
          {elapsedTime}s
        </p>

        <div className="realtime-progress">
          <div className="progress-row">
            <span>
              Phase
            </span>

            <span>
              {progress.phase}
            </span>
          </div>

          <div className="progress-row">
            <span>
              Progress
            </span>

            <span>
              {
                progress.completed
              }{" "}
              / {progress.total}
            </span>
          </div>

          <div className="progress-row">
            <span>
              Completion
            </span>

            <span>
              {
                progress.percentage
              }
              %
            </span>
          </div>
        </div>
      </div>

      {/* INPUTS */}

      <div className="input-section">
        <textarea
          placeholder="Enter the recommendation question..."
          value={question}
          onChange={(e) =>
            setQuestion(
              e.target.value,
            )
          }
          rows={3}
        />

        <textarea
          placeholder="Enter target brand/product..."
          value={target}
          onChange={(e) =>
            setTarget(
              e.target.value,
            )
          }
          rows={2}
        />

        <div className="controls-row">
          <label>
            Top-N:
            <input
              type="number"
              value={topN}
              onChange={(e) =>
                setTopN(
                  e.target.value,
                )
              }
            />
          </label>

          <label>
            Simulated Users:
            <input
              type="number"
              value={
                iterations
              }
              onChange={(e) =>
                setIterations(
                  e.target.value,
                )
              }
            />
          </label>

          <label>
            Runs:
            <input
              type="number"
              value={runs}
              onChange={(e) =>
                setRuns(
                  e.target.value,
                )
              }
            />
          </label>

          <label>
            Model:
            <select
              value={model}
              onChange={(e) =>
                setModel(
                  e.target.value,
                )
              }
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
            onClick={
              runExperiment
            }
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
        <div className="results-panel">
          <h2>
            Experiment Results
          </h2>

          <p>
            <b>
              Promotion Success
              Rate:
            </b>{" "}
            {(
              result.promotionSuccessRate *
              100
            ).toFixed(1)}
            %
          </p>

          <p>
            <b>
              Mention Rate:
            </b>{" "}
            {(
              result.mentionRate *
              100
            ).toFixed(1)}
            %
          </p>

          <p>
            <b>
              Top-N Hit Rate:
            </b>{" "}
            {(
              result.topNHitRate *
              100
            ).toFixed(1)}
            %
          </p>

          <p>
            <b>
              Position Improve
              Rate:
            </b>{" "}
            {(
              result.positionImproveRate *
              100
            ).toFixed(1)}
            %
          </p>

          <hr />

            <div className="answer-comparison">
              <div className="answer-box">
                <h3>Initial Answer</h3>

                <pre>
                  {
                    result.allRuns?.[0]
                      ?.chatA
                      ?.initialAnswer
                  }
                </pre>
              </div>

              <div className="answer-box">
                <h3>Final Answer</h3>

                <pre>
                  {
                    result.allRuns?.[0]
                      ?.chatA
                      ?.finalAnswer
                  }
                </pre>
              </div>
            </div>
          <hr />

          <h3>
            Exposure Sessions
          </h3>

          <details>
            <summary>
              View Simulated User
              Conversations
            </summary>

            <div
              style={{
                marginTop:
                  "15px",
              }}
            >
              {result.allRuns?.[0]?.exposurePopulation?.sessions?.map(
                (
                  session,
                  index,
                ) => (
                  <div
                    key={index}
                    style={{
                      background:
                        "#333",
                      color:
                        "white",
                      padding:
                        "12px",
                      marginBottom:
                        "12px",
                      borderRadius:
                        "8px",
                    }}
                  >
                    <p>
                      <b>
                        Session #
                        {
                          session.iteration
                        }
                      </b>
                    </p>

                    <p>
                      <b>
                        Promotion:
                      </b>{" "}
                      {
                        session.promotionStatement
                      }
                    </p>

                    <p>
                      <b>
                        AI
                        Response:
                      </b>{" "}
                      {
                        session.firstResponse
                      }
                    </p>

                    <p>
                      <b>
                        Accepted:
                      </b>{" "}
                      {session.accepted
                        ? "Yes"
                        : "No"}
                    </p>

                    <p>
                      <b>
                        Reinforcement:
                      </b>{" "}
                      {
                        session.reinforcementRequest
                      }
                    </p>

                    <p>
                      <b>
                        Final
                        Response:
                      </b>{" "}
                      {
                        session.reinforcementResponse
                      }
                    </p>
                  </div>
                ),
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default App;