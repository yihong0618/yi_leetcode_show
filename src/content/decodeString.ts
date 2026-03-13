import type {
  AnimationFrame,
  DecodeStackAction,
  DecodeStringStackEntry,
  DecodeStringView,
  ProblemDefinition,
  ProblemVisualization,
  SolutionDefinition,
  VariableItem,
  InspectBlock
} from "../types";

const defaultInput = "3[a2[c]]";

const solutions: SolutionDefinition[] = [
  {
    id: "stack-standard",
    label: "栈解法（标准写法）",
    source: "手工整理",
    code: `class Solution:
    def decodeString(self, s: str) -> str:
        stack = []
        cur_str = ""
        cur_num = 0
        for ch in s:
            if ch.isdigit():
                cur_num = cur_num * 10 + int(ch)
            elif ch == '[':
                stack.append((cur_str, cur_num))
                cur_str = ""
                cur_num = 0
            elif ch == ']':
                prev_str, num = stack.pop()
                cur_str = prev_str + cur_str * num
            else:
                cur_str += ch
        return cur_str`,
    highlightLines: {
      preprocess: [3, 4, 5],
      scan: [7, 8, 9, 10, 11, 12, 16, 17],
      close: [13, 14, 15],
      done: [18]
    }
  },
  {
    id: "official",
    label: "官方题解",
    source: "LeetCode CN 官方",
    sourceUrl:
      "https://leetcode.cn/problems/decode-string/solutions/264391/zi-fu-chuan-jie-ma-by-leetcode-solution/",
    code: `class Solution:
    def decodeString(self, s: str) -> str:
        stack = []
        res = ""
        multi = 0
        for c in s:
            if c == '[':
                stack.append([multi, res])
                res = ""
                multi = 0
            elif c == ']':
                cur_multi, last_res = stack.pop()
                res = last_res + cur_multi * res
            elif '0' <= c <= '9':
                multi = multi * 10 + int(c)
            else:
                res += c
        return res`,
    highlightLines: {
      preprocess: [3, 4, 5],
      scan: [7, 8, 9, 10, 15, 16, 17, 18],
      close: [11, 12, 13, 14],
      done: [19]
    }
  },
  {
    id: "recursive",
    label: "递归解法",
    source: "手工整理",
    code: `class Solution:
    def decodeString(self, s: str) -> str:
        self.i = 0

        def decode() -> str:
            res = ""
            num = 0
            while self.i < len(s):
                ch = s[self.i]
                self.i += 1
                if ch.isdigit():
                    num = num * 10 + int(ch)
                elif ch == '[':
                    inner = decode()
                    res += num * inner
                    num = 0
                elif ch == ']':
                    return res
                else:
                    res += ch
            return res

        return decode()`,
    highlightLines: {
      preprocess: [3, 6, 7],
      scan: [8, 9, 10, 11, 12, 20, 21],
      close: [13, 14, 15, 16, 17, 18],
      done: [23]
    }
  },
  {
    id: "doocs",
    label: "LeetCode Doocs",
    source: "Doocs",
    sourceUrl: "https://leetcode.doocs.org/lc/394/",
    code: `class Solution:
    def decodeString(self, s: str) -> str:
        stack = []
        num = 0
        res = ""
        for c in s:
            if c.isdigit():
                num = num * 10 + int(c)
            elif c == '[':
                stack.append((res, num))
                res, num = "", 0
            elif c == ']':
                last_res, cnt = stack.pop()
                res = last_res + cnt * res
            else:
                res += c
        return res`,
    highlightLines: {
      preprocess: [3, 4, 5],
      scan: [7, 8, 9, 10, 11, 16, 17],
      close: [12, 13, 14, 15],
      done: [18]
    }
  }
];

function decodeStringExpected(s: string): string {
  const stack: { str: string; num: number }[] = [];
  let curStr = "";
  let curNum = 0;
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") {
      curNum = curNum * 10 + Number(ch);
    } else if (ch === "[") {
      stack.push({ str: curStr, num: curNum });
      curStr = "";
      curNum = 0;
    } else if (ch === "]") {
      const top = stack.pop()!;
      curStr = top.str + curStr.repeat(top.num);
    } else {
      curStr += ch;
    }
  }
  return curStr;
}

function makeView(
  characters: string[],
  stack: DecodeStringStackEntry[],
  currentStr: string,
  currentNum: string,
  action: DecodeStackAction = { type: "idle" }
): DecodeStringView {
  return {
    kind: "decode-string",
    characters,
    stack: stack.map((e) => ({ ...e })),
    currentStr,
    currentNum,
    action
  };
}

function buildFrames(input: string): ProblemVisualization {
  const text = input.trim();
  const characters = text.split("");

  if (text.length === 0) {
    return {
      inputValue: text,
      expectedOutput: "",
      lastOrder: [],
      frames: [
        {
          id: "intro-empty",
          phase: "preprocess",
          codeStep: "preprocess",
          title: "先输入一个编码字符串",
          caption: "当前输入为空。",
          currentIndex: null,
          currentChar: null,
          rangeStart: 0,
          rangeEnd: 0,
          result: [],
          closedSegments: [],
          focusChar: null,
          mappedChars: [],
          lastMap: {},
          view: makeView([], [], "", ""),
          variables: [
            { name: "stack", value: "[]" },
            { name: "cur_str", value: '""' },
            { name: "cur_num", value: "0" }
          ],
          inspectBlocks: []
        },
        {
          id: "done-empty",
          phase: "done",
          codeStep: "done",
          title: "返回答案",
          caption: '空字符串解码结果是 ""。',
          currentIndex: null,
          currentChar: null,
          rangeStart: 0,
          rangeEnd: 0,
          result: [],
          closedSegments: [],
          focusChar: null,
          mappedChars: [],
          lastMap: {},
          view: makeView([], [], "", ""),
          variables: [
            { name: "cur_str", value: '""' },
            { name: "result", value: '""' }
          ],
          inspectBlocks: []
        }
      ]
    };
  }

  const expected = decodeStringExpected(text);
  const frames: AnimationFrame[] = [];

  // State for simulation
  const stack: DecodeStringStackEntry[] = [];
  let curStr = "";
  let curNum = 0;

  // Phase: preprocess - introduce the problem
  frames.push({
    id: "intro",
    phase: "preprocess",
    codeStep: "preprocess",
    title: "Phase 1: 初始化栈和变量",
    caption:
      "用一个栈来处理嵌套结构。cur_str 记录当前层正在拼的字符串，cur_num 记录当前层碰到的数字。",
    currentIndex: null,
    currentChar: null,
    rangeStart: 0,
    rangeEnd: 0,
    result: [],
    closedSegments: [],
    focusChar: null,
    mappedChars: [],
    lastMap: {},
    view: makeView(characters, [], "", "0"),
    variables: [
      { name: "stack", value: "[]" },
      { name: "cur_str", value: '""' },
      { name: "cur_num", value: "0" }
    ],
    inspectBlocks: [
      { label: "输入", value: text },
      { label: "预期输出", value: expected }
    ]
  });

  // Phase: scan each character
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch >= "0" && ch <= "9") {
      curNum = curNum * 10 + Number(ch);
      frames.push({
        id: `scan-${i}`,
        phase: "scan",
        codeStep: "scan",
        title: `扫描索引 ${i}：数字 '${ch}'`,
        caption: `碰到数字 ${ch}，将 cur_num 更新为 ${curNum}。数字可能是多位的，所以要把旧值乘以 10 再加上当前位。`,
        currentIndex: i,
        currentChar: ch,
        rangeStart: 0,
        rangeEnd: i,
        result: [],
        closedSegments: [],
        focusChar: ch,
        mappedChars: [],
        lastMap: {},
        view: makeView(characters, stack, curStr, String(curNum)),
        variables: buildVars(ch, i, stack, curStr, curNum),
        inspectBlocks: buildBlocks(stack, curStr)
      });
    } else if (ch === "[") {
      const pushedEntry = { str: curStr, num: curNum };
      stack.push(pushedEntry);
      const pushedStr = curStr;
      const pushedNum = curNum;
      curStr = "";
      curNum = 0;
      frames.push({
        id: `scan-${i}`,
        phase: "scan",
        codeStep: "scan",
        title: `扫描索引 ${i}：遇到 '['`,
        caption: `碰到 [，把当前的 (cur_str="${pushedStr}", cur_num=${pushedNum}) 压入栈中，然后重置 cur_str 和 cur_num，准备处理括号内的子串。`,
        currentIndex: i,
        currentChar: ch,
        rangeStart: 0,
        rangeEnd: i,
        result: [],
        closedSegments: [],
        focusChar: ch,
        mappedChars: [],
        lastMap: {},
        view: makeView(characters, stack, curStr, String(curNum), { type: "push", entry: pushedEntry }),
        variables: buildVars(ch, i, stack, curStr, curNum),
        inspectBlocks: buildBlocks(stack, curStr)
      });
    } else if (ch === "]") {
      const top = stack.pop()!;
      const before = curStr;
      curStr = top.str + curStr.repeat(top.num);
      frames.push({
        id: `close-${i}`,
        phase: "close",
        codeStep: "close",
        title: `扫描索引 ${i}：遇到 ']'`,
        caption: `碰到 ]，从栈顶弹出 (str="${top.str}", num=${top.num})。把当前的 "${before}" 重复 ${top.num} 次，再拼到 "${top.str}" 后面，得到 "${curStr}"。`,
        currentIndex: i,
        currentChar: ch,
        rangeStart: 0,
        rangeEnd: i,
        result: [],
        closedSegments: [],
        focusChar: ch,
        mappedChars: [],
        lastMap: {},
        view: makeView(characters, stack, curStr, String(curNum), { type: "pop", entry: top, resultStr: curStr }),
        variables: buildVars(ch, i, stack, curStr, curNum),
        inspectBlocks: buildBlocks(stack, curStr)
      });
    } else {
      curStr += ch;
      frames.push({
        id: `scan-${i}`,
        phase: "scan",
        codeStep: "scan",
        title: `扫描索引 ${i}：字母 '${ch}'`,
        caption: `碰到字母 ${ch}，直接追加到 cur_str 末尾，cur_str 变成 "${curStr}"。`,
        currentIndex: i,
        currentChar: ch,
        rangeStart: 0,
        rangeEnd: i,
        result: [],
        closedSegments: [],
        focusChar: ch,
        mappedChars: [],
        lastMap: {},
        view: makeView(characters, stack, curStr, String(curNum)),
        variables: buildVars(ch, i, stack, curStr, curNum),
        inspectBlocks: buildBlocks(stack, curStr)
      });
    }
  }

  // Phase: done
  frames.push({
    id: "done",
    phase: "done",
    codeStep: "done",
    title: "返回答案",
    caption: `扫描完成，cur_str 就是最终解码结果："${curStr}"。`,
    currentIndex: null,
    currentChar: null,
    rangeStart: text.length - 1,
    rangeEnd: text.length - 1,
    result: [],
    closedSegments: [],
    focusChar: null,
    mappedChars: [],
    lastMap: {},
    view: makeView(characters, stack, curStr, "0"),
    variables: [
      { name: "cur_str", value: `"${curStr}"` },
      { name: "result", value: `"${curStr}"` }
    ],
    inspectBlocks: [
      { label: "解码结果", value: curStr }
    ]
  });

  return {
    inputValue: text,
    expectedOutput: expected,
    lastOrder: [],
    frames
  };
}

function buildVars(
  ch: string,
  index: number,
  stack: DecodeStringStackEntry[],
  curStr: string,
  curNum: number
): VariableItem[] {
  return [
    { name: "i", value: String(index) },
    { name: "ch", value: ch },
    { name: "cur_str", value: `"${curStr}"` },
    { name: "cur_num", value: String(curNum) },
    { name: "stack.len", value: String(stack.length) }
  ];
}

function buildBlocks(
  stack: DecodeStringStackEntry[],
  curStr: string
): InspectBlock[] {
  const stackPreview =
    stack.length === 0
      ? "[]"
      : JSON.stringify(
          stack.map((e) => ({ str: e.str, num: e.num })),
          null,
          2
        );
  return [
    { label: "stack", value: stackPreview },
    { label: "cur_str", value: `"${curStr}"` }
  ];
}

export const decodeStringProblem: ProblemDefinition = {
  id: "decode-string",
  title: "394. 字符串解码",
  slug: "decode-string",
  difficulty: "Medium",
  prompt:
    "给定一个经过编码的字符串，返回它解码后的字符串。编码规则为：k[encoded_string]，表示其中方括号内部的 encoded_string 正好重复 k 次。",
  summary:
    "这题的核心是用栈来处理嵌套括号。遇到 [ 时把当前状态压栈，遇到 ] 时弹出栈顶并拼接重复后的字符串。数字可能是多位数，字母直接追加到当前字符串。",
  algorithmNotes: [
    "维护 cur_str（当前层正在拼的字符串）和 cur_num（当前层遇到的重复次数）。",
    "遇到数字：cur_num = cur_num * 10 + int(ch)，处理多位数。",
    "遇到 [：把 (cur_str, cur_num) 压入栈，然后重置它们。",
    "遇到 ]：从栈顶弹出 (prev_str, num)，cur_str = prev_str + cur_str * num。",
    "遇到字母：直接追加到 cur_str。"
  ],
  inputLabel: "s",
  defaultInput: defaultInput,
  leetcodeUrl: "https://leetcode.cn/problems/decode-string/description/",
  defaultSolutionId: solutions[0].id,
  solutions,
  pythonEntry: {
    fallbackFunctionName: "solve",
    solutionClassName: "Solution",
    solutionMethodName: "decodeString"
  },
  buildVisualization: buildFrames
};
