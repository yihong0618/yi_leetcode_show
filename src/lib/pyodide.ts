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
  fallbackFunctionName: string;
  solutionClassName: string;
  solutionMethodName: string;
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
  fallbackFunctionName,
  solutionClassName,
  solutionMethodName
}: PythonRunOptions): Promise<PythonRunResult> {
  const pyodide = await getPyodide();

  pyodide.globals.set("user_code", code);
  pyodide.globals.set("input_value", inputValue);
  pyodide.globals.set("fallback_function_name", fallbackFunctionName);
  pyodide.globals.set("solution_class_name", solutionClassName);
  pyodide.globals.set("solution_method_name", solutionMethodName);

  const rawPayload = await pyodide.runPythonAsync(`
import contextlib
import io
import json

namespace = {}
stdout_buffer = io.StringIO()

with contextlib.redirect_stdout(stdout_buffer):
    exec(user_code, namespace)

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
