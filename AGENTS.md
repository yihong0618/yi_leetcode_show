# LeetCode Show Agent Guide

## 项目目标

- 这是一个纯前端项目，用 React + Vite + TypeScript 构建，并部署到 GitHub Pages。
- 项目目标是把 LeetCode 的 Python 题解做成可播放的算法原理动画。
- 当前交互全部在浏览器里完成，不依赖后端。
- Python 运行依赖浏览器端的 Pyodide，因此这里的参考解法和可执行代码都统一按 Python 3 处理。

## 当前结构

- 题目入口列表在 `src/content/problems.ts`。
- 每道题实现为一个 `ProblemDefinition`，类型定义在 `src/types.ts`。
- 当前示例题文件是 `src/content/partitionLabels.ts`，新增题目时优先参考它。
- 页面入口在 `src/App.tsx`。
- 动画面板和参考代码高亮在 `src/components/AnimationPlayer.tsx`。
- 右侧变量面板在 `src/components/FrameVariablesPanel.tsx`。
- 可运行 Python 编辑区在 `src/components/CodeWorkbench.tsx`。

## 核心约束

- 只收录 Python 3 解法。
- 每道题最多挂 5 个参考解法。
- 参考解法尽量附上明确来源链接。
- 只有在能确认公开原始来源时，才能标注为“灵神”或其他作者原解；无法确认时要写成“手工整理”或类似表述。
- 页面是静态站方案，新增功能时不要引入后端依赖。
- 动画高亮不是实时 Python 调试，它由动画帧里的 `codeStep` 驱动。
- 右侧变量面板展示的是动画帧状态，不是用户自定义 Python 的真实局部变量。

## 新增题目的标准流程

1. 复制 `src/content/partitionLabels.ts` 的结构，新建一个题目文件，例如 `src/content/<slug>.ts`。
2. 补全 `ProblemDefinition` 的基础信息：
   - `id`
   - `title`
   - `slug`
   - `difficulty`
   - `prompt`
   - `summary`
   - `algorithmNotes`
   - `inputLabel`
   - `defaultInput`
   - `leetcodeUrl`
   - `defaultSolutionId`
   - `pythonEntry`
3. 为这道题准备 `solutions`。
4. 实现 `buildVisualization(input)`，让它返回完整的 `ProblemVisualization`。
5. 在 `src/content/problems.ts` 中导出并注册这道题。
6. 本地运行并确认题目可切换、动画可播放、参考解法可切换。

## 新增题目时必须满足的数据约定

- `solutions` 的每一项都必须符合 `SolutionDefinition`。
- `defaultSolutionId` 必须命中 `solutions` 中真实存在的一个解法。
- `pythonEntry` 需要和浏览器执行约定一致：
  - 优先兼容 `class Solution` + 指定方法。
  - 同时允许备用函数名，例如 `solve(s)`。
- `buildVisualization(input)` 必须返回：
  - `inputValue`
  - `expectedOutput`
  - `lastOrder`
  - `frames`

## 动画帧设计约定

- 当前通用阶段只有 4 个：`preprocess`、`scan`、`close`、`done`。
- `AnimationFrame.codeStep` 现在直接复用这 4 个阶段名。
- 动画下方参考代码的高亮，完全依赖当前帧的 `codeStep` 和当前解法的 `highlightLines`。
- 如果新题需要更细的代码高亮阶段，不要先硬改页面文案，先评估是否要扩展 `CodeStep` 类型和所有题目的 `highlightLines`。
- 变量面板依赖 `AnimationFrame` 里的字段，例如：
  - `currentIndex`
  - `currentChar`
  - `rangeStart`
  - `rangeEnd`
  - `result`
  - `closedSegments`
  - `mappedChars`
  - `lastMap`
- 如果新题的讲解需要额外变量，优先扩展 `AnimationFrame` 结构，再同步更新变量面板，而不是在组件里写特判字符串。

## 给一题添加参考解法的流程

1. 在题目文件的 `solutions` 数组里新增一个 `SolutionDefinition`。
2. 填写：
   - `id`
   - `label`
   - `source`
   - `sourceUrl`（能给就给）
   - `code`
   - `highlightLines`
3. 确认代码是 Python 3，且能在 Pyodide 环境下正常执行。
4. 确认这份代码的结构和 `highlightLines` 真正对应，不要出现高亮行和代码语义不一致的问题。
5. 如果已经达到 5 个解法上限，先删掉价值最低或来源不明的一项，再新增。

## 参考解法来源规范

- 优先级建议：
  - 官方题解
  - 原作者公开题解
  - 高质量社区题解站点
  - 手工整理的模板解法
- 对来源的要求：
  - 能给原始页面就给 `sourceUrl`
  - 标题和来源名不要夸大
  - 不要把“风格接近”写成“原作者解法”
- 当前项目适合保留“同一思路的多个 Python 3 写法”，但不适合机械堆砌几乎完全一样的代码。

## 动画和代码同步时的注意事项

- 动画解释的是“原理”，不是用户自定义 Python 的逐行 trace。
- 用户在 `CodeWorkbench` 里改代码后，只会影响浏览器执行结果，不会自动改动画帧。
- 因此新增题目时，动画逻辑要以 `buildVisualization(input)` 为准，不要依赖用户代码的运行时副产物。
- 同一道题如果挂了多份参考解法，动画本身可以共用一套帧，但每份解法都要有自己的 `highlightLines`。

## UI 交互上的现状

- 输入框目前放在动画面板顶部，输入变化会重建整题动画并重置到第 0 帧。
- 题目切换时，会重置：
  - 当前输入
  - 当前参考解法
  - Python 编辑器内容
  - 当前动画帧
- 动画面板下方展示当前选中参考解法的代码高亮。
- `CodeWorkbench` 负责：
  - 选择参考解法
  - 编辑 Python
  - 在浏览器里执行 Python
  - 对比执行结果和动画输出

## 新增题目时推荐复用的做法

- 先做一题一文件，不要一开始就抽象成复杂 DSL。
- 先让动画帧和参考解法高亮工作，再考虑是否抽公共工具。
- 如果题目也有明显的“预处理 -> 扫描 -> 收尾”结构，优先复用现有 `codeStep`。
- 如果题目完全不是这一类过程，再考虑升级类型系统，而不是把现有阶段名硬套过去。

## 提交前检查清单

- 运行 `npm run build`，必须通过。
- 手动检查题目切换是否正常。
- 手动检查输入变化后，动画是否会重算。
- 手动检查参考解法切换后，动画下方高亮是否跟着切换。
- 手动检查 `载入标准题解` 是否把当前选中的参考解法写回编辑器。
- 手动检查浏览器执行结果是否和 `expectedOutput` 对得上。
- 手动检查来源名和来源链接是否对应。

## 不要做的事

- 不要引入需要服务端才能工作的功能作为主流程。
- 不要收录非 Python 3 的参考解法。
- 不要在来源不确定时冒用作者名。
- 不要只改参考代码而忘了同步 `highlightLines`。
- 不要只改动画帧文案而忘了变量面板或 `expectedOutput`。
