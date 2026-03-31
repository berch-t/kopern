/**
 * Built-in tool: code_interpreter
 * Executes Python, Node.js, or Bash code in a secure Cloud Run sandbox.
 * Calls the Kopern Code Interpreter service (FastAPI on GCP Cloud Run).
 */

// ---------------------------------------------------------------------------
// Tool definition (Anthropic format)
// ---------------------------------------------------------------------------

export const CODE_INTERPRETER_TOOLS = [
  {
    name: "code_interpreter",
    description:
      "Execute Python, Node.js, or Bash code in a secure cloud sandbox. " +
      "Use for data analysis, calculations, web scraping, file processing, " +
      "API calls, text processing, chart generation, and any task that requires real code execution. " +
      "Python has numpy, pandas, matplotlib, requests, beautifulsoup4 pre-installed. " +
      "Save output files to the OUTPUT_DIR directory (available as os.environ['OUTPUT_DIR'] in Python, " +
      "process.env.OUTPUT_DIR in Node.js, $OUTPUT_DIR in Bash).",
    input_schema: {
      type: "object" as const,
      properties: {
        language: {
          type: "string",
          enum: ["python", "nodejs", "bash"],
          description: "Programming language to execute",
        },
        code: {
          type: "string",
          description:
            "Code to execute. Use print() for output in Python, console.log() in Node.js, echo in Bash. " +
            "Save generated files (charts, CSVs) to OUTPUT_DIR.",
        },
        timeout: {
          type: "number",
          description: "Timeout in seconds (default 60, max 300)",
        },
      },
      required: ["language", "code"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool name check
// ---------------------------------------------------------------------------

const CODE_INTERPRETER_NAMES = new Set(CODE_INTERPRETER_TOOLS.map((t) => t.name));

export function isCodeInterpreterTool(name: string): boolean {
  return CODE_INTERPRETER_NAMES.has(name);
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

const CODE_INTERPRETER_URL = process.env.CODE_INTERPRETER_URL;
const CODE_INTERPRETER_SECRET = process.env.CODE_INTERPRETER_SECRET;

export async function executeCodeInterpreterTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: string; isError: boolean }> {
  if (name !== "code_interpreter") {
    return { result: `Unknown code interpreter tool: ${name}`, isError: true };
  }

  if (!CODE_INTERPRETER_URL) {
    return {
      result:
        "Code interpreter is not configured. Set CODE_INTERPRETER_URL and CODE_INTERPRETER_SECRET environment variables.",
      isError: true,
    };
  }

  const language = String(args.language ?? "").trim();
  if (!["python", "nodejs", "bash"].includes(language)) {
    return {
      result: `Invalid language "${language}". Must be python, nodejs, or bash.`,
      isError: true,
    };
  }

  const code = String(args.code ?? "").trim();
  if (!code) {
    return { result: "Code is required.", isError: true };
  }

  if (code.length > 100_000) {
    return { result: "Code exceeds maximum length (100KB).", isError: true };
  }

  const timeout = Math.min(Math.max(Number(args.timeout) || 60, 1), 300);

  try {
    const controller = new AbortController();
    // Server-side timeout: timeout + 10s buffer for network overhead
    const fetchTimeout = setTimeout(() => controller.abort(), (timeout + 10) * 1000);

    const res = await fetch(`${CODE_INTERPRETER_URL}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CODE_INTERPRETER_SECRET
          ? { Authorization: `Bearer ${CODE_INTERPRETER_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        language,
        code,
        timeout,
        files: [],
      }),
      signal: controller.signal,
    });

    clearTimeout(fetchTimeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      return {
        result: `Code interpreter returned HTTP ${res.status}: ${errorText}`,
        isError: true,
      };
    }

    const data = await res.json();

    // Format result
    const parts: string[] = [];

    if (data.timed_out) {
      parts.push(`[TIMEOUT] Execution timed out after ${timeout}s`);
    }

    if (data.stdout?.trim()) {
      parts.push(data.stdout.trim());
    }

    if (data.stderr?.trim() && data.exit_code !== 0) {
      parts.push(`\nSTDERR:\n${data.stderr.trim()}`);
    }

    if (data.files?.length) {
      parts.push(
        `\n[${data.files.length} output file(s): ${data.files.map((f: { name: string }) => f.name).join(", ")}]`,
      );
    }

    if (parts.length === 0) {
      parts.push("(no output)");
    }

    const meta = `[${language} | ${data.duration_ms}ms | exit ${data.exit_code}]`;

    return {
      result: `${meta}\n${parts.join("\n")}`,
      isError: data.exit_code !== 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort")) {
      return {
        result: `Code interpreter request timed out after ${timeout + 10}s`,
        isError: true,
      };
    }
    return {
      result: `Code interpreter error: ${msg}`,
      isError: true,
    };
  }
}
