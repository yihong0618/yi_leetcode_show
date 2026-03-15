import type {
  AnimationFrame,
  CoinChangeView,
  ProblemDefinition,
  ProblemVisualization,
  SolutionDefinition,
  VariableItem,
  InspectBlock
} from "../types";

const defaultInput = "[1,2,5] 11";

const solveHelper = `
def solve(s):
    import json
    idx = s.index(']')
    coins = json.loads(s[:idx + 1])
    amount = int(s[idx + 1:].strip())
    return Solution().coinChange(coins, amount)`;

const solutions: SolutionDefinition[] = [
  {
    id: "dp-standard",
    label: "动态规划（标准写法）",
    source: "手工整理",
    code: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0
        for i in range(1, amount + 1):
            for c in coins:
                if c <= i:
                    dp[i] = min(dp[i], dp[i - c] + 1)
        return dp[amount] if dp[amount] != float('inf') else -1
${solveHelper}`,
    highlightLines: {
      preprocess: [3, 4],
      scan: [5, 6, 7],
      close: [8],
      done: [9]
    }
  },
  {
    id: "official",
    label: "官方题解",
    source: "LeetCode CN 官方",
    sourceUrl:
      "https://leetcode.cn/problems/coin-change/solutions/132979/322-ling-qian-dui-huan-by-leetcode-solution/",
    code: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0
        for coin in coins:
            for x in range(coin, amount + 1):
                dp[x] = min(dp[x], dp[x - coin] + 1)
        return dp[amount] if dp[amount] != float('inf') else -1
${solveHelper}`,
    highlightLines: {
      preprocess: [3, 4],
      scan: [5, 6],
      close: [7],
      done: [8]
    }
  },
  {
    id: "lingshen-style",
    label: "灵神风格 DP",
    source: "手工整理",
    code: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        dp = [0] + [amount + 1] * amount
        for i in range(1, amount + 1):
            for c in coins:
                if c <= i:
                    dp[i] = min(dp[i], dp[i - c] + 1)
        return -1 if dp[amount] > amount else dp[amount]
${solveHelper}`,
    highlightLines: {
      preprocess: [3],
      scan: [4, 5, 6],
      close: [7],
      done: [8]
    }
  },
  {
    id: "doocs",
    label: "LeetCode Doocs",
    source: "Doocs",
    sourceUrl: "https://leetcode.doocs.org/lc/322/",
    code: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        n = amount
        f = [0] + [n + 1] * n
        for x in range(1, n + 1):
            for c in coins:
                if c <= x:
                    f[x] = min(f[x], f[x - c] + 1)
        return -1 if f[n] > n else f[n]
${solveHelper}`,
    highlightLines: {
      preprocess: [3, 4],
      scan: [5, 6, 7],
      close: [8],
      done: [9]
    }
  },
  {
    id: "bfs",
    label: "BFS 解法",
    source: "手工整理",
    code: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        if amount == 0:
            return 0
        visited = {0}
        queue = [0]
        steps = 0
        while queue:
            steps += 1
            next_queue = []
            for curr in queue:
                for c in coins:
                    nxt = curr + c
                    if nxt == amount:
                        return steps
                    if nxt < amount and nxt not in visited:
                        visited.add(nxt)
                        next_queue.append(nxt)
            queue = next_queue
        return -1
${solveHelper}`,
    highlightLines: {
      preprocess: [3, 4, 5, 6, 7],
      scan: [10, 11, 12, 13],
      close: [14, 15, 16, 17],
      done: [20]
    }
  }
];

function parseInput(input: string): { coins: number[]; amount: number } | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  try {
    const bracketEnd = trimmed.indexOf("]");
    if (bracketEnd === -1) return null;

    const coins: unknown = JSON.parse(trimmed.slice(0, bracketEnd + 1));
    if (!Array.isArray(coins) || coins.some((c) => typeof c !== "number" || c <= 0)) {
      return null;
    }

    const rest = trimmed.slice(bracketEnd + 1).trim();
    if (rest.length === 0) return null;

    const amount = Number(rest);
    if (!Number.isInteger(amount) || amount < 0) return null;

    return { coins: coins as number[], amount };
  } catch {
    return null;
  }
}

function dpDisplay(val: number, inf: number): string {
  return val >= inf ? "∞" : String(val);
}

function makeView(
  coins: number[],
  dp: number[],
  currentAmount: number | null,
  currentCoin: number | null,
  referencedAmount: number | null,
  isUpdate: boolean
): CoinChangeView {
  return {
    kind: "coin-change",
    coins,
    dp: [...dp],
    currentAmount,
    currentCoin,
    referencedAmount,
    isUpdate
  };
}

function makeVars(entries: [string, string | number][]): VariableItem[] {
  return entries.map(([name, value]) => ({ name, value: String(value) }));
}

function makeDpBlock(dp: number[], inf: number): InspectBlock {
  const preview = dp
    .map((v, i) => `dp[${i}]=${dpDisplay(v, inf)}`)
    .join(", ");
  return { label: "dp", value: preview };
}

function buildFrames(input: string): ProblemVisualization {
  const parsed = parseInput(input);

  if (!parsed) {
    const emptyFrame: AnimationFrame = {
      id: "empty",
      phase: "preprocess",
      codeStep: "preprocess",
      title: "等待有效输入",
      caption: "请输入 [面值列表] 目标金额，例如 [1,2,5] 11。",
      currentIndex: null,
      currentChar: null,
      rangeStart: 0,
      rangeEnd: 0,
      result: [],
      closedSegments: [],
      focusChar: null,
      mappedChars: [],
      lastMap: {},
      view: makeView([], [0], null, null, null, false),
      variables: makeVars([["coins", "--"], ["amount", "--"], ["dp[0]", "0"]]),
      inspectBlocks: [{ label: "dp", value: "[0]" }]
    };
    return {
      inputValue: input,
      expectedOutput: -1,
      lastOrder: [],
      frames: [emptyFrame]
    };
  }

  const { coins, amount } = parsed;

  if (amount === 0) {
    return {
      inputValue: input,
      expectedOutput: 0,
      lastOrder: [],
      frames: [
        {
          id: "init",
          phase: "preprocess",
          codeStep: "preprocess",
          title: "初始化 DP 数组",
          caption: "目标金额为 0，不需要任何硬币，dp[0] = 0。",
          currentIndex: null,
          currentChar: null,
          rangeStart: 0,
          rangeEnd: 0,
          result: [],
          closedSegments: [],
          focusChar: null,
          mappedChars: [],
          lastMap: {},
          view: makeView(coins, [0], null, null, null, false),
          variables: makeVars([
            ["coins", `[${coins.join(",")}]`],
            ["amount", 0],
            ["dp[0]", 0]
          ]),
          inspectBlocks: [{ label: "dp", value: "dp[0]=0" }]
        },
        {
          id: "done",
          phase: "done",
          codeStep: "done",
          title: "返回答案",
          caption: "dp[0] = 0，凑出金额 0 需要 0 枚硬币。",
          currentIndex: null,
          currentChar: null,
          rangeStart: 0,
          rangeEnd: 0,
          result: [0],
          closedSegments: [],
          focusChar: null,
          mappedChars: [],
          lastMap: {},
          view: makeView(coins, [0], null, null, null, false),
          variables: makeVars([["ans", 0]]),
          inspectBlocks: [{ label: "dp", value: "dp[0]=0" }]
        }
      ]
    };
  }

  const INF = amount + 1;
  const dp = new Array(amount + 1).fill(INF);
  dp[0] = 0;

  const frames: AnimationFrame[] = [];

  // Preprocess: init dp
  frames.push({
    id: "init",
    phase: "preprocess",
    codeStep: "preprocess",
    title: "初始化 DP 数组",
    caption: `dp[0] = 0，其余初始化为 ∞（${INF}）。coins = [${coins.join(", ")}]，目标金额 = ${amount}。`,
    currentIndex: null,
    currentChar: null,
    rangeStart: 0,
    rangeEnd: 0,
    result: [],
    closedSegments: [],
    focusChar: null,
    mappedChars: [],
    lastMap: {},
    view: makeView(coins, dp, null, null, null, false),
    variables: makeVars([
      ["coins", `[${coins.join(",")}]`],
      ["amount", amount],
      ["dp[0]", 0],
      ["INF", INF]
    ]),
    inspectBlocks: [makeDpBlock(dp, INF)]
  });

  // DP iteration
  for (let i = 1; i <= amount; i++) {
    let triedAny = false;

    for (const c of coins) {
      if (c > i) continue;
      triedAny = true;

      const prev = dp[i - c];
      const candidate = prev + 1;
      const isUpdate = candidate < dp[i];

      if (isUpdate) {
        dp[i] = candidate;
      }

      const prevDisplay = dpDisplay(prev, INF);
      const dpDisplay_i = dpDisplay(dp[i], INF);

      frames.push({
        id: `scan-${i}-coin-${c}`,
        phase: "scan",
        codeStep: "scan",
        title: `dp[${i}]：尝试面值 ${c}`,
        caption: isUpdate
          ? `dp[${i - c}] + 1 = ${prevDisplay} + 1 = ${candidate}，优于当前 dp[${i}]，更新为 ${candidate}。`
          : `dp[${i - c}] + 1 = ${prevDisplay === "∞" ? "∞" : `${prevDisplay} + 1 = ${candidate}`}，不优于当前 dp[${i}] = ${dpDisplay_i}，跳过。`,
        currentIndex: i,
        currentChar: String(c),
        rangeStart: 0,
        rangeEnd: i,
        result: [],
        closedSegments: [],
        focusChar: null,
        mappedChars: [],
        lastMap: {},
        view: makeView(coins, dp, i, c, i - c, isUpdate),
        variables: makeVars([
          ["i", i],
          ["coin", c],
          [`dp[${i}]`, dpDisplay(dp[i], INF)],
          [`dp[${i - c}]`, prevDisplay],
          ["candidate", prevDisplay === "∞" ? "∞" : candidate],
          ["updated", isUpdate ? "✓" : "✗"]
        ]),
        inspectBlocks: [makeDpBlock(dp, INF)]
      });
    }

    // If no coin was applicable
    if (!triedAny) {
      frames.push({
        id: `scan-${i}-skip`,
        phase: "scan",
        codeStep: "scan",
        title: `dp[${i}]：无可用面值`,
        caption: `所有面值都大于 ${i}，dp[${i}] 保持 ∞。`,
        currentIndex: i,
        currentChar: null,
        rangeStart: 0,
        rangeEnd: i,
        result: [],
        closedSegments: [],
        focusChar: null,
        mappedChars: [],
        lastMap: {},
        view: makeView(coins, dp, i, null, null, false),
        variables: makeVars([
          ["i", i],
          [`dp[${i}]`, dpDisplay(dp[i], INF)]
        ]),
        inspectBlocks: [makeDpBlock(dp, INF)]
      });
    }

    // Close frame for this amount
    const finalVal = dpDisplay(dp[i], INF);
    frames.push({
      id: `close-${i}`,
      phase: "close",
      codeStep: "close",
      title: `dp[${i}] = ${finalVal}`,
      caption:
        dp[i] >= INF
          ? `无法用给定面值凑出金额 ${i}，dp[${i}] = ∞。`
          : `凑出金额 ${i} 最少需要 ${dp[i]} 枚硬币。`,
      currentIndex: i,
      currentChar: null,
      rangeStart: 0,
      rangeEnd: i,
      result: [],
      closedSegments: [],
      focusChar: null,
      mappedChars: [],
      lastMap: {},
      view: makeView(coins, dp, i, null, null, false),
      variables: makeVars([
        ["i", i],
        [`dp[${i}]`, finalVal]
      ]),
      inspectBlocks: [makeDpBlock(dp, INF)]
    });
  }

  const answer = dp[amount] >= INF ? -1 : dp[amount];

  frames.push({
    id: "done",
    phase: "done",
    codeStep: "done",
    title: "返回答案",
    caption:
      answer === -1
        ? `dp[${amount}] = ∞，无法凑出目标金额，返回 -1。`
        : `dp[${amount}] = ${answer}，最少需要 ${answer} 枚硬币。`,
    currentIndex: null,
    currentChar: null,
    rangeStart: 0,
    rangeEnd: amount,
    result: [answer],
    closedSegments: [],
    focusChar: null,
    mappedChars: [],
    lastMap: {},
    view: makeView(coins, dp, null, null, null, false),
    variables: makeVars([
      ["amount", amount],
      [`dp[${amount}]`, dpDisplay(dp[amount], INF)],
      ["ans", answer]
    ]),
    inspectBlocks: [makeDpBlock(dp, INF)]
  });

  return {
    inputValue: input,
    expectedOutput: answer,
    lastOrder: [],
    frames
  };
}

export const coinChangeProblem: ProblemDefinition = {
  id: "coin-change",
  title: "322. 零钱兑换",
  slug: "coin-change",
  difficulty: "Medium",
  prompt:
    "给定不同面额的硬币 coins 和一个总金额 amount，计算凑成总金额所需的最少硬币个数。如果无法凑出，返回 -1。",
  summary:
    "经典完全背包 DP：dp[i] 表示凑出金额 i 的最少硬币数。对于每个金额 i，遍历所有面值 c，取 dp[i-c]+1 的最小值。",
  algorithmNotes: [
    "dp[0] = 0，凑出金额 0 不需要硬币。",
    "对每个金额 i，枚举所有面值 c ≤ i，dp[i] = min(dp[i], dp[i-c] + 1)。",
    "如果 dp[amount] 仍为初始值（∞），说明无方案，返回 -1。"
  ],
  inputLabel: "coins & amount",
  defaultInput,
  inputPlaceholder: "[面值列表] 目标金额，如 [1,2,5] 11",
  leetcodeUrl: "https://leetcode.cn/problems/coin-change/description/",
  defaultSolutionId: solutions[0].id,
  solutions,
  pythonEntry: {
    fallbackFunctionName: "solve",
    solutionClassName: "Solution",
    solutionMethodName: "coinChange"
  },
  buildVisualization: buildFrames
};
