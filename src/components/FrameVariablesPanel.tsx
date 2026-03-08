import type { AnimationProblem, AnimationFrame } from "../types";

interface FrameVariablesPanelProps {
  problem: AnimationProblem;
  frameIndex: number;
}

interface VariableItem {
  name: string;
  value: string;
}

function formatValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function buildVariables(frame: AnimationFrame, inputLength: number): VariableItem[] {
  const currentChar = frame.currentChar;
  const currentLast =
    currentChar !== null ? frame.lastMap[currentChar] : null;
  const latestSegment =
    frame.closedSegments.length > 0
      ? frame.closedSegments[frame.closedSegments.length - 1]
      : null;

  if (frame.phase === "preprocess") {
    return [
      { name: "c", value: currentChar ?? "--" },
      { name: "last[c]", value: currentLast === null ? "--" : String(currentLast) },
      { name: "mapped", value: String(frame.mappedChars.length) },
      { name: "last_size", value: String(Object.keys(frame.lastMap).length) },
      { name: "ans", value: formatValue(frame.result) }
    ];
  }

  if (frame.phase === "done") {
    return [
      { name: "n", value: String(inputLength) },
      { name: "ans", value: formatValue(frame.result) },
      { name: "segments", value: String(frame.closedSegments.length) },
      {
        name: "last_seg",
        value: latestSegment
          ? `${latestSegment.label} (${latestSegment.length})`
          : "--"
      }
    ];
  }

  const items: VariableItem[] = [
    { name: "i", value: frame.currentIndex === null ? "--" : String(frame.currentIndex) },
    { name: "c", value: currentChar ?? "--" },
    { name: "start", value: String(frame.rangeStart) },
    { name: "end", value: String(frame.rangeEnd) },
    { name: "last[c]", value: currentLast === null ? "--" : String(currentLast) },
    { name: "ans", value: formatValue(frame.result) }
  ];

  if (frame.phase === "close" && latestSegment) {
    items.push({
      name: "seg",
      value: `${latestSegment.label} (${latestSegment.length})`
    });
  }

  return items;
}

function buildLastPreview(frame: AnimationFrame) {
  const entries = Object.entries(frame.lastMap);

  if (entries.length === 0) {
    return "{}";
  }

  const preview = entries
    .slice(0, 8)
    .map(([char, index]) => `'${char}': ${index}`)
    .join(", ");

  return entries.length > 8 ? `{ ${preview}, ... }` : `{ ${preview} }`;
}

export function FrameVariablesPanel({
  problem,
  frameIndex
}: FrameVariablesPanelProps) {
  const frame = problem.frames[frameIndex];
  const variables = buildVariables(frame, problem.inputValue.length);
  const lastPreview = buildLastPreview(frame);

  return (
    <div className="variables-panel">
      <div className="panel__header">
        <p className="panel__eyebrow">运行变量</p>
        <h2>当前帧的局部变量</h2>
      </div>

      <div className="variables-panel__grid">
        {variables.map((item) => (
          <div key={item.name} className="variables-panel__item">
            <span>{item.name}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="variables-panel__block">
        <span>last</span>
        <pre>{lastPreview}</pre>
      </div>

      <div className="variables-panel__block">
        <span>closed_segments</span>
        <pre>
          {frame.closedSegments.length === 0
            ? "[]"
            : JSON.stringify(
                frame.closedSegments.map((segment) => ({
                  start: segment.start,
                  end: segment.end,
                  len: segment.length
                })),
                null,
                2
              )}
        </pre>
      </div>
    </div>
  );
}
