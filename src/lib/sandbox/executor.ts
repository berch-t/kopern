import vm from "node:vm";

const TIMEOUT_MS = 5000;

export async function executeSandboxed(
  code: string,
  args: Record<string, unknown>
): Promise<string> {
  const sandbox = {
    args,
    result: undefined as unknown,
    console: {
      log: (...msgs: unknown[]) => {
        // Silently capture logs in sandbox
      },
    },
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Map,
    Set,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
  };

  const wrappedCode = `
    __promise = (async () => {
      ${code}
    })();
  `;

  const context = vm.createContext(sandbox);
  const script = new vm.Script(wrappedCode);

  try {
    script.runInContext(context, { timeout: TIMEOUT_MS });
    // Wait for async code to complete (if any awaits in user code)
    const returnValue = await (sandbox as Record<string, unknown>).__promise;
    // Support both patterns: `result = ...` (explicit assignment) and `return ...` (IIFE return value)
    const output = sandbox.result !== undefined ? sandbox.result : returnValue;
    if (output === undefined || output === null) return "null";
    return typeof output === "string" ? output : JSON.stringify(output);
  } catch (err) {
    throw new Error(`Sandbox execution failed: ${(err as Error).message}`);
  }
}
