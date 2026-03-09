import type {
  AnimationFrame,
  CodeStep,
  FramePhase,
  InspectBlock,
  ProblemDefinition,
  ProblemVisualization,
  SolutionDefinition,
  TrieHistoryItem,
  TrieNodeSnapshot,
  VariableItem
} from "../types";

const defaultInput = `{
  "operations": ["Trie", "insert", "insert", "insert", "insert", "insert", "insert", "insert", "search", "search", "startsWith", "startsWith", "search", "startsWith"],
  "arguments": [[], ["a"], ["in"], ["inn"], ["tea"], ["ted"], ["ten"], ["to"], ["ted"], ["te"], ["te"], ["in"], ["to"], ["ta"]]
}`;

type TrieOperationName = "Trie" | "insert" | "search" | "startsWith";

interface ParsedTrieInput {
  operations: TrieOperationName[];
  arguments: string[][];
}

interface ParseErrorResult {
  error: string;
}

interface MutableTrieNode {
  id: string;
  prefix: string;
  depth: number;
  isTerminal: boolean;
  children: Map<string, MutableTrieNode>;
}

interface TrieFrameOptions {
  id: string;
  phase: FramePhase;
  codeStep: CodeStep;
  title: string;
  caption: string;
  root: MutableTrieNode;
  outputs: unknown[];
  history: TrieHistoryItem[];
  operationIndex: number | null;
  operationName: TrieOperationName | null;
  operationArgument: string | null;
  currentPrefix: string;
  currentChar: string | null;
  activeNodeIds: Set<string>;
  currentNodeId: string;
  newNodeIds?: Set<string>;
  returnValue?: unknown;
}

const solutions: SolutionDefinition[] = [
  {
    id: "official-manual",
    label: "官方题解思路",
    source: "LeetCode CN 官方题解（Python 3 手工整理）",
    sourceUrl:
      "https://leetcode.cn/problems/implement-trie-prefix-tree/solutions/717239/shi-xian-trie-qian-zhui-shu-by-leetcode-ti500/",
    code: `class Trie:
    def __init__(self):
        self.children = {}
        self.is_end = False

    def insert(self, word: str) -> None:
        node = self
        for ch in word:
            if ch not in node.children:
                node.children[ch] = Trie()
            node = node.children[ch]
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self._find(word)
        return node is not None and node.is_end

    def startsWith(self, prefix: str) -> bool:
        return self._find(prefix) is not None

    def _find(self, text: str):
        node = self
        for ch in text:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node`,
    highlightLines: {
      preprocess: [2, 3, 4],
      scan: [8, 9, 10, 11, 23, 24, 26],
      close: [12, 15, 16, 19, 25, 27],
      done: [16, 19, 27]
    }
  },
  {
    id: "tunsuy-defaultdict",
    label: "高赞讨论 · defaultdict",
    source: "LeetCode CN 讨论 · tunsuy",
    sourceUrl: "https://leetcode.cn/discuss/post/252360/",
    code: `from collections import defaultdict

class Trie:
    def __init__(self):
        self.children = defaultdict(Trie)
        self.is_end = False

    def insert(self, word: str) -> None:
        node = self
        for ch in word:
            node = node.children[ch]
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return node.is_end

    def startsWith(self, prefix: str) -> bool:
        node = self
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True`,
    highlightLines: {
      preprocess: [4, 5, 6],
      scan: [10, 11, 16, 17, 19, 24, 25, 27],
      close: [12, 18, 20, 26, 28],
      done: [20, 28]
    }
  },
  {
    id: "paipai-setdefault",
    label: "高赞讨论 · setdefault",
    source: "LeetCode CN 讨论 · 派派",
    sourceUrl: "https://leetcode.cn/circle/discuss/PSNHCs/",
    code: `class Trie:
    def __init__(self):
        self.children = {}
        self.is_end = False

    def insert(self, word: str) -> None:
        node = self
        for ch in word:
            node = node.children.setdefault(ch, Trie())
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self
        for ch in word:
            node = node.children.get(ch)
            if node is None:
                return False
        return node.is_end

    def startsWith(self, prefix: str) -> bool:
        node = self
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return False
        return True`,
    highlightLines: {
      preprocess: [2, 3, 4],
      scan: [8, 9, 14, 15, 16, 22, 23, 24],
      close: [10, 17, 18, 25, 26],
      done: [18, 26]
    }
  },
  {
    id: "chen-array-manual",
    label: "高赞讨论 · 数组子节点",
    source: "LeetCode CN 讨论 · 晨（Python 3 手工整理）",
    sourceUrl: "https://leetcode.cn/circle/discuss/YQaD2K/",
    code: `class Trie:
    def __init__(self):
        self.children = [None] * 26
        self.is_end = False

    def insert(self, word: str) -> None:
        node = self
        for ch in word:
            idx = ord(ch) - ord("a")
            if node.children[idx] is None:
                node.children[idx] = Trie()
            node = node.children[idx]
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self._search_prefix(word)
        return node is not None and node.is_end

    def startsWith(self, prefix: str) -> bool:
        return self._search_prefix(prefix) is not None

    def _search_prefix(self, text: str):
        node = self
        for ch in text:
            idx = ord(ch) - ord("a")
            if node.children[idx] is None:
                return None
            node = node.children[idx]
        return node`,
    highlightLines: {
      preprocess: [2, 3, 4],
      scan: [8, 9, 10, 11, 12, 24, 25, 26, 28],
      close: [13, 16, 17, 20, 27, 29],
      done: [17, 20, 29]
    }
  },
  {
    id: "huxiaocheng-root-node",
    label: "高赞讨论 · Root 节点写法",
    source: "LeetCode CN 讨论 · huxiaocheng（Python 3 手工整理）",
    sourceUrl: "https://leetcode.cn/circle/discuss/rQxCK4/",
    code: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.is_end

    def startsWith(self, prefix: str) -> bool:
        return self._walk(prefix) is not None

    def _walk(self, text: str):
        node = self.root
        for ch in text:
            node = node.children.get(ch)
            if node is None:
                return None
        return node`,
    highlightLines: {
      preprocess: [2, 3, 4, 7, 8],
      scan: [12, 13, 14, 15, 27, 28, 29],
      close: [16, 19, 20, 23, 30, 31],
      done: [20, 23, 31]
    }
  }
];

function createTrieNode(prefix: string): MutableTrieNode {
  return {
    id: prefix || "root",
    prefix,
    depth: prefix.length,
    isTerminal: false,
    children: new Map<string, MutableTrieNode>()
  };
}

function isTrieOperationName(value: string): value is TrieOperationName {
  return value === "Trie" || value === "insert" || value === "search" || value === "startsWith";
}

function parseTrieInput(input: string): ParsedTrieInput | ParseErrorResult {
  let payload: unknown;

  try {
    payload = JSON.parse(input);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `JSON 解析失败：${error.message}`
          : "JSON 解析失败。"
    };
  }

  let operations: unknown;
  let argumentsList: unknown;

  if (
    Array.isArray(payload) &&
    payload.length === 2 &&
    Array.isArray(payload[0]) &&
    Array.isArray(payload[1])
  ) {
    [operations, argumentsList] = payload;
  } else if (
    typeof payload === "object" &&
    payload !== null &&
    "operations" in payload &&
    "arguments" in payload
  ) {
    const record = payload as Record<string, unknown>;
    operations = record.operations;
    argumentsList = record.arguments;
  } else {
    return {
      error:
        '请输入 {"operations": [...], "arguments": [...]} 或 [operations, arguments]。'
    };
  }

  if (!Array.isArray(operations) || !Array.isArray(argumentsList)) {
    return {
      error: "operations 和 arguments 都必须是数组。"
    };
  }

  if (operations.length === 0) {
    return {
      error: "至少要包含一次 Trie 构造调用。"
    };
  }

  if (operations.length !== argumentsList.length) {
    return {
      error: "operations 和 arguments 的长度必须一致。"
    };
  }

  const parsedOperations: TrieOperationName[] = [];
  const parsedArguments: string[][] = [];

  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    const operationArgs = argumentsList[index];

    if (typeof operation !== "string" || !isTrieOperationName(operation)) {
      return {
        error: `第 ${index} 个操作不是受支持的 Trie 调用。`
      };
    }

    if (!Array.isArray(operationArgs)) {
      return {
        error: `第 ${index} 个操作的参数必须是数组。`
      };
    }

    if (operation === "Trie") {
      if (operationArgs.length !== 0) {
        return {
          error: "Trie 构造函数不应传入参数。"
        };
      }

      parsedOperations.push(operation);
      parsedArguments.push([]);
      continue;
    }

    if (
      operationArgs.length !== 1 ||
      typeof operationArgs[0] !== "string"
    ) {
      return {
        error: `${operation} 需要且只接受一个字符串参数。`
      };
    }

    parsedOperations.push(operation);
    parsedArguments.push([operationArgs[0]]);
  }

  if (parsedOperations[0] !== "Trie") {
    return {
      error: "第一步必须先调用 Trie()。"
    };
  }

  return {
    operations: parsedOperations,
    arguments: parsedArguments
  };
}

function formatArgument(argumentsList: string[]): string {
  return argumentsList.map((value) => JSON.stringify(value)).join(", ");
}

function snapshotTrie(
  root: MutableTrieNode,
  activeNodeIds: Set<string>,
  currentNodeId: string,
  newNodeIds: Set<string>
): TrieNodeSnapshot[] {
  const snapshots: TrieNodeSnapshot[] = [];

  const walk = (node: MutableTrieNode) => {
    snapshots.push({
      id: node.id,
      prefix: node.prefix,
      depth: node.depth,
      isTerminal: node.isTerminal,
      childKeys: [...node.children.keys()].sort(),
      isActive: activeNodeIds.has(node.id),
      isCurrent: node.id === currentNodeId,
      isNew: newNodeIds.has(node.id)
    });

    [...node.children.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([, child]) => walk(child));
  };

  walk(root);

  return snapshots;
}

function buildVariables(
  phase: FramePhase,
  operationName: TrieOperationName | null,
  operationArgument: string | null,
  currentChar: string | null,
  currentPrefix: string,
  outputCount: number,
  nodeCount: number,
  outputs: unknown[],
  returnValue?: unknown
): VariableItem[] {
  if (phase === "done") {
    return [
      { name: "ops", value: String(outputCount) },
      { name: "path", value: currentPrefix || "(root)" },
      { name: "nodes", value: String(nodeCount) },
      { name: "ans", value: JSON.stringify(outputs) }
    ];
  }

  const variables: VariableItem[] = [
    { name: "op", value: operationName ?? "--" },
    { name: "arg", value: operationArgument ?? "--" },
    { name: "ch", value: currentChar ?? "--" },
    { name: "path", value: currentPrefix || "(root)" },
    { name: "nodes", value: String(nodeCount) },
    { name: "ans", value: JSON.stringify(outputs) }
  ];

  if (phase === "close") {
    variables.push({
      name: "ret",
      value: JSON.stringify(returnValue ?? null)
    });
  }

  return variables;
}

function buildInspectBlocks(
  snapshots: TrieNodeSnapshot[],
  currentNodeId: string,
  history: TrieHistoryItem[]
): InspectBlock[] {
  const currentNode =
    snapshots.find((snapshot) => snapshot.id === currentNodeId) ?? null;
  const terminalWords = snapshots
    .filter((snapshot) => snapshot.isTerminal && snapshot.prefix.length > 0)
    .map((snapshot) => snapshot.prefix);

  return [
    {
      label: "current_children",
      value:
        currentNode === null
          ? "[]"
          : JSON.stringify(currentNode.childKeys)
    },
    {
      label: "terminal_words",
      value:
        terminalWords.length === 0
          ? "[]"
          : JSON.stringify(terminalWords)
    },
    {
      label: "history",
      value:
        history.length === 0
          ? "[]"
          : JSON.stringify(
              history.map((item) => ({
                index: item.index,
                op: item.name,
                arg: item.argument,
                out: item.output
              })),
              null,
              2
            )
    }
  ];
}

function buildFrame({
  id,
  phase,
  codeStep,
  title,
  caption,
  root,
  outputs,
  history,
  operationIndex,
  operationName,
  operationArgument,
  currentPrefix,
  currentChar,
  activeNodeIds,
  currentNodeId,
  newNodeIds = new Set<string>(),
  returnValue
}: TrieFrameOptions): AnimationFrame {
  const snapshots = snapshotTrie(root, activeNodeIds, currentNodeId, newNodeIds);

  return {
    id,
    phase,
    codeStep,
    title,
    caption,
    currentIndex: operationIndex,
    currentChar,
    rangeStart: 0,
    rangeEnd: currentPrefix.length,
    result: [...outputs],
    closedSegments: [],
    focusChar: currentChar,
    mappedChars: [],
    lastMap: {},
    view: {
      kind: "trie",
      currentOperationIndex: operationIndex,
      currentOperationName: operationName,
      currentArgument: operationArgument,
      currentPrefix,
      nodes: snapshots,
      history: [...history]
    },
    variables: buildVariables(
      phase,
      operationName,
      operationArgument,
      currentChar,
      currentPrefix,
      history.length,
      snapshots.length,
      outputs,
      returnValue
    ),
    inspectBlocks: buildInspectBlocks(snapshots, currentNodeId, history)
  };
}

function buildInvalidVisualization(input: string, error: string): ProblemVisualization {
  const root = createTrieNode("");

  return {
    inputValue: input,
    expectedOutput: {
      error
    },
    lastOrder: [],
    frames: [
      buildFrame({
        id: "invalid-input",
        phase: "preprocess",
        codeStep: "preprocess",
        title: "输入格式有误",
        caption: `${error} 当前题目需要 JSON 批量操作输入。`,
        root,
        outputs: [],
        history: [],
        operationIndex: null,
        operationName: null,
        operationArgument: null,
        currentPrefix: "",
        currentChar: null,
        activeNodeIds: new Set<string>([root.id]),
        currentNodeId: root.id
      })
    ]
  };
}

function buildTrieVisualization(input: string): ProblemVisualization {
  const parsed = parseTrieInput(input);

  if ("error" in parsed) {
    return buildInvalidVisualization(input, parsed.error);
  }

  const root = createTrieNode("");
  const frames: AnimationFrame[] = [];
  const outputs: unknown[] = [];
  const history: TrieHistoryItem[] = [];

  frames.push(
    buildFrame({
      id: "intro",
      phase: "preprocess",
      codeStep: "preprocess",
      title: "Phase 1: 顺序执行 Trie 接口调用",
      caption:
        "208 是一道设计题。动画会按输入里的操作顺序，一次次展示节点如何被创建、复用和查询。",
      root,
      outputs,
      history,
      operationIndex: null,
      operationName: null,
      operationArgument: null,
      currentPrefix: "",
      currentChar: null,
      activeNodeIds: new Set<string>([root.id]),
      currentNodeId: root.id
    })
  );

  for (let index = 0; index < parsed.operations.length; index += 1) {
    const operation = parsed.operations[index];
    const argumentList = parsed.arguments[index];
    const word = argumentList[0] ?? "";
    const operationArgument = formatArgument(argumentList);
    let currentNode = root;
    let currentPrefix = "";
    const path = [root.id];

    frames.push(
      buildFrame({
        id: `start-${index}`,
        phase: "preprocess",
        codeStep: "preprocess",
        title:
          operation === "Trie"
            ? `准备执行 #${index} Trie()`
            : `准备执行 #${index} ${operation}(${operationArgument})`,
        caption:
          operation === "Trie"
            ? "先构造一棵空 Trie，后面的 insert/search/startsWith 都会复用这棵树。"
            : `当前操作是 ${operation}，目标字符串是 ${JSON.stringify(word)}。`,
        root,
        outputs,
        history,
        operationIndex: index,
        operationName: operation,
        operationArgument,
        currentPrefix,
        currentChar: null,
        activeNodeIds: new Set<string>(path),
        currentNodeId: currentNode.id
      })
    );

    if (operation === "Trie") {
      outputs.push(null);
      history.push({
        index,
        name: operation,
        argument: operationArgument,
        output: null
      });

      frames.push(
        buildFrame({
          id: `close-${index}`,
          phase: "close",
          codeStep: "close",
          title: `完成 #${index} Trie()`,
          caption: "构造函数返回 null，同时留下一个只有根节点的空 Trie。",
          root,
          outputs,
          history,
          operationIndex: index,
          operationName: operation,
          operationArgument,
          currentPrefix,
          currentChar: null,
          activeNodeIds: new Set<string>(path),
          currentNodeId: currentNode.id,
          returnValue: null
        })
      );

      continue;
    }

    let resolved = true;
    let returnValue: unknown = null;

    for (let charIndex = 0; charIndex < word.length; charIndex += 1) {
      const char = word[charIndex];

      if (operation === "insert") {
        let child = currentNode.children.get(char);
        const newNodeIds = new Set<string>();

        if (!child) {
          child = createTrieNode(word.slice(0, charIndex + 1));
          currentNode.children.set(char, child);
          newNodeIds.add(child.id);
        }

        currentNode = child;
        currentPrefix = word.slice(0, charIndex + 1);
        path.push(currentNode.id);

        frames.push(
          buildFrame({
            id: `scan-${index}-${charIndex}`,
            phase: "scan",
            codeStep: "scan",
            title: `插入字符 ${char}`,
            caption: newNodeIds.size > 0
              ? `沿着字符 ${char} 往下时没有现成节点，于是新建前缀 ${JSON.stringify(currentPrefix)}。`
              : `沿着字符 ${char} 往下时，前缀 ${JSON.stringify(currentPrefix)} 已经存在，直接复用。`,
            root,
            outputs,
            history,
            operationIndex: index,
            operationName: operation,
            operationArgument,
            currentPrefix,
            currentChar: char,
            activeNodeIds: new Set<string>(path),
            currentNodeId: currentNode.id,
            newNodeIds
          })
        );

        continue;
      }

      const child = currentNode.children.get(char);

      if (!child) {
        resolved = false;
        returnValue = false;

        outputs.push(returnValue);
        history.push({
          index,
          name: operation,
          argument: operationArgument,
          output: returnValue
        });

        frames.push(
          buildFrame({
            id: `miss-${index}-${charIndex}`,
            phase: "close",
            codeStep: "close",
            title: `${operation} 提前失败`,
            caption: `扫描到字符 ${char} 时没有对应分支，说明 ${JSON.stringify(word)} 不在这条前缀路径上，直接返回 false。`,
            root,
            outputs,
            history,
            operationIndex: index,
            operationName: operation,
            operationArgument,
            currentPrefix,
            currentChar: char,
            activeNodeIds: new Set<string>(path),
            currentNodeId: currentNode.id,
            returnValue
          })
        );

        break;
      }

      currentNode = child;
      currentPrefix = word.slice(0, charIndex + 1);
      path.push(currentNode.id);

      frames.push(
        buildFrame({
          id: `scan-${index}-${charIndex}`,
          phase: "scan",
          codeStep: "scan",
          title: `沿 ${char} 继续向下`,
          caption: `字符 ${char} 命中了已有分支，当前已经走到前缀 ${JSON.stringify(currentPrefix)}。`,
          root,
          outputs,
          history,
          operationIndex: index,
          operationName: operation,
          operationArgument,
          currentPrefix,
          currentChar: char,
          activeNodeIds: new Set<string>(path),
          currentNodeId: currentNode.id
        })
      );
    }

    if (!resolved) {
      continue;
    }

    if (operation === "insert") {
      currentNode.isTerminal = true;
      returnValue = null;
      outputs.push(returnValue);
      history.push({
        index,
        name: operation,
        argument: operationArgument,
        output: returnValue
      });

      frames.push(
        buildFrame({
          id: `close-${index}`,
          phase: "close",
          codeStep: "close",
          title: `把 ${JSON.stringify(word)} 标成完整单词`,
          caption: `最后一个节点打上 is_end 标记，表示 ${JSON.stringify(word)} 现在可以被完整 search 到。`,
          root,
          outputs,
          history,
          operationIndex: index,
          operationName: operation,
          operationArgument,
          currentPrefix,
          currentChar: word[word.length - 1] ?? null,
          activeNodeIds: new Set<string>(path),
          currentNodeId: currentNode.id,
          returnValue
        })
      );

      continue;
    }

    if (operation === "search") {
      returnValue = currentNode.isTerminal;
      outputs.push(returnValue);
      history.push({
        index,
        name: operation,
        argument: operationArgument,
        output: returnValue
      });

      frames.push(
        buildFrame({
          id: `close-${index}`,
          phase: "close",
          codeStep: "close",
          title: `完成 search(${operationArgument})`,
          caption: returnValue
            ? `已经走完整个单词，而且当前节点是单词结尾，所以返回 true。`
            : `虽然前缀 ${JSON.stringify(word)} 存在，但当前节点不是单词结尾，所以 search 返回 false。`,
          root,
          outputs,
          history,
          operationIndex: index,
          operationName: operation,
          operationArgument,
          currentPrefix,
          currentChar: word[word.length - 1] ?? null,
          activeNodeIds: new Set<string>(path),
          currentNodeId: currentNode.id,
          returnValue
        })
      );

      continue;
    }

    returnValue = true;
    outputs.push(returnValue);
    history.push({
      index,
      name: operation,
      argument: operationArgument,
      output: returnValue
    });

    frames.push(
      buildFrame({
        id: `close-${index}`,
        phase: "close",
        codeStep: "close",
        title: `完成 startsWith(${operationArgument})`,
        caption: `只要路径能完整走完，就说明这个前缀存在，因此 startsWith 返回 true。`,
        root,
        outputs,
        history,
        operationIndex: index,
        operationName: operation,
        operationArgument,
        currentPrefix,
        currentChar: word[word.length - 1] ?? null,
        activeNodeIds: new Set<string>(path),
        currentNodeId: currentNode.id,
        returnValue
      })
    );
  }

  frames.push(
    buildFrame({
      id: "done",
      phase: "done",
      codeStep: "done",
      title: "返回整组调用结果",
      caption: `按顺序执行完 ${history.length} 次操作后，最终输出是 ${JSON.stringify(outputs)}。`,
      root,
      outputs,
      history,
      operationIndex: null,
      operationName: null,
      operationArgument: null,
      currentPrefix: "",
      currentChar: null,
      activeNodeIds: new Set<string>([root.id]),
      currentNodeId: root.id
    })
  );

  return {
    inputValue: input,
    expectedOutput: outputs,
    lastOrder: [],
    frames
  };
}

export const implementTriePrefixTreeProblem: ProblemDefinition = {
  id: "implement-trie-prefix-tree",
  title: "208. 实现 Trie（前缀树）",
  slug: "implement-trie-prefix-tree",
  difficulty: "Medium",
  prompt:
    "设计一个支持 insert、search 和 startsWith 的 Trie（前缀树），并理解节点是如何沿着字符路径被创建和复用的。",
  summary:
    "Trie 的核心不是把整串单词平铺存起来，而是让共享前缀复用同一段路径。insert 会在缺边时补节点，search 需要走完整条路径且命中单词结尾，startsWith 只要求前缀路径存在。",
  algorithmNotes: [
    "每个节点维护一个 children 映射，边的标签就是下一个字符。",
    "insert(word) 从根节点出发，沿字符逐层向下；缺孩子就建，存在就复用。",
    "search(word) 需要完整走到末尾，而且末节点必须带 is_end 标记。",
    "startsWith(prefix) 只检查路径能否走通，不要求末节点是完整单词。"
  ],
  inputLabel: "operations / arguments JSON",
  defaultInput,
  inputPlaceholder:
    '输入 {"operations": [...], "arguments": [...]} 或 [operations, arguments]',
  inputMultiline: true,
  leetcodeUrl: "https://leetcode.cn/problems/implement-trie-prefix-tree/description/",
  defaultSolutionId: solutions[0].id,
  solutions,
  pythonEntry: {
    mode: "design-class",
    fallbackFunctionName: "solve",
    solutionClassName: "Trie"
  },
  buildVisualization: buildTrieVisualization
};
