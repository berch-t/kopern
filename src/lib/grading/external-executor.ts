/**
 * External endpoint executor for the public grader.
 * Sends HTTP requests to external agent endpoints and wraps responses into CollectedEvents.
 */

import { validateExternalUrl } from "@/lib/security/ssrf";
import type { CollectedEvents } from "@/lib/pi-mono/event-collector";

export interface EndpointConfig {
  url: string;
  method: "POST" | "GET";
  authType: "none" | "bearer" | "api_key_header" | "api_key_query";
  authValue?: string;
  authHeaderName?: string;
  bodyTemplate: string;
  responsePath?: string;
  timeout?: number;
}

/**
 * Known response path patterns for auto-detection.
 */
const KNOWN_FORMATS: { name: string; path: string; detect: (body: unknown) => boolean }[] = [
  {
    name: "openai",
    path: "choices[0].message.content",
    detect: (b) => isObj(b) && Array.isArray((b as Record<string, unknown>).choices),
  },
  {
    name: "anthropic",
    path: "content[0].text",
    detect: (b) => isObj(b) && Array.isArray((b as Record<string, unknown>).content)
      && isObj(((b as Record<string, unknown>).content as unknown[])[0])
      && "text" in ((b as Record<string, unknown>).content as Record<string, unknown>[])[0],
  },
  {
    name: "google",
    path: "candidates[0].content.parts[0].text",
    detect: (b) => isObj(b) && Array.isArray((b as Record<string, unknown>).candidates),
  },
  // Simple field names
  ...["response", "output", "message", "text", "answer", "result", "reply", "data"].map((key) => ({
    name: `simple_${key}`,
    path: key,
    detect: (b: unknown) => isObj(b) && typeof (b as Record<string, unknown>)[key] === "string",
  })),
];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Extract a value from a nested object using a dot/bracket path.
 * Supports: "choices[0].message.content", "response", "data.text"
 */
function extractByPath(obj: unknown, path: string): unknown {
  const segments = path.replace(/\[(\d+)]/g, ".$1").split(".");
  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

/**
 * Auto-detect the response format and extract the agent's output.
 */
export function detectAndExtract(body: unknown, responsePath?: string): { text: string; detectedPath: string; detectedFormat: string } {
  // If user specified a response path, use it
  if (responsePath) {
    const extracted = extractByPath(body, responsePath);
    const text = typeof extracted === "string" ? extracted : JSON.stringify(extracted ?? "");
    return { text, detectedPath: responsePath, detectedFormat: "custom" };
  }

  // Auto-detect known formats
  for (const fmt of KNOWN_FORMATS) {
    if (fmt.detect(body)) {
      const extracted = extractByPath(body, fmt.path);
      if (typeof extracted === "string" && extracted.length > 0) {
        return { text: extracted, detectedPath: fmt.path, detectedFormat: fmt.name };
      }
    }
  }

  // Fallback: if body is a string, use it directly
  if (typeof body === "string") {
    return { text: body, detectedPath: "", detectedFormat: "plain_text" };
  }

  // Last resort: stringify the whole response
  const raw = JSON.stringify(body).slice(0, 10_000);
  return { text: raw, detectedPath: "", detectedFormat: "raw_json" };
}

/**
 * Execute a test case against an external HTTP endpoint.
 * Returns CollectedEvents compatible with the grading engine.
 */
export async function executeExternalEndpoint(
  config: EndpointConfig,
  inputPrompt: string,
): Promise<CollectedEvents & { latencyMs: number }> {
  // SSRF validation
  const ssrf = validateExternalUrl(config.url);
  if (!ssrf.valid) {
    throw new Error(`Blocked URL: ${ssrf.reason}`);
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  if (config.authType === "bearer" && config.authValue) {
    headers["Authorization"] = `Bearer ${config.authValue}`;
  } else if (config.authType === "api_key_header" && config.authValue) {
    headers[config.authHeaderName || "X-API-Key"] = config.authValue;
  }

  // Build URL (with query param auth if needed)
  let fetchUrl = config.url;
  if (config.authType === "api_key_query" && config.authValue) {
    const u = new URL(config.url);
    u.searchParams.set(config.authHeaderName || "api_key", config.authValue);
    fetchUrl = u.toString();
  }

  // Build body — replace {{input}} placeholder
  const bodyStr = config.bodyTemplate.replace(/\{\{input\}\}/g, JSON.stringify(inputPrompt).slice(1, -1));

  // Execute with timeout
  const controller = new AbortController();
  const timeout = config.timeout || 30_000;
  const timer = setTimeout(() => controller.abort(), timeout);
  const start = Date.now();

  try {
    const fetchOptions: RequestInit = {
      method: config.method,
      headers,
      signal: controller.signal,
    };

    if (config.method === "POST") {
      fetchOptions.body = bodyStr;
    }

    const res = await fetch(fetchUrl, fetchOptions);
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Endpoint returned ${res.status}: ${errorText.slice(0, 500)}`);
    }

    const contentType = res.headers.get("content-type") || "";
    let body: unknown;
    if (contentType.includes("application/json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    const { text } = detectAndExtract(body, config.responsePath);

    return {
      assistantOutput: text,
      toolCalls: [],
      tokens: [],
      latencyMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe an endpoint to detect its response format.
 * Sends a simple "Hello" message and analyzes the response.
 */
export async function probeEndpoint(config: Omit<EndpointConfig, "responsePath">): Promise<{
  success: boolean;
  statusCode: number;
  responseBody: string;
  detectedPath: string;
  detectedFormat: string;
  latencyMs: number;
  error?: string;
}> {
  const ssrf = validateExternalUrl(config.url);
  if (!ssrf.valid) {
    return { success: false, statusCode: 0, responseBody: "", detectedPath: "", detectedFormat: "", latencyMs: 0, error: ssrf.reason };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json", "Accept": "application/json" };

  if (config.authType === "bearer" && config.authValue) {
    headers["Authorization"] = `Bearer ${config.authValue}`;
  } else if (config.authType === "api_key_header" && config.authValue) {
    headers[config.authHeaderName || "X-API-Key"] = config.authValue;
  }

  let fetchUrl = config.url;
  if (config.authType === "api_key_query" && config.authValue) {
    const u = new URL(config.url);
    u.searchParams.set(config.authHeaderName || "api_key", config.authValue);
    fetchUrl = u.toString();
  }

  const bodyStr = config.bodyTemplate.replace(/\{\{input\}\}/g, "Hello, how are you?");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const start = Date.now();

  try {
    const fetchOptions: RequestInit = { method: config.method, headers, signal: controller.signal };
    if (config.method === "POST") fetchOptions.body = bodyStr;

    const res = await fetch(fetchUrl, fetchOptions);
    const latencyMs = Date.now() - start;

    const contentType = res.headers.get("content-type") || "";
    let body: unknown;
    let rawBody: string;

    if (contentType.includes("application/json")) {
      rawBody = await res.text();
      try { body = JSON.parse(rawBody); } catch { body = rawBody; }
    } else {
      rawBody = await res.text();
      body = rawBody;
    }

    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        responseBody: rawBody.slice(0, 2000),
        detectedPath: "",
        detectedFormat: "",
        latencyMs,
        error: `Endpoint returned ${res.status}`,
      };
    }

    const { detectedPath, detectedFormat } = detectAndExtract(body);

    return {
      success: true,
      statusCode: res.status,
      responseBody: rawBody.slice(0, 2000),
      detectedPath,
      detectedFormat,
      latencyMs,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 0,
      responseBody: "",
      detectedPath: "",
      detectedFormat: "",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  } finally {
    clearTimeout(timer);
  }
}
