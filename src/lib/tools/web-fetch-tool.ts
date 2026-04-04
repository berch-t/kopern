/**
 * Built-in tool: web_fetch
 * Fetches a URL server-side and returns extracted text content.
 * Runs in the Vercel API route process (full network access).
 * Supports HTML pages (auto-extracted to text), JSON APIs, XML, plain text.
 */

// ---------------------------------------------------------------------------
// Tool definitions (Anthropic format)
// ---------------------------------------------------------------------------

export const WEB_FETCH_TOOLS = [
  {
    name: "web_fetch",
    concurrencySafe: true,
    description:
      "Fetch a URL and return its text content. Works with web pages (HTML → extracted text), JSON APIs, XML feeds, robots.txt, sitemaps, and any text-based resource. Use this to access external data, verify URLs, scrape content, or call APIs.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch (must start with http:// or https://)",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE"],
          description: "HTTP method (default: GET)",
        },
        headers: {
          type: "object",
          description: "Optional HTTP headers as key-value pairs",
        },
        body: {
          type: "string",
          description: "Optional request body (for POST/PUT)",
        },
        extract_text: {
          type: "boolean",
          description:
            "If true (default), extract readable text from HTML. If false, return raw response body.",
        },
        max_length: {
          type: "number",
          description: "Maximum response length in characters (default: 50000)",
        },
      },
      required: ["url"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool name check
// ---------------------------------------------------------------------------

const WEB_FETCH_NAMES = new Set(WEB_FETCH_TOOLS.map((t) => t.name));

export function isWebFetchTool(name: string): boolean {
  return WEB_FETCH_NAMES.has(name);
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

const DEFAULT_MAX_LENGTH = 50_000;
const FETCH_TIMEOUT_MS = 30_000;

export async function executeWebFetchTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: string; isError: boolean }> {
  if (name !== "web_fetch") {
    return { result: `Unknown web fetch tool: ${name}`, isError: true };
  }

  const url = String(args.url ?? "").trim();
  if (!url) {
    return { result: "A 'url' parameter is required.", isError: true };
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return {
      result: "URL must start with http:// or https://",
      isError: true,
    };
  }

  // Block fetching Kopern's own domains (anti-loop)
  const blockedHosts = ["kopern.ai", "kopern.vercel.app", "kopern.com", "localhost"];
  try {
    const parsed = new URL(url);
    if (blockedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      return {
        result: `Cannot fetch Kopern's own domain (${parsed.hostname}) to prevent loops.`,
        isError: true,
      };
    }
  } catch {
    return { result: `Invalid URL: ${url}`, isError: true };
  }

  const method = String(args.method ?? "GET").toUpperCase();
  const customHeaders = (args.headers ?? {}) as Record<string, string>;
  const body = args.body ? String(args.body) : undefined;
  const extractText = args.extract_text !== false; // default true
  const maxLength = Number(args.max_length) || DEFAULT_MAX_LENGTH;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      method,
      headers: {
        "User-Agent": "Kopern-Agent/1.0 (https://kopern.ai)",
        Accept: "text/html,application/json,application/xml,text/plain,*/*",
        ...customHeaders,
      },
      body: method !== "GET" && method !== "HEAD" ? body : undefined,
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        result: `HTTP ${res.status} ${res.statusText} for ${url}`,
        isError: true,
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    let text = await res.text();

    // Extract readable text from HTML
    if (extractText && contentType.includes("text/html")) {
      text = htmlToText(text);
    }

    // Truncate if needed
    if (text.length > maxLength) {
      text = text.slice(0, maxLength) + `\n\n[Truncated at ${maxLength} characters]`;
    }

    const meta = [
      `URL: ${url}`,
      `Status: ${res.status}`,
      `Content-Type: ${contentType}`,
      `Length: ${text.length} chars`,
    ].join("\n");

    return {
      result: `${meta}\n\n---\n\n${text}`,
      isError: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort")) {
      return { result: `Fetch timeout (${FETCH_TIMEOUT_MS / 1000}s) for ${url}`, isError: true };
    }
    return { result: `Fetch error: ${msg}`, isError: true };
  }
}

// ---------------------------------------------------------------------------
// HTML → Text extraction (lightweight, no dependencies)
// ---------------------------------------------------------------------------

function htmlToText(html: string): string {
  // Remove script, style, noscript tags and their content
  let text = html.replace(/<(script|style|noscript|svg|path)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Extract title
  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Extract meta description
  const metaMatch = text.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const description = metaMatch ? metaMatch[1].trim() : "";

  // Convert common block elements to newlines
  text = text.replace(/<(br|hr)\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|section|article|header|footer|main|nav|li|tr|h[1-6])>/gi, "\n");
  text = text.replace(/<(h[1-6])[^>]*>/gi, "\n## ");
  text = text.replace(/<li[^>]*>/gi, "- ");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&[a-z]+;/gi, " ");

  // Clean up whitespace
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  // Remove excessive blank lines
  text = text.replace(/\n{3,}/g, "\n\n");

  // Prepend title and description if found
  const header: string[] = [];
  if (title) header.push(`Title: ${title}`);
  if (description) header.push(`Description: ${description}`);
  if (header.length) text = header.join("\n") + "\n\n" + text;

  return text.trim();
}
