import { useCallback, useEffect, useState } from "react";
import { AnimationPlayer } from "./components/AnimationPlayer";
import { CodeWorkbench } from "./components/CodeWorkbench";
import { FrameVariablesPanel } from "./components/FrameVariablesPanel";
import { ProblemSelector } from "./components/ProblemSelector";
import { problems } from "./content/problems";
import type { AnimationProblem } from "./types";

function getSlugFromHash(): string {
  const hash = window.location.hash; // e.g. "#/partition-labels"
  if (hash.startsWith("#/")) return hash.slice(2);
  if (hash.startsWith("#")) return hash.slice(1);
  return "";
}

function findProblemBySlug(slug: string) {
  return problems.find((p) => p.slug === slug);
}

function initialProblemId(): string {
  const slug = getSlugFromHash();
  const matched = findProblemBySlug(slug);
  return matched ? matched.id : problems[0].id;
}

function App() {
  const [selectedId, setSelectedId] = useState(initialProblemId);
  const [frameIndex, setFrameIndex] = useState(0);

  const selectedProblem =
    problems.find((problem) => problem.id === selectedId) ?? problems[0];
  const [selectedSolutionId, setSelectedSolutionId] = useState(
    selectedProblem.defaultSolutionId
  );
  const selectedSolution =
    selectedProblem.solutions.find((solution) => solution.id === selectedSolutionId) ??
    selectedProblem.solutions[0];

  const [inputValue, setInputValue] = useState(selectedProblem.defaultInput);
  const [pythonCode, setPythonCode] = useState(selectedSolution.code);
  const visualization = selectedProblem.buildVisualization(inputValue);
  const safeFrameIndex = Math.min(frameIndex, visualization.frames.length - 1);
  const animationProblem: AnimationProblem = {
    ...selectedProblem,
    ...visualization
  };

  const handleSelectProblem = useCallback((nextId: string) => {
    const nextProblem = problems.find((p) => p.id === nextId);
    if (nextProblem) {
      window.location.hash = `#/${nextProblem.slug}`;
    }
    setSelectedId(nextId);
  }, []);

  // Sync from hash change (browser back/forward)
  useEffect(() => {
    function onHashChange() {
      const slug = getSlugFromHash();
      const matched = findProblemBySlug(slug);
      if (matched && matched.id !== selectedId) {
        setSelectedId(matched.id);
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [selectedId]);

  // Set hash on initial load if not already set
  useEffect(() => {
    if (!getSlugFromHash()) {
      window.location.hash = `#/${selectedProblem.slug}`;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const defaultSolution =
      selectedProblem.solutions.find(
        (solution) => solution.id === selectedProblem.defaultSolutionId
      ) ?? selectedProblem.solutions[0];

    setSelectedSolutionId(defaultSolution.id);
    setPythonCode(defaultSolution.code);
    setInputValue(selectedProblem.defaultInput);
    setFrameIndex(0);
  }, [
    selectedId,
    selectedProblem.defaultInput,
    selectedProblem.defaultSolutionId,
    selectedProblem.solutions
  ]);

  useEffect(() => {
    setFrameIndex(0);
  }, [inputValue]);

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero__card hero__card--top">
          <div className="hero__main">
            <p className="hero__eyebrow">当前题目</p>
            <h1 className="hero__title">{selectedProblem.title}</h1>
            <p className="hero__prompt">{selectedProblem.prompt}</p>
            <div className="hero__meta">
              <span>{selectedProblem.difficulty}</span>
              <span>Python only</span>
              <span>输出 {JSON.stringify(visualization.expectedOutput)}</span>
            </div>
          </div>
          <div className="hero__side">
            <ProblemSelector
              problems={problems}
              selectedId={selectedId}
              onSelect={handleSelectProblem}
            />
            <div className="hero__links">
              <a
                className="hero__link"
                href={selectedProblem.leetcodeUrl}
                target="_blank"
                rel="noreferrer"
              >
                打开 LeetCode 原题
              </a>
              <a
                className="hero__link hero__link--github"
                href="https://github.com/hyi/yi_leetcode_show"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel panel--wide">
          <AnimationPlayer
            problem={animationProblem}
            solution={selectedSolution}
            inputValue={inputValue}
            onInputValueChange={setInputValue}
            frameIndex={safeFrameIndex}
            onFrameIndexChange={setFrameIndex}
          />
        </section>

        <section className="panel">
          <div className="panel__header">
            <p className="panel__eyebrow">讲解脚本</p>
            <h2>动画在强调什么</h2>
          </div>
          <p className="panel__lead">{selectedProblem.summary}</p>
          <ul className="note-list">
            {selectedProblem.algorithmNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div className="sample-card">
            <span>{selectedProblem.inputLabel}</span>
            <strong>{inputValue || "(empty string)"}</strong>
            <span>expected</span>
            <strong>{JSON.stringify(visualization.expectedOutput)}</strong>
          </div>
        </section>

        <section className="panel">
          <FrameVariablesPanel
            problem={animationProblem}
            frameIndex={safeFrameIndex}
          />
        </section>

        <section className="panel panel--full">
          <CodeWorkbench
            problem={selectedProblem}
            solutions={selectedProblem.solutions}
            selectedSolution={selectedSolution}
            selectedSolutionId={selectedSolutionId}
            onSelectedSolutionIdChange={(nextId) => {
              const nextSolution =
                selectedProblem.solutions.find((solution) => solution.id === nextId) ??
                selectedProblem.solutions[0];

              setSelectedSolutionId(nextSolution.id);
              setPythonCode(nextSolution.code);
            }}
            inputValue={inputValue}
            pythonCode={pythonCode}
            onPythonCodeChange={setPythonCode}
            expectedOutput={visualization.expectedOutput}
            onResetDefaults={() => {
              const defaultSolution =
                selectedProblem.solutions.find(
                  (solution) => solution.id === selectedProblem.defaultSolutionId
                ) ?? selectedProblem.solutions[0];

              setInputValue(selectedProblem.defaultInput);
              setSelectedSolutionId(defaultSolution.id);
              setPythonCode(defaultSolution.code);
            }}
            onLoadReferenceCode={() => setPythonCode(selectedSolution.code)}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
