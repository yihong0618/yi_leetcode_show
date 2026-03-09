import type { PythonEntry } from "../types";

const PYODIDE_VERSION = "0.29.3";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

interface PyodideInstance {
  globals: {
    set: (name: string, value: unknown) => void;
  };
  runPythonAsync: (code: string) => Promise<unknown>;
}

interface PyodideWindow extends Window {
  loadPyodide?: (options?: { indexURL?: string }) => Promise<PyodideInstance>;
}

interface PythonRunOptions {
  code: string;
  inputValue: string;
  pythonEntry: PythonEntry;
}

export interface PythonRunResult {
  result: unknown;
  stdout: string;
}

let pyodideScriptPromise: Promise<void> | null = null;
let pyodideInstancePromise: Promise<PyodideInstance> | null = null;

function loadPyodideScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Pyodide 只能在浏览器环境中加载。"));
  }

  if ((window as PyodideWindow).loadPyodide) {
    return Promise.resolve();
  }

  if (!pyodideScriptPromise) {
    pyodideScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${PYODIDE_INDEX_URL}pyodide.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        reject(new Error("Pyodide 脚本加载失败，请检查网络或 CDN 是否可达。"));
      };
      document.head.appendChild(script);
    });
  }

  return pyodideScriptPromise;
}

async function getPyodide() {
  await loadPyodideScript();

  if (!pyodideInstancePromise) {
    const loader = (window as PyodideWindow).loadPyodide;

    if (!loader) {
      throw new Error("Pyodide 初始化函数不存在。");
    }

    pyodideInstancePromise = loader({
      indexURL: PYODIDE_INDEX_URL
    });
  }

  return pyodideInstancePromise;
}

export async function runPythonInBrowser({
  code,
  inputValue,
  pythonEntry
}: PythonRunOptions): Promise<PythonRunResult> {
  const pyodide = await getPyodide();

  pyodide.globals.set("user_code", code);
  pyodide.globals.set("input_value", inputValue);
  pyodide.globals.set(
    "python_entry",
    JSON.stringify(pythonEntry)
  );

  const rawPayload = await pyodide.runPythonAsync(`
import contextlib
import io
import json

namespace = {}
stdout_buffer = io.StringIO()
entry = json.loads(python_entry)

with contextlib.redirect_stdout(stdout_buffer):
    exec(user_code, namespace)

    mode = entry.get("mode", "single-input")
    fallback_function_name = entry["fallbackFunctionName"]
    solution_class_name = entry["solutionClassName"]

    if mode == "design-class":
        try:
            payload = json.loads(input_value)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "Design problem input must be valid JSON."
            ) from exc

        if (
            isinstance(payload, list)
            and len(payload) == 2
            and all(isinstance(item, list) for item in payload)
        ):
            operations, arguments = payload
        elif isinstance(payload, dict):
            operations = payload.get("operations")
            arguments = payload.get("arguments")
        else:
            raise RuntimeError(
                'Use [operations, arguments] or {"operations": [...], "arguments": [...]} as input.'
            )

        if not isinstance(operations, list) or not isinstance(arguments, list):
            raise RuntimeError("operations and arguments must both be lists.")

        if len(operations) != len(arguments):
            raise RuntimeError("operations and arguments must have the same length.")

        if fallback_function_name in namespace:
            result = namespace[fallback_function_name](operations, arguments)
        elif solution_class_name in namespace:
            trie = None
            result = []

            for op, method_args in zip(operations, arguments):
                if not isinstance(method_args, list):
                    raise RuntimeError(f"Arguments for {op} must be a list.")

                if op == solution_class_name:
                    trie = namespace[solution_class_name](*method_args)
                    result.append(None)
                    continue

                if trie is None:
                    raise RuntimeError(
                        f"{solution_class_name} must be constructed before calling {op}."
                    )

                if not hasattr(trie, op):
                    raise RuntimeError(
                        f"{solution_class_name} is missing method {op}"
                    )

                result.append(getattr(trie, op)(*method_args))
        else:
            raise RuntimeError(
                f"Please define {fallback_function_name}(operations, arguments) or class {solution_class_name}"
            )
    else:
        solution_method_name = entry["solutionMethodName"]

        if fallback_function_name in namespace:
            result = namespace[fallback_function_name](input_value)
        elif solution_class_name in namespace:
            solver = namespace[solution_class_name]()

            if not hasattr(solver, solution_method_name):
                raise RuntimeError(
                    f"{solution_class_name} is missing method {solution_method_name}"
                )

            result = getattr(solver, solution_method_name)(input_value)
        else:
            raise RuntimeError(
                f"Please define {fallback_function_name}(s) or {solution_class_name}.{solution_method_name}"
            )

json.dumps(
    {
        "result": result,
        "stdout": stdout_buffer.getvalue().strip(),
    },
    ensure_ascii=False,
)
`);

  return JSON.parse(String(rawPayload)) as PythonRunResult;
}
