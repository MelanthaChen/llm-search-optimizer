import {
  useState,
  useRef,
} from "react";

import axios from "axios";

import "./App.css";

function App() {
  // Question input
  const [question, setQuestion] = useState("");

  // Target product/brand
  const [target, setTarget] = useState("");

  // Top-N ranking range
  const [topN, setTopN] = useState(5);

  // Simulated user count
  const [iterations, setIterations] =
    useState(100);

  // Experiment runs
  const [runs, setRuns] = useState(1);

  // Selected model
  const [model, setModel] =
    useState("gpt-4.1-mini");

  // Final backend result
  const [result, setResult] =
    useState(null);

  // Loading state
  const [loading, setLoading] =
    useState(false);

  // Current experiment phase
  const [phase, setPhase] =
    useState("Idle");

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
        ((Date.now() - start) / 1000).toFixed(1),
      );
    }, 100);
  };

  /**
   * Stop timers.
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
   * Main experiment pipeline.
   */
  const runExperiment = async () => {
    setLoading(true);

    setResult(null);

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

      const sessionId =
        prepared.data.sessionId;

      /**
       * Start realtime polling.
       */
      progressRef.current =
        setInterval(async () => {
          try {
            const progressRes =
              await axios.get(
                `https://llm-search-optimizer-backend.onrender.com/experiment-progress/${sessionId}`,
              );

            console.log(
              "LIVE PROGRESS:",
              progressRes.data,
            );

            setProgress(progressRes.data);
          } catch (err) {
            console.error(err);
          }
        }, 1000);

      /**
       * Step 2:
       * Run exposure simulation.
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
       * Final evaluation.
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

  return (
    <div className="app-container">
      <h1>LLM Search Optimizer</h1>

      {/* STATUS PANEL */}

      <div className="status-panel">
        <p>
          <b>Status:</b> {phase}
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
          <b>Live Exposure Timer:</b>{" "}
          {elapsedTime}s
        </p>

        {/* HARDCODED REALTIME DEBUG BLOCK */}

        <div className="realtime-progress">
          <div className="progress-row">
            <span>Phase</span>

            <span>{progress.phase}</span>
          </div>

          <div className="progress-row">
            <span>Progress</span>

            <span>
              {progress.completed} / {progress.total}
            </span>
          </div>

          <div className="progress-row">
            <span>Completion</span>

            <span>{progress.percentage}%</span>
          </div>
        </div>
      </div>

      {/* INPUTS */}

      <div className="input-section">
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

        <div className="controls-row">
          <label>
            Top-N:
            <input
              type="number"
              value={topN}
              onChange={(e) =>
                setTopN(e.target.value)
              }
            />
          </label>

          <label>
            Simulated Users:
            <input
              type="number"
              value={iterations}
              onChange={(e) =>
                setIterations(e.target.value)
              }
            />
          </label>

          <label>
            Runs:
            <input
              type="number"
              value={runs}
              onChange={(e) =>
                setRuns(e.target.value)
              }
            />
          </label>

          <label>
            Model:
            <select
              value={model}
              onChange={(e) =>
                setModel(e.target.value)
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
            onClick={runExperiment}
            disabled={loading}
          >
            {loading
              ? "Running..."
              : "Run Experiment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
