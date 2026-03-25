// data.gouv.fr MCP tools — server-side HTTP calls to mcp.data.gouv.fr
// Exposes the 9 official tools as built-in agent tools

import { type ToolDefinition } from "@/lib/llm/client";

const MCP_ENDPOINT = "https://mcp.data.gouv.fr/mcp";

// --- Tool Definitions ---

export function getDatagouvTools(): ToolDefinition[] {
  return [
    {
      name: "search_datasets",
      description:
        "Search for datasets on data.gouv.fr by keywords. Returns datasets with metadata (title, description, organization, tags, resource count).",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords" },
          page: { type: "number", description: "Page number (default: 1)" },
          page_size: { type: "number", description: "Results per page (default: 20, max: 100)" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_dataset_info",
      description:
        "Get detailed information about a specific dataset (metadata, organization, tags, dates, license, etc.).",
      input_schema: {
        type: "object",
        properties: {
          dataset_id: { type: "string", description: "Dataset ID" },
        },
        required: ["dataset_id"],
      },
    },
    {
      name: "list_dataset_resources",
      description:
        "List all resources (files) in a dataset with their metadata (format, size, type, URL, Tabular API availability).",
      input_schema: {
        type: "object",
        properties: {
          dataset_id: { type: "string", description: "Dataset ID" },
        },
        required: ["dataset_id"],
      },
    },
    {
      name: "get_resource_info",
      description:
        "Get detailed information about a specific resource (format, size, MIME type, URL, dataset association, Tabular API availability).",
      input_schema: {
        type: "object",
        properties: {
          resource_id: { type: "string", description: "Resource ID" },
        },
        required: ["resource_id"],
      },
    },
    {
      name: "query_resource_data",
      description:
        "Query data from a specific resource via the Tabular API. Fetches rows from a CSV/XLSX resource to answer questions. Only works on resources with Tabular API enabled.",
      input_schema: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question to answer from the data" },
          resource_id: { type: "string", description: "Resource ID to query" },
          page: { type: "number", description: "Page number (default: 1)" },
          page_size: { type: "number", description: "Results per page (default: 20, max: 200)" },
        },
        required: ["question", "resource_id"],
      },
    },
    {
      name: "search_dataservices",
      description:
        "Search for dataservices (APIs) registered on data.gouv.fr by keywords. Returns dataservices with metadata (title, description, organization, base API URL, tags).",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords" },
          page: { type: "number", description: "Page number (default: 1)" },
          page_size: { type: "number", description: "Results per page (default: 20, max: 100)" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_dataservice_info",
      description:
        "Get detailed metadata about a specific dataservice (title, description, organization, base API URL, OpenAPI spec URL, license, dates, related datasets).",
      input_schema: {
        type: "object",
        properties: {
          dataservice_id: { type: "string", description: "Dataservice ID" },
        },
        required: ["dataservice_id"],
      },
    },
    {
      name: "get_dataservice_openapi_spec",
      description:
        "Fetch and summarize the OpenAPI/Swagger specification for a dataservice. Returns a concise overview of available endpoints with their parameters.",
      input_schema: {
        type: "object",
        properties: {
          dataservice_id: { type: "string", description: "Dataservice ID" },
        },
        required: ["dataservice_id"],
      },
    },
    {
      name: "get_metrics",
      description:
        "Get metrics (visits, downloads) for a dataset and/or a resource.",
      input_schema: {
        type: "object",
        properties: {
          dataset_id: { type: "string", description: "Dataset ID (optional)" },
          resource_id: { type: "string", description: "Resource ID (optional)" },
          limit: { type: "number", description: "Number of monthly records (default: 12, max: 100)" },
        },
      },
    },
  ];
}

// --- Tool Execution via MCP JSON-RPC ---

const DATAGOUV_TOOL_NAMES = new Set([
  "search_datasets",
  "get_dataset_info",
  "list_dataset_resources",
  "get_resource_info",
  "query_resource_data",
  "search_dataservices",
  "get_dataservice_info",
  "get_dataservice_openapi_spec",
  "get_metrics",
]);

export function isDatagouvTool(name: string): boolean {
  return DATAGOUV_TOOL_NAMES.has(name);
}

/** Call data.gouv.fr MCP server via Streamable HTTP (JSON-RPC) */
async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const jsonRpcRequest = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  };

  const response = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(jsonRpcRequest),
  });

  if (!response.ok) {
    throw new Error(`MCP server returned ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";

  // Handle SSE response (Streamable HTTP transport)
  if (contentType.includes("text/event-stream")) {
    const text = await response.text();
    // Parse SSE events — find the last "data:" line with a JSON-RPC result
    const lines = text.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith("data:")) {
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.result) return extractMcpContent(parsed.result);
          if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error));
        } catch {
          // Not valid JSON, skip
        }
      }
    }
    // Fallback: return raw text
    return text.slice(0, 5000);
  }

  // Handle direct JSON response
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return extractMcpContent(data.result);
}

/** Extract text content from MCP tools/call result */
function extractMcpContent(result: unknown): string {
  if (!result || typeof result !== "object") return JSON.stringify(result);
  const r = result as Record<string, unknown>;
  // MCP spec: result.content is an array of { type: "text", text: "..." }
  if (Array.isArray(r.content)) {
    const texts = r.content
      .filter((c: unknown) => c && typeof c === "object" && (c as Record<string, unknown>).type === "text")
      .map((c: unknown) => (c as Record<string, unknown>).text as string);
    if (texts.length > 0) return texts.join("\n");
  }
  return JSON.stringify(result);
}

export async function executeDatagouvTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ result: string; isError: boolean }> {
  try {
    const result = await callMcpTool(toolName, args);
    // Truncate very large results to avoid token explosion
    const truncated = result.length > 15000 ? result.slice(0, 15000) + "\n\n[... truncated — use more specific filters or pagination]" : result;
    return { result: truncated, isError: false };
  } catch (err) {
    return {
      result: `data.gouv.fr MCP error: ${(err as Error).message}. The data may be unavailable or the tool parameters may be incorrect.`,
      isError: true,
    };
  }
}
