import type {
  AnimationFrame,
  ProblemDefinition,
  ProblemVisualization,
  SolutionDefinition,
  Segment
} from "../types";

const inputValue = "ababcbacadefegdehijhklij";

const solutions: SolutionDefinition[] = [
  {
    id: "lingshen-style",
    label: "灵神风格贪心",
    source: "手工整理",
    code: `class Solution:
    def partitionLabels(self, s: str) -> list[int]:
        last = {c: i for i, c in enumerate(s)}
        ans = []
        start = end = 0
        for i, c in enumerate(s):
            end = max(end, last[c])
            if i == end:
                ans.append(i - start + 1)
                start = i + 1
        return ans`,
    highlightLines: {
      preprocess: [3],
      scan: [6, 7],
      close: [8, 9, 10],
      done: [11]
    }
  },
  {
    id: "official",
    label: "官方题解",
    source: "LeetCode 官方",
    sourceUrl:
      "https://leetcode.cn/problems/partition-labels/solutions/84723/hua-fen-zi-mu-qu-jian-by-leetcode-solution/",
    code: `class Solution:
    def partitionLabels(self, s: str) -> list[int]:
        last = {ch: i for i, ch in enumerate(s)}
        ans = []
        start = end = 0
        for i, ch in enumerate(s):
            end = max(end, last[ch])
            if i == end:
                ans.append(end - start + 1)
                start = i + 1
        return ans`,
    highlightLines: {
      preprocess: [3],
      scan: [6, 7],
      close: [8, 9, 10],
      done: [11]
    }
  },
  {
    id: "doocs",
    label: "LeetCode Doocs",
    source: "Doocs",
    sourceUrl:
      "https://leetcode.doocs.org/lc/763/",
    code: `class Solution:
    def partitionLabels(self, s: str) -> list[int]:
        last = {ch: i for i, ch in enumerate(s)}
        result = []
        start = end = 0
        for i, ch in enumerate(s):
            end = max(end, last[ch])
            if i == end:
                result.append(i - start + 1)
                start = i + 1
        return result`,
    highlightLines: {
      preprocess: [3],
      scan: [6, 7],
      close: [8, 9, 10],
      done: [11]
    }
  },
  {
    id: "leetcode-ca",
    label: "LeetCode.ca",
    source: "LeetCode.ca",
    sourceUrl: "https://leetcode.ca/2018-01-01-763-Partition-Labels/",
    code: `class Solution:
    def partitionLabels(self, s: str) -> list[int]:
        right = {ch: i for i, ch in enumerate(s)}
        answer = []
        left = farthest = 0
        for i, ch in enumerate(s):
            farthest = max(farthest, right[ch])
            if i == farthest:
                answer.append(farthest - left + 1)
                left = i + 1
        return answer`,
    highlightLines: {
      preprocess: [3],
      scan: [6, 7],
      close: [8, 9, 10],
      done: [11]
    }
  },
  {
    id: "simplyleet",
    label: "SimplyLeet",
    source: "SimplyLeet",
    sourceUrl:
      "https://www.simplyleet.com/partition-labels",
    code: `class Solution:
    def partitionLabels(self, s: str) -> list[int]:
        last = {}
        for i, ch in enumerate(s):
            last[ch] = i
        ans = []
        start = end = 0
        for i, ch in enumerate(s):
            end = max(end, last[ch])
            if i == end:
                ans.append(i - start + 1)
                start = i + 1
        return ans`,
    highlightLines: {
      preprocess: [3, 4],
      scan: [7, 8],
      close: [9, 10, 11],
      done: [12]
    }
  }
];

function buildFrames(text: string): ProblemVisualization {
  if (text.length === 0) {
    return {
      inputValue: text,
      expectedOutput: [],
      lastOrder: [],
      frames: [
        {
          id: "intro-empty",
          phase: "preprocess",
          codeStep: "preprocess",
          title: "先输入一个字符串",
          caption: "当前输入为空，所以还没有字符可以预处理。",
          currentIndex: null,
          currentChar: null,
          rangeStart: 0,
          rangeEnd: 0,
          result: [],
          closedSegments: [],
          focusChar: null,
          mappedChars: [],
          lastMap: {}
        },
        {
          id: "done-empty",
          phase: "done",
          codeStep: "done",
          title: "返回答案",
          caption: "空字符串没有片段，结果是 []。",
          currentIndex: null,
          currentChar: null,
          rangeStart: 0,
          rangeEnd: 0,
          result: [],
          closedSegments: [],
          focusChar: null,
          mappedChars: [],
          lastMap: {}
        }
      ]
    };
  }

  const lastMap: Record<string, number> = {};
  const lastOrder: string[] = [];
  const seenChars = new Set<string>();

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    lastMap[char] = index;
    if (!seenChars.has(char)) {
      seenChars.add(char);
      lastOrder.push(char);
    }
  }

  const frames: AnimationFrame[] = [
    {
      id: "intro",
      phase: "preprocess",
      codeStep: "preprocess",
      title: "Phase 1: 先统计每个字符的最后出现位置",
      caption:
        "只要知道每个字符最远会延伸到哪里，后面的扫描就能实时维护当前片段的右边界。",
      currentIndex: null,
      currentChar: null,
      rangeStart: 0,
      rangeEnd: 0,
      result: [],
      closedSegments: [],
      focusChar: null,
      mappedChars: [],
      lastMap
    }
  ];

  lastOrder.forEach((char, index) => {
    frames.push({
      id: `map-${char}`,
      phase: "preprocess",
      codeStep: "preprocess",
      title: `记录字符 ${char} 的最远下标`,
      caption: `字符 ${char} 最后一次出现是在索引 ${lastMap[char]}。`,
      currentIndex: lastMap[char],
      currentChar: char,
      rangeStart: 0,
      rangeEnd: lastMap[char],
      result: [],
      closedSegments: [],
      focusChar: char,
      mappedChars: lastOrder.slice(0, index + 1),
      lastMap
    });
  });

  let start = 0;
  let end = 0;
  const result: number[] = [];
  const closedSegments: Segment[] = [];

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const previousEnd = end;
    end = Math.max(end, lastMap[char]);

    frames.push({
      id: `scan-${index}`,
      phase: "scan",
      codeStep: "scan",
      title: `扫描索引 ${index}`,
      caption:
        end > previousEnd
          ? `看到 ${char}，把右边界扩到 ${end}，因为这个字符在后面还会再次出现。`
          : `看到 ${char}，右边界保持在 ${end}，说明它已经被当前片段完整覆盖。`,
      currentIndex: index,
      currentChar: char,
      rangeStart: start,
      rangeEnd: end,
      result: [...result],
      closedSegments: [...closedSegments],
      focusChar: char,
      mappedChars: lastOrder,
      lastMap
    });

    if (index === end) {
      const segment: Segment = {
        start,
        end,
        label: text.slice(start, end + 1),
        length: end - start + 1,
        colorIndex: closedSegments.length
      };

      result.push(segment.length);

      frames.push({
        id: `close-${index}`,
        phase: "close",
        codeStep: "close",
        title: `在索引 ${index} 处切开`,
        caption: `此时 i == end，片段 ${segment.label} 内的字符不会再去后面串场，可以安全切开，长度是 ${segment.length}。`,
        currentIndex: index,
        currentChar: char,
        rangeStart: start,
        rangeEnd: end,
        result: [...result],
        closedSegments: [...closedSegments, segment],
        focusChar: char,
        mappedChars: lastOrder,
        lastMap
      });

      closedSegments.push(segment);
      start = index + 1;
      end = start;
    }
  }

  frames.push({
    id: "done",
    phase: "done",
    codeStep: "done",
    title: "返回答案",
    caption: `最终分成 ${result.length} 段，结果是 ${JSON.stringify(result)}。`,
    currentIndex: null,
    currentChar: null,
    rangeStart: text.length - 1,
    rangeEnd: text.length - 1,
    result: [...result],
    closedSegments: [...closedSegments],
    focusChar: null,
    mappedChars: lastOrder,
    lastMap
  });

  return {
    inputValue: text,
    frames,
    lastOrder,
    expectedOutput: result
  };
}

export const partitionLabelsProblem: ProblemDefinition = {
  id: "partition-labels",
  title: "763. 划分字母区间",
  slug: "partition-labels",
  difficulty: "Medium",
  prompt: "把字符串尽可能切成更多片段，并保证每个字母最多只出现在其中一个片段里。",
  summary:
    "这题的关键不是回溯，而是把“当前片段最远必须覆盖到哪里”维护出来。每读到一个字符，就用它的最后出现位置更新右边界；只有扫描指针追上右边界时，当前片段才真正闭合。",
  algorithmNotes: [
    "先预处理 last[c]，让每个字符都知道自己最后一次出现的位置。",
    "扫描时维护当前片段的 start 和 end，end 表示这个片段至少要覆盖到的最远索引。",
    "一旦 i == end，说明片段里的所有字符都已经在当前范围内收干净，可以立刻切一刀。"
  ],
  inputLabel: "s",
  defaultInput: inputValue,
  leetcodeUrl: "https://leetcode.cn/problems/partition-labels/description/",
  defaultSolutionId: solutions[0].id,
  solutions,
  pythonEntry: {
    fallbackFunctionName: "solve",
    solutionClassName: "Solution",
    solutionMethodName: "partitionLabels"
  },
  buildVisualization: buildFrames
};
