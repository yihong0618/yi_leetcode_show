export type FramePhase = "preprocess" | "scan" | "close" | "done";
export type CodeStep = FramePhase;

export interface Segment {
  start: number;
  end: number;
  label: string;
  length: number;
  colorIndex: number;
}

export interface VariableItem {
  name: string;
  value: string;
}

export interface InspectBlock {
  label: string;
  value: string;
}

export interface TrieNodeSnapshot {
  id: string;
  prefix: string;
  depth: number;
  isTerminal: boolean;
  childKeys: string[];
  isActive: boolean;
  isCurrent: boolean;
  isNew: boolean;
}

export interface TrieHistoryItem {
  index: number;
  name: string;
  argument: string;
  output: unknown;
}

export interface TrieView {
  kind: "trie";
  currentOperationIndex: number | null;
  currentOperationName: string | null;
  currentArgument: string | null;
  currentPrefix: string;
  nodes: TrieNodeSnapshot[];
  history: TrieHistoryItem[];
}

export interface PartitionLabelsView {
  kind: "partition-labels";
  characters: string[];
}

export interface DecodeStringStackEntry {
  str: string;
  num: number;
}

export type DecodeStackAction =
  | { type: "idle" }
  | { type: "push"; entry: DecodeStringStackEntry }
  | { type: "pop"; entry: DecodeStringStackEntry; resultStr: string };

export interface DecodeStringView {
  kind: "decode-string";
  characters: string[];
  stack: DecodeStringStackEntry[];
  currentStr: string;
  currentNum: string;
  action: DecodeStackAction;
}

export type AnimationFrameView = PartitionLabelsView | TrieView | DecodeStringView;

export interface AnimationFrame {
  id: string;
  phase: FramePhase;
  codeStep: CodeStep;
  title: string;
  caption: string;
  currentIndex: number | null;
  currentChar: string | null;
  rangeStart: number;
  rangeEnd: number;
  result: unknown[];
  closedSegments: Segment[];
  focusChar: string | null;
  mappedChars: string[];
  lastMap: Record<string, number>;
  view?: AnimationFrameView;
  variables?: VariableItem[];
  inspectBlocks?: InspectBlock[];
}

export interface ProblemVisualization {
  inputValue: string;
  expectedOutput: unknown;
  lastOrder: string[];
  frames: AnimationFrame[];
}

export interface SolutionDefinition {
  id: string;
  label: string;
  source: string;
  sourceUrl?: string;
  code: string;
  highlightLines: Record<CodeStep, number[]>;
}

export interface SingleInputPythonEntry {
  mode?: "single-input";
  fallbackFunctionName: string;
  solutionClassName: string;
  solutionMethodName: string;
}

export interface DesignClassPythonEntry {
  mode: "design-class";
  fallbackFunctionName: string;
  solutionClassName: string;
}

export type PythonEntry = SingleInputPythonEntry | DesignClassPythonEntry;

export interface ProblemDefinition {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  prompt: string;
  summary: string;
  algorithmNotes: string[];
  inputLabel: string;
  defaultInput: string;
  inputPlaceholder?: string;
  inputMultiline?: boolean;
  leetcodeUrl: string;
  defaultSolutionId: string;
  solutions: SolutionDefinition[];
  pythonEntry: PythonEntry;
  buildVisualization: (input: string) => ProblemVisualization;
}

export type AnimationProblem = ProblemDefinition & ProblemVisualization;
