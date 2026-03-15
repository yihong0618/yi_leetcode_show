import type { CSSProperties, ChangeEvent } from "react";
import { useEffect, useState } from "react";
import type {
  AnimationFrameView,
  AnimationProblem,
  CoinChangeView,
  DecodeStringView,
  DecodeStringStackEntry,
  FramePhase,
  Segment,
  SolutionDefinition,
  TrieNodeSnapshot,
  TrieView
} from "../types";

const segmentPalette = ["#ef6b6b", "#3bafa8", "#f7ce46", "#4a98c8", "#b47dc8"];
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

function isDecodeStringView(view: AnimationFrameView | undefined): view is DecodeStringView {
  return view?.kind === "decode-string";
}

function isCoinChangeView(view: AnimationFrameView | undefined): view is CoinChangeView {
  return view?.kind === "coin-change";
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

function renderCoinChangeStage(problem: AnimationProblem, frameIndex: number, view: CoinChangeView) {
  const frame = problem.frames[frameIndex];
  const { coins, dp, currentAmount, currentCoin, referencedAmount, isUpdate } = view;
  const INF = dp.length;

  function dpVal(v: number) {
    return v >= INF ? "∞" : String(v);
  }

  const SVG_W = 720;
  const SVG_H = 390;
  const COIN_R = 24;
  const COIN_X = 72;
  const COIN_Y0 = 80;
  const COIN_GAP = 62;
  const BAG_CX = 340;
  const BAG_CY = 175;
  const BAG_W = 130;
  const BAG_H = 150;
  const DP_PAD = 44;
  const dpCount = dp.length;
  const DP_CELL_W = Math.min(50, (SVG_W - DP_PAD * 2) / dpCount);
  const DP_Y = SVG_H - 48;

  const dpCurVal = currentAmount !== null ? dp[currentAmount] : null;
  const coinsInBag = dpCurVal !== null && dpCurVal < INF ? dpCurVal : 0;

  const miniCoinPositions: { x: number; y: number }[] = [];
  for (let ci = 0; ci < Math.min(coinsInBag, 6); ci++) {
    const col = ci % 3;
    const row = Math.floor(ci / 3);
    miniCoinPositions.push({
      x: BAG_CX - 26 + col * 26,
      y: BAG_CY + 50 - row * 26
    });
  }

  const REF_BAG_CX = 570;
  const REF_BAG_CY = 150;
  const refVal = referencedAmount !== null ? dp[referencedAmount] : null;

  return (
    <>
      <div className="stage-card stage-card--trie">
        <p className="stage-card__caption">{frame.caption}</p>

        <div className="coin-change-scene">
          <svg
            className="coin-change-scene__svg"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            role="img"
            aria-label="Coin change backpack visualization"
          >
            <defs>
              <linearGradient id="cc-bag-body" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#8B7355" />
                <stop offset="100%" stopColor="#5C4633" />
              </linearGradient>
              <linearGradient id="cc-bag-flap" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#A4906C" />
                <stop offset="100%" stopColor="#8B7355" />
              </linearGradient>
              <linearGradient id="cc-gold" x1="20%" x2="80%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#FFE066" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#E6A800" />
              </linearGradient>
              <linearGradient id="cc-gold-hi" x1="20%" x2="80%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#FFF3A0" />
                <stop offset="50%" stopColor="#FFE44D" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>
              <linearGradient id="cc-mini-gold" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#E6A800" />
              </linearGradient>
              <filter id="cc-shadow-sm">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.18" />
              </filter>
              <filter id="cc-shadow-lg">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.14" />
              </filter>
            </defs>

            <rect x="0" y="0" width={SVG_W} height={SVG_H} rx="24" fill="rgba(250,248,244,0.55)" />

            {/* ── Left: available coins ── */}
            <text x={COIN_X} y={COIN_Y0 - 40} textAnchor="middle" className="cc-label">可用硬币</text>
            {coins.map((coin, idx) => {
              const cy = COIN_Y0 + idx * COIN_GAP;
              const isActive = currentCoin === coin;
              return (
                <g key={coin} className={`cc-coin${isActive ? " cc-coin--active" : ""}`}>
                  <circle cx={COIN_X} cy={cy} r={COIN_R + 2} fill="rgba(0,0,0,0.06)" />
                  <circle
                    cx={COIN_X} cy={cy} r={COIN_R}
                    fill={isActive ? "url(#cc-gold-hi)" : "url(#cc-gold)"}
                    stroke={isActive ? "#D4A017" : "#C8961D"}
                    strokeWidth={2}
                    filter="url(#cc-shadow-sm)"
                  />
                  <circle cx={COIN_X} cy={cy} r={COIN_R - 5} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} />
                  <text x={COIN_X} y={cy} textAnchor="middle" dominantBaseline="central" className="cc-coin__value">{coin}</text>
                  {isActive ? (
                    <circle cx={COIN_X} cy={cy} r={COIN_R + 8} fill="none" stroke="#FFD700" strokeWidth={2} strokeDasharray="5 5" className="cc-coin__ring" />
                  ) : null}
                </g>
              );
            })}

            {/* ── Arrow from active coin to bag ── */}
            {currentCoin !== null && currentAmount !== null ? (
              <line
                x1={COIN_X + COIN_R + 14}
                y1={COIN_Y0 + coins.indexOf(currentCoin) * COIN_GAP}
                x2={BAG_CX - BAG_W / 2 - 8}
                y2={BAG_CY - 10}
                stroke="rgba(212,160,23,0.35)"
                strokeWidth={2}
                strokeDasharray="6 4"
                className="cc-arrow-line"
              />
            ) : null}

            {/* ── Center: backpack ── */}
            <g filter="url(#cc-shadow-lg)">
              {/* Handle loop */}
              <path
                d={`M${BAG_CX - 18} ${BAG_CY - BAG_H / 2 - 2}
                    Q${BAG_CX - 18} ${BAG_CY - BAG_H / 2 - 28}
                     ${BAG_CX} ${BAG_CY - BAG_H / 2 - 28}
                    Q${BAG_CX + 18} ${BAG_CY - BAG_H / 2 - 28}
                     ${BAG_CX + 18} ${BAG_CY - BAG_H / 2 - 2}`}
                fill="none" stroke="#6B5340" strokeWidth={7} strokeLinecap="round"
              />

              {/* Left strap */}
              <path
                d={`M${BAG_CX - 36} ${BAG_CY - BAG_H / 2 + 2}
                    C${BAG_CX - 58} ${BAG_CY - BAG_H / 2 - 18}
                     ${BAG_CX - 64} ${BAG_CY - BAG_H / 2 + 20}
                     ${BAG_CX - 56} ${BAG_CY - BAG_H / 2 + 50}`}
                fill="none" stroke="#6B5340" strokeWidth={6} strokeLinecap="round"
              />
              {/* Right strap */}
              <path
                d={`M${BAG_CX + 36} ${BAG_CY - BAG_H / 2 + 2}
                    C${BAG_CX + 58} ${BAG_CY - BAG_H / 2 - 18}
                     ${BAG_CX + 64} ${BAG_CY - BAG_H / 2 + 20}
                     ${BAG_CX + 56} ${BAG_CY - BAG_H / 2 + 50}`}
                fill="none" stroke="#6B5340" strokeWidth={6} strokeLinecap="round"
              />

              {/* Main body */}
              <rect
                x={BAG_CX - BAG_W / 2} y={BAG_CY - BAG_H / 2}
                width={BAG_W} height={BAG_H}
                rx={22}
                fill="url(#cc-bag-body)"
              />
              {/* Left highlight sheen */}
              <path
                d={`M${BAG_CX - BAG_W / 2 + 12} ${BAG_CY - BAG_H / 2 + 40}
                    L${BAG_CX - BAG_W / 2 + 12} ${BAG_CY + BAG_H / 2 - 30}`}
                stroke="rgba(255,255,255,0.12)" strokeWidth={3} strokeLinecap="round" fill="none"
              />

              {/* Flap */}
              <rect
                x={BAG_CX - BAG_W / 2} y={BAG_CY - BAG_H / 2}
                width={BAG_W} height={36}
                rx={22}
                fill="url(#cc-bag-flap)"
              />
              <rect
                x={BAG_CX - BAG_W / 2} y={BAG_CY - BAG_H / 2 + 22}
                width={BAG_W} height={14}
                fill="url(#cc-bag-flap)"
              />

              {/* Clasp / ¥ buckle */}
              <rect
                x={BAG_CX - 16} y={BAG_CY - BAG_H / 2 + 26}
                width={32} height={16} rx={8}
                fill="#D4A017" stroke="#C8961D" strokeWidth={1}
              />
              <text x={BAG_CX} y={BAG_CY - BAG_H / 2 + 38} textAnchor="middle" className="cc-clasp-text">¥</text>

              {/* Front pocket */}
              <rect
                x={BAG_CX - BAG_W / 2 + 16} y={BAG_CY + 14}
                width={BAG_W - 32} height={46} rx={14}
                fill="rgba(0,0,0,0.10)" stroke="rgba(0,0,0,0.06)" strokeWidth={1}
              />

              {/* ¥ watermark on body */}
              <text x={BAG_CX} y={BAG_CY + 2} textAnchor="middle" dominantBaseline="central" className="cc-bag__symbol">¥</text>
            </g>

            {/* Capacity label */}
            <text x={BAG_CX} y={BAG_CY - BAG_H / 2 + 58} textAnchor="middle" className="cc-bag__cap">
              {currentAmount !== null ? `¥${currentAmount}` : `¥${dp.length - 1}`}
            </text>

            {/* Mini coins inside the bag */}
            {miniCoinPositions.map((pos, ci) => (
              <g key={ci} className="cc-mini-coin">
                <circle cx={pos.x} cy={pos.y} r={10} fill="url(#cc-mini-gold)" stroke="#C8961D" strokeWidth={1.2} />
                <circle cx={pos.x} cy={pos.y} r={6} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
              </g>
            ))}

            {/* Count label in pocket */}
            <text x={BAG_CX} y={BAG_CY + 42} textAnchor="middle" className="cc-bag__count">
              {dpCurVal !== null
                ? dpCurVal >= INF ? "无解" : `${dpCurVal} 枚`
                : "--"}
            </text>

            {/* Flying coin being tried */}
            {currentCoin !== null && currentAmount !== null ? (
              <g className={`cc-flying${isUpdate ? " cc-flying--drop" : " cc-flying--reject"}`}>
                <circle cx={BAG_CX} cy={BAG_CY - BAG_H / 2 - 48} r={18} fill="url(#cc-gold-hi)" stroke="#D4A017" strokeWidth={2} filter="url(#cc-shadow-sm)" />
                <circle cx={BAG_CX} cy={BAG_CY - BAG_H / 2 - 48} r={12} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.2} />
                <text x={BAG_CX} y={BAG_CY - BAG_H / 2 - 48} textAnchor="middle" dominantBaseline="central" className="cc-coin__value cc-coin__value--sm">{currentCoin}</text>
                {isUpdate ? (
                  <text x={BAG_CX} y={BAG_CY - BAG_H / 2 - 72} textAnchor="middle" className="cc-action-label cc-action-label--ok">✓ 放入</text>
                ) : (
                  <text x={BAG_CX} y={BAG_CY - BAG_H / 2 - 72} textAnchor="middle" className="cc-action-label cc-action-label--skip">✗ 跳过</text>
                )}
              </g>
            ) : null}

            {/* ── Right: reference sub-problem ── */}
            {referencedAmount !== null && currentCoin !== null ? (
              <g>
                {/* Mini bag for dp[i-c] */}
                <rect
                  x={REF_BAG_CX - 44} y={REF_BAG_CY - 38}
                  width={88} height={76} rx={16}
                  fill="rgba(139,115,85,0.15)"
                  stroke="rgba(139,115,85,0.25)"
                  strokeWidth={1.5}
                />
                <rect
                  x={REF_BAG_CX - 44} y={REF_BAG_CY - 38}
                  width={88} height={20} rx={16}
                  fill="rgba(164,144,108,0.2)"
                />

                <text x={REF_BAG_CX} y={REF_BAG_CY - 18} textAnchor="middle" className="cc-ref__label">
                  dp[{referencedAmount}]
                </text>
                <text x={REF_BAG_CX} y={REF_BAG_CY + 8} textAnchor="middle" className="cc-ref__val">
                  {refVal !== null ? dpVal(refVal) : "?"} 枚
                </text>
                <text x={REF_BAG_CX} y={REF_BAG_CY + 48} textAnchor="middle" className="cc-ref__hint">
                  + 1 = {refVal !== null && refVal < INF ? refVal + 1 : "∞"}
                </text>

                {/* Arrow from mini bag to main bag */}
                <path
                  d={`M${REF_BAG_CX - 44} ${REF_BAG_CY} Q${BAG_CX + BAG_W / 2 + 30} ${REF_BAG_CY} ${BAG_CX + BAG_W / 2 + 8} ${BAG_CY - 20}`}
                  fill="none"
                  stroke="rgba(74,152,200,0.35)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              </g>
            ) : null}

            {/* ── Bottom: DP array ── */}
            {dpCount <= 30 ? (
              <g>
                <text x={DP_PAD} y={DP_Y - 26} className="cc-label">dp</text>
                {dp.map((val, i) => {
                  const x = DP_PAD + i * DP_CELL_W;
                  const isCur = currentAmount === i;
                  const isRef = referencedAmount === i;
                  const isDone = (currentAmount !== null ? i < currentAmount : frame.phase === "done") && val < INF;

                  let cls = "cc-dp";
                  if (isCur && isUpdate) cls += " cc-dp--updated";
                  else if (isCur) cls += " cc-dp--current";
                  else if (isRef) cls += " cc-dp--ref";
                  else if (isDone) cls += " cc-dp--done";

                  return (
                    <g key={i} className={cls}>
                      <rect x={x + 1} y={DP_Y - 18} width={DP_CELL_W - 2} height={38} rx={6} className="cc-dp__bg" />
                      <text x={x + DP_CELL_W / 2} y={DP_Y - 5} textAnchor="middle" className="cc-dp__idx">{i}</text>
                      <text x={x + DP_CELL_W / 2} y={DP_Y + 14} textAnchor="middle" className="cc-dp__val">{dpVal(val)}</text>
                    </g>
                  );
                })}
              </g>
            ) : null}
          </svg>
        </div>

        {currentAmount !== null && referencedAmount !== null && currentCoin !== null ? (
          <div className="coin-change-hint">
            dp[{currentAmount}] = min(dp[{currentAmount}], dp[{referencedAmount}] + 1)
            {" = min("}
            {dpVal(isUpdate ? (dp[currentAmount]) : dp[currentAmount])}
            {", "}
            {dpVal(dp[referencedAmount])} + 1)
          </div>
        ) : null}

        <div className="legend-row">
          <span>当前计算金额</span>
          <span>参考子问题 (i−coin)</span>
          <span>已确定最优值</span>
        </div>
      </div>

      <aside className="details-card details-card--trie">
        <div className="stats-grid">
          <div className="stats-grid__item">
            <span>amount</span>
            <strong>{currentAmount ?? "--"}</strong>
          </div>
          <div className="stats-grid__item">
            <span>coin</span>
            <strong>{currentCoin ?? "--"}</strong>
          </div>
          <div className="stats-grid__item">
            <span>dp[i]</span>
            <strong>
              {currentAmount !== null ? dpVal(dp[currentAmount]) : "--"}
            </strong>
          </div>
          <div className="stats-grid__item">
            <span>dp[i−c]</span>
            <strong>
              {referencedAmount !== null ? dpVal(dp[referencedAmount]) : "--"}
            </strong>
          </div>
        </div>

        <div>
          <h3 className="details-card__title">DP 数组</h3>
          <div className="coin-change-dp-grid">
            {dp.map((val, i) => (
              <div
                key={i}
                className={`coin-change-dp-grid__cell${
                  currentAmount === i ? " coin-change-dp-grid__cell--current" : ""
                }`}
              >
                <span>{i}</span>
                <strong>{dpVal(val)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="details-card__title">硬币面值</h3>
          <div className="coin-change-coins coin-change-coins--compact">
            {coins.map((coin) => (
              <div
                key={coin}
                className={`coin-change-coins__badge${
                  currentCoin === coin ? " coin-change-coins__badge--active" : ""
                }`}
              >
                {coin}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

const DSTACK_ENTRY_W = 220;
const DSTACK_ENTRY_H = 56;
const DSTACK_GAP = 8;
const DSTACK_PAD_X = 24;
const DSTACK_PAD_TOP = 24;
const DSTACK_PAD_BOTTOM = 16;
const DSTACK_LABEL_H = 32;
const DSTACK_WORK_GAP = 48;
const DSTACK_WORK_W = 260;

function stackEntryLabel(entry: DecodeStringStackEntry) {
  const str = entry.str === "" ? '""' : `"${entry.str}"`;
  return `${entry.num}× ${str}`;
}

function renderDecodeStringStage(problem: AnimationProblem, frameIndex: number, view: DecodeStringView) {
  const frame = problem.frames[frameIndex];
  const characters = view.characters;
  const action = view.action;

  const maxSlots = Math.max(view.stack.length + 1, 3);
  const stackBodyH =
    maxSlots * DSTACK_ENTRY_H + (maxSlots - 1) * DSTACK_GAP;
  const svgH =
    DSTACK_PAD_TOP + DSTACK_LABEL_H + stackBodyH + DSTACK_PAD_BOTTOM;
  const svgW =
    DSTACK_PAD_X + DSTACK_ENTRY_W + DSTACK_WORK_GAP + DSTACK_WORK_W + DSTACK_PAD_X;

  const stackTopX = DSTACK_PAD_X;
  const stackTopY = DSTACK_PAD_TOP + DSTACK_LABEL_H;

  const workAreaX = DSTACK_PAD_X + DSTACK_ENTRY_W + DSTACK_WORK_GAP;
  const workAreaY = stackTopY;

  const stackEntries = [...view.stack].reverse();

  return (
    <>
      <div className="stage-card stage-card--trie">
        <p className="stage-card__caption">{frame.caption}</p>

        <div className="string-strip">
          {characters.map((char, index) => {
            const isCurrent = frame.currentIndex === index;
            const isScanned =
              frame.currentIndex !== null && index < frame.currentIndex;

            const isDigit = char >= "0" && char <= "9";
            const isBracket = char === "[" || char === "]";
            const classes = ["char-card"];

            if (isCurrent) {
              classes.push("char-card--current");
            } else if (isScanned) {
              classes.push("char-card--range");
            }
            if (isDigit && !isCurrent && !isScanned) {
              classes.push("char-card--mapped");
            }
            if (isBracket && !isCurrent && !isScanned) {
              classes.push("char-card--last");
            }

            return (
              <div key={`${char}-${index}`} className={classes.join(" ")}>
                <span className="char-card__index">{index}</span>
                <span className="char-card__char">{char}</span>
              </div>
            );
          })}
        </div>

        <div className="decode-scene">
          <svg
            className="decode-scene__svg"
            viewBox={`0 0 ${svgW} ${svgH}`}
            role="img"
            aria-label="Stack visualization"
          >
            <defs>
              <linearGradient id="ds-stack-bg" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(77,109,209,0.08)" />
                <stop offset="100%" stopColor="rgba(77,109,209,0.02)" />
              </linearGradient>
              <linearGradient id="ds-work-bg" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(31,157,139,0.08)" />
                <stop offset="100%" stopColor="rgba(31,157,139,0.02)" />
              </linearGradient>
            </defs>

            {/* stack container */}
            <rect
              x={stackTopX - 4}
              y={DSTACK_PAD_TOP}
              width={DSTACK_ENTRY_W + 8}
              height={DSTACK_LABEL_H + stackBodyH + DSTACK_PAD_BOTTOM}
              rx={18}
              fill="url(#ds-stack-bg)"
              stroke="rgba(77,109,209,0.15)"
              strokeWidth={1.5}
            />
            <text
              x={stackTopX + DSTACK_ENTRY_W / 2}
              y={DSTACK_PAD_TOP + 22}
              textAnchor="middle"
              className="decode-scene__label"
            >
              stack
            </text>

            {/* stack slots bottom-to-top */}
            {Array.from({ length: maxSlots }).map((_, slotIdx) => {
              const y =
                stackTopY +
                stackBodyH -
                (slotIdx + 1) * DSTACK_ENTRY_H -
                slotIdx * DSTACK_GAP;
              return (
                <rect
                  key={`slot-${slotIdx}`}
                  x={stackTopX}
                  y={y}
                  width={DSTACK_ENTRY_W}
                  height={DSTACK_ENTRY_H}
                  rx={12}
                  fill="rgba(255,255,255,0.35)"
                  stroke="rgba(77,109,209,0.08)"
                  strokeWidth={1}
                  strokeDasharray="6 4"
                />
              );
            })}

            {/* actual stack entries (rendered bottom to top) */}
            {stackEntries.map((entry, revIdx) => {
              const slotIdx = view.stack.length - 1 - revIdx;
              const y =
                stackTopY +
                stackBodyH -
                (slotIdx + 1) * DSTACK_ENTRY_H -
                slotIdx * DSTACK_GAP;
              const isTop = revIdx === 0;
              const isPushed = action.type === "push" && isTop;

              return (
                <g
                  key={`entry-${revIdx}`}
                  className={`decode-entry${isPushed ? " decode-entry--push" : ""}${
                    isTop ? " decode-entry--top" : ""
                  }`}
                >
                  <rect
                    x={stackTopX}
                    y={y}
                    width={DSTACK_ENTRY_W}
                    height={DSTACK_ENTRY_H}
                    rx={12}
                    className="decode-entry__bg"
                  />
                  <text
                    x={stackTopX + 14}
                    y={y + 22}
                    className="decode-entry__index"
                  >
                    #{slotIdx}
                  </text>
                  <text
                    x={stackTopX + 14}
                    y={y + 42}
                    className="decode-entry__value"
                  >
                    {stackEntryLabel(entry)}
                  </text>
                  {isTop ? (
                    <text
                      x={stackTopX + DSTACK_ENTRY_W - 14}
                      y={y + DSTACK_ENTRY_H / 2 + 5}
                      textAnchor="end"
                      className="decode-entry__badge"
                    >
                      TOP
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* push / pop arrow */}
            {action.type === "push" ? (
              <g className="decode-arrow decode-arrow--push">
                <line
                  x1={stackTopX + DSTACK_ENTRY_W + 12}
                  y1={stackTopY + stackBodyH - view.stack.length * (DSTACK_ENTRY_H + DSTACK_GAP) + DSTACK_ENTRY_H / 2}
                  x2={stackTopX + DSTACK_ENTRY_W + 28}
                  y2={stackTopY + stackBodyH - view.stack.length * (DSTACK_ENTRY_H + DSTACK_GAP) + DSTACK_ENTRY_H / 2}
                />
                <text
                  x={stackTopX + DSTACK_ENTRY_W + 32}
                  y={stackTopY + stackBodyH - view.stack.length * (DSTACK_ENTRY_H + DSTACK_GAP) + DSTACK_ENTRY_H / 2 + 5}
                  className="decode-arrow__label"
                >
                  PUSH
                </text>
              </g>
            ) : null}
            {action.type === "pop" ? (
              <g className="decode-arrow decode-arrow--pop">
                <line
                  x1={stackTopX + DSTACK_ENTRY_W + 12}
                  y1={stackTopY + stackBodyH - (view.stack.length + 1) * (DSTACK_ENTRY_H + DSTACK_GAP) + DSTACK_ENTRY_H / 2 + DSTACK_GAP}
                  x2={stackTopX + DSTACK_ENTRY_W + 28}
                  y2={stackTopY + stackBodyH - (view.stack.length + 1) * (DSTACK_ENTRY_H + DSTACK_GAP) + DSTACK_ENTRY_H / 2 + DSTACK_GAP}
                />
                <text
                  x={stackTopX + DSTACK_ENTRY_W + 32}
                  y={stackTopY + stackBodyH - (view.stack.length + 1) * (DSTACK_ENTRY_H + DSTACK_GAP) + DSTACK_ENTRY_H / 2 + DSTACK_GAP + 5}
                  className="decode-arrow__label decode-arrow__label--pop"
                >
                  POP
                </text>
              </g>
            ) : null}

            {/* working area */}
            <rect
              x={workAreaX - 4}
              y={DSTACK_PAD_TOP}
              width={DSTACK_WORK_W + 8}
              height={DSTACK_LABEL_H + stackBodyH + DSTACK_PAD_BOTTOM}
              rx={18}
              fill="url(#ds-work-bg)"
              stroke="rgba(31,157,139,0.15)"
              strokeWidth={1.5}
            />
            <text
              x={workAreaX + DSTACK_WORK_W / 2}
              y={DSTACK_PAD_TOP + 22}
              textAnchor="middle"
              className="decode-scene__label decode-scene__label--work"
            >
              工作区
            </text>

            {/* cur_str */}
            <rect
              x={workAreaX}
              y={workAreaY}
              width={DSTACK_WORK_W}
              height={DSTACK_ENTRY_H}
              rx={12}
              className={`decode-work__box${
                action.type === "pop" ? " decode-work__box--pop" : ""
              }`}
            />
            <text
              x={workAreaX + 12}
              y={workAreaY + 20}
              className="decode-work__label"
            >
              cur_str
            </text>
            <text
              x={workAreaX + 12}
              y={workAreaY + 42}
              className="decode-work__value"
            >
              {view.currentStr === "" ? '""' : `"${view.currentStr.length > 18 ? view.currentStr.slice(0, 16) + "…" : view.currentStr}"`}
            </text>

            {/* cur_num */}
            <rect
              x={workAreaX}
              y={workAreaY + DSTACK_ENTRY_H + DSTACK_GAP}
              width={DSTACK_WORK_W}
              height={DSTACK_ENTRY_H}
              rx={12}
              className="decode-work__box"
            />
            <text
              x={workAreaX + 12}
              y={workAreaY + DSTACK_ENTRY_H + DSTACK_GAP + 20}
              className="decode-work__label"
            >
              cur_num
            </text>
            <text
              x={workAreaX + 12}
              y={workAreaY + DSTACK_ENTRY_H + DSTACK_GAP + 42}
              className="decode-work__value"
            >
              {view.currentNum}
            </text>

            {/* result preview at bottom of work area */}
            {action.type === "pop" ? (
              <g className="decode-result">
                <rect
                  x={workAreaX}
                  y={workAreaY + 2 * (DSTACK_ENTRY_H + DSTACK_GAP) + 12}
                  width={DSTACK_WORK_W}
                  height={DSTACK_ENTRY_H + 8}
                  rx={12}
                  className="decode-result__box"
                />
                <text
                  x={workAreaX + 12}
                  y={workAreaY + 2 * (DSTACK_ENTRY_H + DSTACK_GAP) + 32}
                  className="decode-result__label"
                >
                  {action.entry.num}× 重复 → 拼接
                </text>
                <text
                  x={workAreaX + 12}
                  y={workAreaY + 2 * (DSTACK_ENTRY_H + DSTACK_GAP) + 56}
                  className="decode-result__value"
                >
                  {action.resultStr.length > 20
                    ? `"${action.resultStr.slice(0, 18)}…"`
                    : `"${action.resultStr}"`}
                </text>
              </g>
            ) : null}
          </svg>
        </div>

        <div className="legend-row">
          <span>当前扫描字符</span>
          <span>数字 / 括号</span>
          <span>栈中保存的上下文</span>
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
            <span>cur_str</span>
            <strong>&quot;{view.currentStr}&quot;</strong>
          </div>
          <div className="stats-grid__item">
            <span>cur_num</span>
            <strong>{view.currentNum}</strong>
          </div>
          <div className="stats-grid__item">
            <span>stack.len</span>
            <strong>{view.stack.length}</strong>
          </div>
        </div>

        <div>
          <h3 className="details-card__title">当前累积字符串</h3>
          <p className="details-card__empty">
            {view.currentStr === "" ? '""\uff08\u7a7a\uff09' : `"${view.currentStr}"`}
          </p>
        </div>

        <div>
          <h3 className="details-card__title">栈内容</h3>
          {view.stack.length === 0 ? (
            <p className="details-card__empty">栈为空</p>
          ) : (
            <div className="trie-history">
              {view.stack.map((entry, index) => (
                <div
                  key={index}
                  className="trie-history__item"
                >
                  <strong>#{index}</strong>
                  <span>
                    str=&quot;{entry.str}&quot;, num={entry.num}
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
  const decodeStringFrame = isDecodeStringView(frame.view);
  const coinChangeFrame = isCoinChangeView(frame.view);
  const specialLayout = trieFrame || decodeStringFrame || coinChangeFrame;

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

      {specialLayout ? controls : null}

      <div
        className={`animation-player__grid${
          specialLayout ? " animation-player__grid--trie" : ""
        }`}
      >
        {trieFrame
          ? renderTrieStage(problem, frameIndex, frame.view as TrieView)
          : decodeStringFrame
            ? renderDecodeStringStage(problem, frameIndex, frame.view as DecodeStringView)
            : coinChangeFrame
              ? renderCoinChangeStage(problem, frameIndex, frame.view as CoinChangeView)
              : renderPartitionStage(problem, frameIndex)}
      </div>

      {specialLayout ? null : controls}

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
