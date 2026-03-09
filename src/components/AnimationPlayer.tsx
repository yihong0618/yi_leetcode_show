import type { CSSProperties, ChangeEvent } from "react";
import { useEffect, useState } from "react";
import type {
  AnimationFrameView,
  AnimationProblem,
  FramePhase,
  Segment,
  SolutionDefinition,
  TrieNodeSnapshot,
  TrieView
} from "../types";

const segmentPalette = ["#ff7a59", "#1f9d8b", "#f4b942", "#4d6dd1", "#9c4dcc"];
const TRIE_NODE_RADIUS = 30;
const TRIE_ROOT_RADIUS = 38;
const TRIE_X_GAP = 156;
const TRIE_Y_GAP = 168;
const TRIE_PADDING_X = 112;
const TRIE_PADDING_Y = 64;

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
      return "收束";
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

function isTrieView(view: AnimationFrameView | undefined): view is TrieView {
  return view?.kind === "trie";
}

function formatJson(value: unknown) {
  return JSON.stringify(value) ?? "undefined";
}

function formatResult(value: unknown) {
  return value === undefined ? "--" : formatJson(value);
}

function formatOperationLabel(
  index: number | null,
  name: string | null,
  argument: string | null
) {
  if (index === null || name === null) {
    return "--";
  }

  return `#${index} ${name}(${argument ?? ""})`;
}

interface TrieNodeLayout extends TrieNodeSnapshot {
  x: number;
  y: number;
}

interface TrieEdgeLayout {
  fromId: string;
  toId: string;
}

interface TrieTreeLayout {
  width: number;
  height: number;
  nodes: TrieNodeLayout[];
  edges: TrieEdgeLayout[];
}

function buildTrieTreeLayout(nodes: TrieNodeSnapshot[]): TrieTreeLayout {
  if (nodes.length === 0) {
    return {
    width: 920,
    height: 420,
      nodes: [],
      edges: []
    };
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const childrenMap = new Map<string, TrieNodeSnapshot[]>();
  const root = nodes.find((node) => node.depth === 0) ?? nodes[0];

  nodes.forEach((node) => {
    const childNodes = node.childKeys
      .map((key) => nodeMap.get(node.prefix + key))
      .filter((child): child is TrieNodeSnapshot => child !== undefined)
      .sort((left, right) => left.prefix.localeCompare(right.prefix));

    childrenMap.set(node.id, childNodes);
  });

  const positions = new Map<string, { x: number; y: number }>();
  const edges: TrieEdgeLayout[] = [];
  let leafCursor = 0;

  const assign = (node: TrieNodeSnapshot): number => {
    const children = childrenMap.get(node.id) ?? [];
    const y = TRIE_PADDING_Y + node.depth * TRIE_Y_GAP;

    if (children.length === 0) {
      const x = TRIE_PADDING_X + leafCursor * TRIE_X_GAP;
      leafCursor += 1;
      positions.set(node.id, { x, y });
      return x;
    }

    const childXs = children.map((child) => {
      edges.push({ fromId: node.id, toId: child.id });
      return assign(child);
    });
    const x = childXs.reduce((sum, current) => sum + current, 0) / childXs.length;

    positions.set(node.id, { x, y });
    return x;
  };

  assign(root);

  const maxDepth = Math.max(...nodes.map((node) => node.depth));
  const width = Math.max(920, TRIE_PADDING_X * 2 + Math.max(1, leafCursor - 1) * TRIE_X_GAP);
  const height = Math.max(
    500,
    TRIE_PADDING_Y * 2 + maxDepth * TRIE_Y_GAP + 110
  );
  const layoutNodes = nodes
    .map((node) => {
      const position = positions.get(node.id);

      return position
        ? {
            ...node,
            x: position.x,
            y: position.y
          }
        : null;
    })
    .filter((node): node is TrieNodeLayout => node !== null);

  return {
    width,
    height,
    nodes: layoutNodes,
    edges
  };
}

function renderPartitionStage(problem: AnimationProblem, frameIndex: number) {
  const frame = problem.frames[frameIndex];
  const view =
    frame.view?.kind === "partition-labels"
      ? frame.view
      : {
          kind: "partition-labels" as const,
          characters: problem.inputValue.split("")
        };
  const characters = view.characters;
  const columnCount = Math.max(characters.length, 1);
  const activeLastIndex =
    frame.currentChar !== null ? frame.lastMap[frame.currentChar] : null;

  function findClosedSegment(index: number) {
    return frame.closedSegments.find(
      (segment) => index >= segment.start && index <= segment.end
    );
  }

  return (
    <>
      <div className="stage-card stage-card--trie">
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

      <aside className="details-card details-card--trie">
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
            <strong>
              {frame.currentIndex === null
                ? "--"
                : `[${frame.rangeStart}, ${frame.rangeEnd}]`}
            </strong>
          </div>
          <div className="stats-grid__item">
            <span>output</span>
            <strong>{formatJson(frame.result)}</strong>
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
    </>
  );
}

function renderTrieStage(problem: AnimationProblem, frameIndex: number, view: TrieView) {
  const frame = problem.frames[frameIndex];
  const layout = buildTrieTreeLayout(view.nodes);
  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));
  const currentNode = view.nodes.find((node) => node.isCurrent) ?? null;

  return (
    <>
      <div className="stage-card">
        <p className="stage-card__caption">{frame.caption}</p>

        <div className="trie-current">
          <span>当前操作</span>
          <strong>
            {formatOperationLabel(
              view.currentOperationIndex,
              view.currentOperationName,
              view.currentArgument
            )}
          </strong>
          <code>path = {view.currentPrefix || "(root)"}</code>
        </div>

        {layout.nodes.length === 0 ? (
          <p className="details-card__empty">当前还没有可展示的 Trie 节点。</p>
        ) : (
          <div className="trie-scene">
            <svg
              className="trie-scene__svg"
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              role="img"
              aria-label="Trie tree animation"
            >
              <defs>
                <linearGradient id="trie-scene-bg" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                  <stop offset="100%" stopColor="rgba(232,222,205,0.08)" />
                </linearGradient>
              </defs>

              <rect
                x="0"
                y="0"
                width={layout.width}
                height={layout.height}
                rx="32"
                fill="url(#trie-scene-bg)"
              />

              {layout.edges.map((edge) => {
                const from = nodeMap.get(edge.fromId);
                const to = nodeMap.get(edge.toId);

                if (!from || !to) {
                  return null;
                }

                const isActive = from.isActive && to.isActive;
                const isFresh = to.isNew;

                return (
                  <line
                    key={`${edge.fromId}-${edge.toId}`}
                    className={`trie-edge${
                      isActive ? " trie-edge--active" : ""
                    }${isFresh ? " trie-edge--new" : ""}`}
                    x1={from.x}
                    y1={from.y + (from.depth === 0 ? TRIE_ROOT_RADIUS - 2 : TRIE_NODE_RADIUS - 2)}
                    x2={to.x}
                    y2={to.y - TRIE_NODE_RADIUS + 2}
                  />
                );
              })}

              {layout.nodes.map((node) => {
                const radius = node.depth === 0 ? TRIE_ROOT_RADIUS : TRIE_NODE_RADIUS;
                const label = node.depth === 0 ? "ROOT" : node.prefix.at(-1)?.toLowerCase() ?? "";

                return (
                  <g
                    key={node.id}
                    className={`trie-point${
                      node.depth === 0 ? " trie-point--root" : ""
                    }${
                      node.isActive ? " trie-point--active" : ""
                    }${node.isCurrent ? " trie-point--current" : ""}${
                      node.isNew ? " trie-point--new" : ""
                    }${node.isTerminal ? " trie-point--terminal" : ""}`}
                    style={
                      {
                        "--trie-node-x": String(node.x),
                        "--trie-node-y": String(node.y)
                      } as CSSProperties
                    }
                    transform={`translate(${node.x}, ${node.y})`}
                  >
                    <circle
                      className="trie-point__halo"
                      r={radius + 8}
                    />
                    <circle
                      className="trie-point__outer"
                      r={radius}
                    />
                    <circle
                      className="trie-point__inner"
                      r={radius - (node.depth === 0 ? 7 : 5)}
                    />
                    <text className="trie-point__label" textAnchor="middle" dominantBaseline="middle">
                      {label}
                    </text>
                    {node.depth > 0 ? (
                      <text
                        className="trie-point__prefix"
                        textAnchor="middle"
                        y={radius + 20}
                      >
                        {node.prefix}
                      </text>
                    ) : null}
                    {node.isTerminal ? (
                      <g
                        className="trie-point__end"
                        transform={`translate(0, ${radius + 42})`}
                      >
                        <rect x={-22} y={-10} width={44} height={20} rx={10} />
                        <text textAnchor="middle" dominantBaseline="middle">
                          END
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </svg>

          </div>
        )}

        <div className="legend-row legend-row--trie">
          <span>当前路径</span>
          <span>当前节点 / 新建节点</span>
          <span>单词结束标记</span>
        </div>
      </div>

      <aside className="details-card">
        <div className="stats-grid">
          <div className="stats-grid__item">
            <span>current</span>
            <strong>
              {formatOperationLabel(
                view.currentOperationIndex,
                view.currentOperationName,
                view.currentArgument
              )}
            </strong>
          </div>
          <div className="stats-grid__item">
            <span>prefix</span>
            <strong>{view.currentPrefix || "(root)"}</strong>
          </div>
          <div className="stats-grid__item">
            <span>nodes</span>
            <strong>{view.nodes.length}</strong>
          </div>
          <div className="stats-grid__item">
            <span>output</span>
            <strong>{formatJson(frame.result)}</strong>
          </div>
        </div>

        <div>
          <h3 className="details-card__title">当前节点的孩子</h3>
          <p className="details-card__empty">
            {currentNode === null
              ? "--"
              : currentNode.childKeys.length === 0
                ? "[]"
                : currentNode.childKeys.join(", ")}
          </p>
        </div>

        <div>
          <h3 className="details-card__title">已完成的操作</h3>
          {view.history.length === 0 ? (
            <p className="details-card__empty">还没有完成的调用。</p>
          ) : (
            <div className="trie-history">
              {view.history.map((item) => (
                <div
                  key={`${item.index}-${item.name}-${item.argument}`}
                  className="trie-history__item"
                >
                  <strong>
                    #{item.index} {item.name}({item.argument})
                  </strong>
                  <span>{formatResult(item.output)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
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
  const referenceLines = solution.code.split("\n");
  const activeLines = solution.highlightLines[frame.codeStep] ?? [];
  const trieFrame = isTrieView(frame.view);

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

  const sharedInputProps = {
    className: `animation-player__input-control${
      problem.inputMultiline ? " animation-player__input-control--multiline" : ""
    }`,
    value: inputValue,
    placeholder:
      problem.inputPlaceholder ?? "输入一个新的测试字符串",
    onChange: (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => onInputValueChange(event.target.value)
  };

  const controls = (
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
  );

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
        {problem.inputMultiline ? (
          <textarea {...sharedInputProps} rows={7} />
        ) : (
          <input {...sharedInputProps} type="text" />
        )}
      </label>

      {trieFrame ? controls : null}

      <div
        className={`animation-player__grid${
          trieFrame ? " animation-player__grid--trie" : ""
        }`}
      >
        {trieFrame
          ? renderTrieStage(problem, frameIndex, frame.view as TrieView)
          : renderPartitionStage(problem, frameIndex)}
      </div>

      {trieFrame ? null : controls}

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
