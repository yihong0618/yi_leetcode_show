import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type {
  AnimationProblem,
  FramePhase,
  Segment,
  SolutionDefinition
} from "../types";

const segmentPalette = ["#ff7a59", "#1f9d8b", "#f4b942", "#4d6dd1", "#9c4dcc"];

interface AnimationPlayerProps {
  problem: AnimationProblem;
  solution: SolutionDefinition;
  inputValue: string;
  onInputValueChange: (nextValue: string) => void;
  frameIndex: number;
  onFrameIndexChange: (nextIndex: number) => void;
}

function phaseLabel(phase: FramePhase) {
  switch (phase) {
    case "preprocess":
      return "预处理";
    case "scan":
      return "扫描";
    case "close":
      return "切分";
    case "done":
      return "完成";
    default:
      return phase;
  }
}

function segmentStyle(segment: Segment): CSSProperties {
  return {
    "--segment-color": segmentPalette[segment.colorIndex % segmentPalette.length]
  } as CSSProperties;
}

function playbackFrameStep(speed: number) {
  if (speed <= 24) {
    return 4;
  }

  if (speed <= 40) {
    return 3;
  }

  if (speed <= 80) {
    return 2;
  }

  return 1;
}

export function AnimationPlayer({
  problem,
  solution,
  inputValue,
  onInputValueChange,
  frameIndex,
  onFrameIndexChange
}: AnimationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(420);
  const frame = problem.frames[frameIndex];
  const characters = problem.inputValue.split("");
  const columnCount = Math.max(characters.length, 1);
  const referenceLines = solution.code.split("\n");
  const activeLines = solution.highlightLines[frame.codeStep];

  useEffect(() => {
    setIsPlaying(false);
    setSpeed(420);
  }, [problem.id, problem.inputValue]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    if (frameIndex >= problem.frames.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      onFrameIndexChange(
        Math.min(
          problem.frames.length - 1,
          frameIndex + playbackFrameStep(speed)
        )
      );
    }, speed);

    return () => window.clearTimeout(timer);
  }, [frameIndex, isPlaying, onFrameIndexChange, problem.frames.length, speed]);

  const activeLastIndex =
    frame.currentChar !== null ? frame.lastMap[frame.currentChar] : null;
  const visibleRange =
    frame.currentIndex === null
      ? "--"
      : `[${frame.rangeStart}, ${frame.rangeEnd}]`;

  function findClosedSegment(index: number) {
    return frame.closedSegments.find(
      (segment) => index >= segment.start && index <= segment.end
    );
  }

  function togglePlayback() {
    if (frameIndex >= problem.frames.length - 1) {
      onFrameIndexChange(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((current) => !current);
  }

  function step(delta: number) {
    setIsPlaying(false);
    onFrameIndexChange(
      Math.min(problem.frames.length - 1, Math.max(0, frameIndex + delta))
    );
  }

  function reset() {
    setIsPlaying(false);
    onFrameIndexChange(0);
  }

  return (
    <div className="animation-player">
      <div className="animation-player__header">
        <div>
          <p className="panel__eyebrow">动画演示</p>
          <h2>当前帧: {frame.title}</h2>
        </div>
        <div className="animation-player__meta">
          <span className="phase-pill">{phaseLabel(frame.phase)}</span>
          <span className="phase-pill phase-pill--ghost">
            {frameIndex + 1} / {problem.frames.length}
          </span>
        </div>
      </div>

      <label className="animation-player__input">
        <span className="animation-player__input-label">{problem.inputLabel}</span>
        <input
          className="animation-player__input-control"
          type="text"
          value={inputValue}
          placeholder="输入一个新的测试字符串"
          onChange={(event) => onInputValueChange(event.target.value)}
        />
      </label>

      <div className="animation-player__grid">
        <div className="stage-card">
          <p className="stage-card__caption">{frame.caption}</p>

          <div
            className="segment-ruler"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`
            }}
          >
            {characters.map((char, index) => (
              <div key={`slot-${char}-${index}`} className="segment-ruler__slot" />
            ))}
            {frame.closedSegments.map((segment) => (
              <div
                key={`ruler-${segment.start}-${segment.end}`}
                className="segment-ruler__segment segment-ruler__segment--locked"
                style={{
                  ...segmentStyle(segment),
                  gridColumn: `${segment.start + 1} / ${segment.end + 2}`
                }}
              />
            ))}
            {frame.currentIndex !== null &&
            frame.rangeEnd >= frame.rangeStart &&
            frame.phase !== "preprocess" &&
            frame.phase !== "done" ? (
              <div
                className="segment-ruler__segment segment-ruler__segment--live"
                style={{
                  gridColumn: `${frame.rangeStart + 1} / ${frame.rangeEnd + 2}`
                }}
              />
            ) : null}
          </div>

          <div className="string-strip">
            {characters.map((char, index) => {
              const closedSegment = findClosedSegment(index);
              const isCurrent = frame.currentIndex === index;
              const isInRange =
                frame.currentIndex !== null &&
                index >= frame.rangeStart &&
                index <= frame.rangeEnd;
              const isFocusChar =
                frame.phase === "preprocess" && frame.focusChar === char;
              const isLastIndex =
                activeLastIndex !== null && activeLastIndex === index;

              const classes = ["char-card"];

              if (closedSegment) {
                classes.push("char-card--locked");
              } else if (isCurrent) {
                classes.push("char-card--current");
              } else if (isFocusChar) {
                classes.push("char-card--mapped");
              } else if (isLastIndex) {
                classes.push("char-card--last");
              } else if (
                isInRange &&
                frame.phase !== "preprocess" &&
                frame.phase !== "done"
              ) {
                classes.push("char-card--range");
              }

              return (
                <div
                  key={`${char}-${index}`}
                  className={classes.join(" ")}
                  style={closedSegment ? segmentStyle(closedSegment) : undefined}
                >
                  <span className="char-card__index">{index}</span>
                  <span className="char-card__char">{char}</span>
                  {isLastIndex || (isFocusChar && frame.currentIndex === index) ? (
                    <span className="char-card__badge">last</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="legend-row">
            <span>当前扫描字符</span>
            <span>当前片段范围</span>
            <span>已确认输出的片段</span>
          </div>
        </div>

        <aside className="details-card">
          <div className="stats-grid">
            <div className="stats-grid__item">
              <span>current</span>
              <strong>
                {frame.currentIndex === null
                  ? "--"
                  : `${frame.currentIndex} · ${frame.currentChar}`}
              </strong>
            </div>
            <div className="stats-grid__item">
              <span>range</span>
              <strong>{visibleRange}</strong>
            </div>
            <div className="stats-grid__item">
              <span>output</span>
              <strong>{JSON.stringify(frame.result)}</strong>
            </div>
          </div>

          <div>
            <h3 className="details-card__title">最后出现位置</h3>
            <div className="last-map">
              {problem.lastOrder.map((char) => {
                const isReady = frame.mappedChars.includes(char);
                const isActive =
                  frame.currentChar === char || frame.focusChar === char;

                return (
                  <div
                    key={char}
                    className={`last-map__pill${
                      isReady ? " last-map__pill--ready" : ""
                    }${isActive ? " last-map__pill--active" : ""}`}
                  >
                    <span>{char}</span>
                    <strong>{frame.lastMap[char]}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="details-card__title">已切出的片段</h3>
            {frame.closedSegments.length === 0 ? (
              <p className="details-card__empty">还没有闭合片段。</p>
            ) : (
              <div className="segment-stack">
                {frame.closedSegments.map((segment) => (
                  <div
                    key={`${segment.start}-${segment.end}`}
                    className="segment-stack__item"
                    style={segmentStyle(segment)}
                  >
                    <strong>{segment.label}</strong>
                    <span>
                      [{segment.start}, {segment.end}] · len {segment.length}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="controls">
        <div className="controls__buttons">
          <button type="button" onClick={() => step(-1)}>
            上一步
          </button>
          <button type="button" className="button--primary" onClick={togglePlayback}>
            {isPlaying ? "暂停" : "播放"}
          </button>
          <button type="button" onClick={() => step(1)}>
            下一步
          </button>
          <button type="button" onClick={reset}>
            重置
          </button>
        </div>

        <label className="controls__slider">
          <span>帧进度</span>
          <input
            type="range"
            min="0"
            max={problem.frames.length - 1}
            value={frameIndex}
            onChange={(event) => {
              setIsPlaying(false);
              onFrameIndexChange(Number(event.target.value));
            }}
          />
        </label>

        <label className="controls__slider">
          <span>播放速度</span>
          <input
            type="range"
            min="16"
            max="1200"
            step="8"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>
      </div>

      <section className="reference-card">
        <div className="reference-card__header">
          <div>
            <p className="panel__eyebrow">标准题解</p>
            <h3 className="reference-card__title">{solution.label}</h3>
          </div>
          <div className="reference-card__meta">
            <span className="reference-card__badge">
              高亮行 {activeLines.join(", ")}
            </span>
            {solution.sourceUrl ? (
              <a
                className="reference-card__link"
                href={solution.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {solution.source}
              </a>
            ) : (
              <span className="reference-card__badge">{solution.source}</span>
            )}
          </div>
        </div>

        <pre className="reference-card__code">
          <code>
            {referenceLines.map((line, index) => {
              const lineNumber = index + 1;
              const isActive = activeLines.includes(lineNumber);

              return (
                <div
                  key={lineNumber}
                  className={`reference-card__line${
                    isActive ? " reference-card__line--active" : ""
                  }`}
                >
                  <span className="reference-card__line-number">{lineNumber}</span>
                  <span className="reference-card__line-text">{line}</span>
                </div>
              );
            })}
          </code>
        </pre>
      </section>
    </div>
  );
}
