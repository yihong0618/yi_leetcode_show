export type FramePhase = "preprocess" | "scan" | "close" | "done";
export type CodeStep = FramePhase;

export interface Segment {
  start: number;
  end: number;
  label: string;
  length: number;
  colorIndex: number;
}

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
  result: number[];
  closedSegments: Segment[];
  focusChar: string | null;
  mappedChars: string[];
  lastMap: Record<string, number>;
}

export interface ProblemVisualization {
  inputValue: string;
  expectedOutput: number[];
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
  leetcodeUrl: string;
  defaultSolutionId: string;
  solutions: SolutionDefinition[];
  pythonEntry: {
    fallbackFunctionName: string;
    solutionClassName: string;
    solutionMethodName: string;
  };
  buildVisualization: (input: string) => ProblemVisualization;
}

export type AnimationProblem = ProblemDefinition & ProblemVisualization;
