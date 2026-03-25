// PISTE / Légifrance API tools — server-side OAuth2 + HTTP calls
// Provides access to French legal texts (Code du travail, Code civil, JORF, KALI, etc.)
// Requires env vars: PISTE_CLIENT_ID, PISTE_CLIENT_SECRET

import { type ToolDefinition } from "@/lib/llm/client";

const TOKEN_URL = process.env.PISTE_OAUTH_URL || "https://oauth.piste.gouv.fr/api/oauth/token";
const API_BASE = process.env.PISTE_API_URL || "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app";

// --- OAuth2 Token Cache ---

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s margin)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.PISTE_CLIENT_ID;
  const clientSecret = process.env.PISTE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PISTE API credentials not configured (PISTE_CLIENT_ID, PISTE_CLIENT_SECRET)");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "openid",
    }),
  });

  if (!response.ok) {
    throw new Error(`PISTE OAuth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

// --- API Call Helper ---

async function callPiste(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Légifrance API ${endpoint} returned ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

// --- Tool Definitions ---

export function getPisteTools(): ToolDefinition[] {
  return [
    {
      name: "legifrance_search",
      description:
        "Search across all French legal texts (codes, laws, decrees, conventions collectives). Returns matching articles with titles and references. Use this as the primary search tool for any legal question.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (e.g., 'préavis licenciement CDI', 'congés payés')" },
          fund: {
            type: "string",
            enum: ["CODE_DATE", "LODA_DATE", "JORF", "KALI_TEXT", "ALL"],
            description: "Legal fund to search: CODE_DATE (codes), LODA_DATE (laws/decrees), JORF (official journal), KALI_TEXT (conventions collectives), ALL (all funds). Default: CODE_DATE",
          },
          page_size: { type: "number", description: "Results per page (default: 10, max: 50)" },
        },
        required: ["query"],
      },
    },
    {
      name: "legifrance_get_article",
      description:
        "Get the full text of a specific legal article by its ID. Use after searching to retrieve the complete article content. The article ID comes from search results.",
      input_schema: {
        type: "object",
        properties: {
          article_id: { type: "string", description: "Article ID (e.g., 'LEGIARTI000006901109')" },
        },
        required: ["article_id"],
      },
    },
    {
      name: "legifrance_get_code_toc",
      description:
        "Get the table of contents (structure) of a French legal code. Useful to find the right section before searching for specific articles. Returns sections and article references.",
      input_schema: {
        type: "object",
        properties: {
          code_name: {
            type: "string",
            description: "Code name to look up. Common codes: LEGITEXT000006072050 (Code du travail), LEGITEXT000006070721 (Code civil), LEGITEXT000006069577 (Code général des impôts), LEGITEXT000006070633 (Code de commerce)",
          },
          date: { type: "string", description: "Date for the version (YYYY-MM-DD, default: today)" },
        },
        required: ["code_name"],
      },
    },
    {
      name: "legifrance_list_codes",
      description:
        "List all available French legal codes (Code du travail, Code civil, Code pénal, etc.) with their IDs. Use this to find the correct code ID before browsing its table of contents.",
      input_schema: {
        type: "object",
        properties: {
          page: { type: "number", description: "Page number (default: 1)" },
          page_size: { type: "number", description: "Results per page (default: 20, max: 100)" },
        },
      },
    },
    {
      name: "legifrance_list_conventions",
      description:
        "List national collective labor agreements (conventions collectives nationales). Returns IDCC numbers, titles, and IDs.",
      input_schema: {
        type: "object",
        properties: {
          page: { type: "number", description: "Page number (default: 1)" },
          page_size: { type: "number", description: "Results per page (default: 20, max: 100)" },
        },
      },
    },
    {
      name: "legifrance_get_convention",
      description:
        "Get the full content of a specific convention collective by its text ID. Returns articles, sections, and metadata.",
      input_schema: {
        type: "object",
        properties: {
          text_id: { type: "string", description: "Convention text ID (e.g., 'KALICONT000005635234')" },
        },
        required: ["text_id"],
      },
    },
  ];
}

// --- Tool Execution ---

const PISTE_TOOL_NAMES = new Set([
  "legifrance_search",
  "legifrance_get_article",
  "legifrance_get_code_toc",
  "legifrance_list_codes",
  "legifrance_list_conventions",
  "legifrance_get_convention",
]);

export function isPisteTool(name: string): boolean {
  return PISTE_TOOL_NAMES.has(name);
}

export async function executePisteTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ result: string; isError: boolean }> {
  try {
    let result: string;
    switch (toolName) {
      case "legifrance_search":
        result = await executeSearch(args);
        break;
      case "legifrance_get_article":
        result = await executeGetArticle(args);
        break;
      case "legifrance_get_code_toc":
        result = await executeGetCodeToc(args);
        break;
      case "legifrance_list_codes":
        result = await executeListCodes(args);
        break;
      case "legifrance_list_conventions":
        result = await executeListConventions(args);
        break;
      case "legifrance_get_convention":
        result = await executeGetConvention(args);
        break;
      default:
        return { result: `Unknown PISTE tool: ${toolName}`, isError: true };
    }
    // Truncate to avoid token explosion
    const truncated = result.length > 15000
      ? result.slice(0, 15000) + "\n\n[... truncated — refine your search or request a specific article]"
      : result;
    return { result: truncated, isError: false };
  } catch (err) {
    return {
      result: `Légifrance API error: ${(err as Error).message}`,
      isError: true,
    };
  }
}

// --- Implementations ---

async function executeSearch(args: Record<string, unknown>): Promise<string> {
  const query = args.query as string;
  if (!query) throw new Error("Missing required: query");

  const fund = (args.fund as string) || "CODE_DATE";
  const pageSize = Math.min((args.page_size as number) || 10, 50);

  const searchBody: Record<string, unknown> = {
    fond: fund === "ALL" ? "CODE_DATE" : fund,
    recherche: {
      champs: [
        { typeChamp: "ALL", criteres: [{ typeRecherche: "UN_DES_MOTS", valeur: query, operateur: "ET" }], operateur: "ET" },
      ],
      filtres: [],
      pageNumber: 1,
      pageSize,
      sort: "PERTINENCE",
      secondSort: "ID",
      typePagination: "DEFAUT",
      fromAdvancedRecherche: "false",
    },
  };

  const data = await callPiste("/search", searchBody) as Record<string, unknown>;
  const results = data.results as Record<string, unknown>[] | undefined;

  if (!results || results.length === 0) {
    return `No results found for "${query}" in fund ${fund}.`;
  }

  const totalCount = (data.totalResultNumber as number) || results.length;
  let output = `Found ${totalCount} result(s) for "${query}" in ${fund} (showing ${results.length}):\n\n`;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    // titles can be array or object depending on endpoint version
    const titlesRaw = r.titles;
    const title = Array.isArray(titlesRaw)
      ? (titlesRaw[0] as Record<string, string>)?.title || "Untitled"
      : (titlesRaw as Record<string, string>)?.titreLong || (titlesRaw as Record<string, string>)?.title || "Untitled";
    const id = r.id as string || "";

    output += `${i + 1}. ${title}\n`;
    if (id) output += `   Text ID: ${id}\n`;

    // Extract matching articles from sections
    const sections = r.sections as Record<string, unknown>[] | undefined;
    if (sections) {
      for (const section of sections.slice(0, 2)) {
        const extracts = section.extracts as Record<string, unknown>[] | undefined;
        if (extracts) {
          for (const ext of extracts.slice(0, 3)) {
            const artTitle = ext.title as string || "";
            const artId = ext.id as string || "";
            const artStatus = ext.legalStatus as string || "";
            output += `   - Art. ${artTitle} [${artId}] (${artStatus})\n`;
          }
          if (extracts.length > 3) {
            output += `   - ... and ${extracts.length - 3} more articles\n`;
          }
        }
      }
    }
    output += "\n";
  }

  return output;
}

async function executeGetArticle(args: Record<string, unknown>): Promise<string> {
  const articleId = args.article_id as string;
  if (!articleId) throw new Error("Missing required: article_id");

  const data = await callPiste("/consult/getArticle", { id: articleId }) as Record<string, unknown>;
  const article = data.article as Record<string, unknown> | undefined;

  if (!article) {
    return `Article ${articleId} not found.`;
  }

  const texte = article.texte as string || article.texteHtml as string || "";
  const nota = article.nota as string || "";
  const num = article.num as string || "";
  const etat = article.etat as string || "";
  const dateDebut = article.dateDebut as string || "";
  const dateFin = article.dateFin as string || "";

  let output = "";
  if (num) output += `Article ${num}\n`;
  if (etat) output += `Status: ${etat}\n`;
  if (dateDebut) output += `In effect since: ${formatDate(dateDebut)}\n`;
  if (dateFin) output += `Until: ${formatDate(dateFin)}\n`;
  output += `\n${stripHtml(texte)}\n`;
  if (nota) output += `\nNota: ${stripHtml(nota)}\n`;

  // Context: which code/law it belongs to
  const context = article.context as Record<string, unknown> | undefined;
  if (context?.titreTxt) {
    output += `\nSource: ${context.titreTxt}\n`;
  }

  return output;
}

async function executeGetCodeToc(args: Record<string, unknown>): Promise<string> {
  const codeId = args.code_name as string;
  if (!codeId) throw new Error("Missing required: code_name");

  const dateStr = (args.date as string) || new Date().toISOString().split("T")[0];

  const data = await callPiste("/consult/code/tableMatieres", {
    textId: codeId,
    date: dateStr,
  }) as Record<string, unknown>;

  const sections = data.sections as Record<string, unknown>[] | undefined;
  if (!sections || sections.length === 0) {
    return `No table of contents found for code ${codeId}.`;
  }

  let output = `Table of contents for ${(data.title as string) || codeId}:\n\n`;
  output += formatSections(sections, 0, 3); // Max depth 3 to avoid huge output

  return output;
}

async function executeListCodes(args: Record<string, unknown>): Promise<string> {
  const page = (args.page as number) || 1;
  const pageSize = Math.min((args.page_size as number) || 20, 100);

  const data = await callPiste("/list/code", {
    pageNumber: page,
    pageSize,
  }) as Record<string, unknown>;

  const results = data.results as Record<string, unknown>[] | undefined;
  if (!results || results.length === 0) {
    return "No codes found.";
  }

  let output = `French Legal Codes (page ${page}):\n\n`;
  for (const code of results) {
    const title = code.title as string || code.titreLong as string || "Untitled";
    const id = code.id as string || code.textId as string || "";
    const etat = code.etat as string || "";
    output += `- ${title}\n  ID: ${id}${etat ? ` (${etat})` : ""}\n`;
  }

  return output;
}

async function executeListConventions(args: Record<string, unknown>): Promise<string> {
  const page = (args.page as number) || 1;
  const pageSize = Math.min((args.page_size as number) || 20, 100);

  const data = await callPiste("/list/conventions", {
    pageNumber: page,
    pageSize,
  }) as Record<string, unknown>;

  const results = data.results as Record<string, unknown>[] | undefined;
  if (!results || results.length === 0) {
    return "No conventions found.";
  }

  let output = `Conventions collectives nationales (page ${page}):\n\n`;
  for (const conv of results) {
    const title = conv.title as string || conv.titreLong as string || "Untitled";
    const id = conv.id as string || conv.textId as string || "";
    const idcc = conv.idcc as string || "";
    output += `- ${title}\n  ID: ${id}${idcc ? ` | IDCC: ${idcc}` : ""}\n`;
  }

  return output;
}

async function executeGetConvention(args: Record<string, unknown>): Promise<string> {
  const textId = args.text_id as string;
  if (!textId) throw new Error("Missing required: text_id");

  const data = await callPiste("/consult/kaliText", {
    textId,
  }) as Record<string, unknown>;

  const title = (data.title as string) || (data.titreLong as string) || textId;
  const sections = data.sections as Record<string, unknown>[] | undefined;

  let output = `Convention: ${title}\n\n`;
  if (sections) {
    output += formatSections(sections, 0, 2);
  } else {
    output += JSON.stringify(data, null, 2).slice(0, 10000);
  }

  return output;
}

// --- Helpers ---

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDate(raw: string): string {
  // PISTE dates can be timestamps or YYYYMMDD
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  const n = Number(raw);
  if (!isNaN(n) && n > 1e12) {
    return new Date(n).toISOString().split("T")[0];
  }
  return raw;
}

function formatSections(
  sections: Record<string, unknown>[],
  depth: number,
  maxDepth: number
): string {
  if (depth >= maxDepth) return "";
  let output = "";
  const indent = "  ".repeat(depth);
  for (const s of sections) {
    const title = (s.title as string) || (s.titreLong as string) || "";
    const id = s.id as string || "";
    output += `${indent}- ${title}${id ? ` [${id}]` : ""}\n`;
    const children = s.sections as Record<string, unknown>[] | undefined;
    if (children?.length) {
      output += formatSections(children, depth + 1, maxDepth);
    }
    const articles = s.articles as Record<string, unknown>[] | undefined;
    if (articles?.length && depth === maxDepth - 1) {
      for (const a of articles.slice(0, 5)) {
        const num = a.num as string || "";
        const aid = a.id as string || "";
        output += `${indent}  * Art. ${num}${aid ? ` [${aid}]` : ""}\n`;
      }
      if (articles.length > 5) {
        output += `${indent}  * ... and ${articles.length - 5} more articles\n`;
      }
    }
  }
  return output;
}
