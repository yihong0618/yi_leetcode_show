import { useEffect, useState } from "react";
import { runPythonInBrowser, type PythonRunResult } from "../lib/pyodide";
import type {
  ProblemDefinition,
  PythonEntry,
  SolutionDefinition
} from "../types";

interface CodeWorkbenchProps {
  problem: ProblemDefinition;
  solutions: SolutionDefinition[];
  selectedSolution: SolutionDefinition;
  selectedSolutionId: string;
  onSelectedSolutionIdChange: (nextId: string) => void;
  inputValue: string;
  pythonCode: string;
  onPythonCodeChange: (nextCode: string) => void;
  expectedOutput: unknown;
  onResetDefaults: () => void;
  onLoadReferenceCode: () => void;
}

type RunStatus = "idle" | "running" | "success" | "error";

function buildRunConvention(entry: PythonEntry) {
  if (entry.mode === "design-class") {
    return (
      <>
        <code>solve(operations, arguments)</code> 或{" "}
        <code>class {entry.solutionClassName}</code>
      </>
    );
  }

  return (
    <>
      <code>solve(s)</code> 或{" "}
      <code>
        {entry.solutionClassName}.{entry.solutionMethodName}
      </code>
    </>
  );
}

export function CodeWorkbench({
  problem,
  solutions,
  selectedSolution,
  selectedSolutionId,
  onSelectedSolutionIdChange,
  inputValue,
  pythonCode,
  onPythonCodeChange,
  expectedOutput,
  onResetDefaults,
  onLoadReferenceCode
}: CodeWorkbenchProps) {
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runResult, setRunResult] = useState<PythonRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setRunStatus("idle");
    setRunResult(null);
    setErrorMessage("");
  }, [inputValue, problem.id, pythonCode]);

  async function handleRunPython() {
    setRunStatus("running");
    setErrorMessage("");
    setRunResult(null);

    try {
      const nextResult = await runPythonInBrowser({
        code: pythonCode,
        inputValue,
        pythonEntry: problem.pythonEntry
      });

      setRunResult(nextResult);
      setRunStatus("success");
    } catch (error) {
      setRunStatus("error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  const expectedText = JSON.stringify(expectedOutput);
  const actualText = runResult !== null ? JSON.stringify(runResult.result) : "";
  const matchesAnimation =
    runResult !== null && actualText === JSON.stringify(expectedOutput);

  return (
    <div className="workbench">
      <div className="workbench__topbar">
        <div>
          <p className="panel__eyebrow">Python 执行区</p>
          <h2>可执行输入和代码</h2>
        </div>
        <div className="workbench__toolbar">
          <label className="workbench__picker" htmlFor="solution-select">
            <span>标准题解</span>
            <select
              id="solution-select"
              className="workbench__select"
              value={selectedSolutionId}
              onChange={(event) => onSelectedSolutionIdChange(event.target.value)}
            >
              {solutions.map((solution) => (
                <option key={solution.id} value={solution.id}>
                  {solution.label}
                </option>
              ))}
            </select>
          </label>
          {selectedSolution.sourceUrl ? (
            <a
              className="workbench__source-link"
              href={selectedSolution.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {selectedSolution.source}
            </a>
          ) : null}
          <span className={`status-pill status-pill--${runStatus}`}>
            {runStatus === "idle" && "待运行"}
            {runStatus === "running" && "加载 / 执行中"}
            {runStatus === "success" && "执行成功"}
            {runStatus === "error" && "执行失败"}
          </span>
        </div>
      </div>

      <div className="workbench__meta-row">
        <div className="workbench__mini-card">
          <span>运行约定</span>
          <strong>
            {buildRunConvention(problem.pythonEntry)}
          </strong>
        </div>
        <div className="workbench__mini-card">
          <span>动画输出</span>
          <strong>{expectedText}</strong>
        </div>
      </div>

      <div className="workbench__editor">
        <label className="workbench__field">
          <span className="workbench__label">Runnable Python</span>
          <textarea
            className="workbench__textarea"
            value={pythonCode}
            onChange={(event) => onPythonCodeChange(event.target.value)}
            spellCheck={false}
            rows={15}
          />
        </label>

        <div className="workbench__actions">
          <button type="button" className="button--primary" onClick={handleRunPython}>
            {runStatus === "running" ? "运行中..." : "运行 Python"}
          </button>
          <button type="button" onClick={onLoadReferenceCode}>
            载入标准题解
          </button>
          <button type="button" onClick={onResetDefaults}>
            恢复默认输入和代码
          </button>
        </div>

        <div className="workbench__result">
          {runResult !== null ? (
            <div className="workbench__result-card">
              <span>Python 返回值</span>
              <strong>{actualText}</strong>
              <p
                className={`workbench__compare${
                  matchesAnimation
                    ? " workbench__compare--match"
                    : " workbench__compare--mismatch"
                }`}
              >
                {matchesAnimation
                  ? "和动画输出一致"
                  : "和动画输出不一致"}
              </p>
            </div>
          ) : null}

          {runResult?.stdout ? (
            <div className="workbench__result-card">
              <span>stdout</span>
              <pre>{runResult.stdout}</pre>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="workbench__result-card workbench__result-card--error">
              <span>错误信息</span>
              <pre>{errorMessage}</pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
