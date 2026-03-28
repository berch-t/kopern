// Agent memory tools — remember, recall, forget, search_sessions
// Server-side only — uses Firebase Admin SDK

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { type ToolDefinition } from "@/lib/llm/client";

// --- Tool Definitions ---

export function getMemoryTools(): ToolDefinition[] {
  return [
    {
      name: "remember",
      description:
        "Save a fact, preference, or piece of context to persistent memory. This information will be available in future conversations. Use a descriptive key (e.g. 'client_name', 'pricing', 'preferred_tone').",
      input_schema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Short, descriptive key for this memory (e.g. 'client_name', 'business_hours')",
          },
          value: {
            type: "string",
            description: "The information to remember",
          },
          category: {
            type: "string",
            enum: ["fact", "preference", "context", "custom"],
            description: "Category of this memory (optional, default: 'fact')",
          },
        },
        required: ["key", "value"],
      },
    },
    {
      name: "recall",
      description:
        "Search your persistent memory for relevant facts. Use keywords to find previously saved information. Returns the most relevant memories ranked by relevance and recency.",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query — keywords to match against memory keys and values",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default 10)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "forget",
      description: "Remove a specific memory entry by its key.",
      input_schema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "The key of the memory to delete",
          },
        },
        required: ["key"],
      },
    },
    {
      name: "search_sessions",
      description:
        "Search past conversation sessions for relevant context. Finds messages from previous interactions that match the query. Useful for recalling details from earlier conversations.",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query — keywords to find in past conversations",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default 5)",
          },
        },
        required: ["query"],
      },
    },
  ];
}

// --- Helpers ---

const MEMORY_TOOL_NAMES = new Set(["remember", "recall", "forget", "search_sessions"]);

export function isMemoryTool(name: string): boolean {
  return MEMORY_TOOL_NAMES.has(name);
}

function memoryPath(userId: string, agentId: string) {
  return `users/${userId}/agents/${agentId}/memory`;
}

function sessionsPath(userId: string, agentId: string) {
  return `users/${userId}/agents/${agentId}/sessions`;
}

// --- Tool Execution ---

export async function executeMemoryTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  agentId: string
): Promise<{ result: string; isError: boolean }> {
  try {
    switch (toolName) {
      case "remember":
        return await executeRemember(args, userId, agentId);
      case "recall":
        return await executeRecall(args, userId, agentId);
      case "forget":
        return await executeForget(args, userId, agentId);
      case "search_sessions":
        return await executeSearchSessions(args, userId, agentId);
      default:
        return { result: `Unknown memory tool: ${toolName}`, isError: true };
    }
  } catch (err) {
    return { result: `Memory tool error: ${(err as Error).message}`, isError: true };
  }
}

// --- remember ---

async function executeRemember(
  args: Record<string, unknown>,
  userId: string,
  agentId: string
): Promise<{ result: string; isError: boolean }> {
  const key = String(args.key || "").trim();
  const value = String(args.value || "").trim();
  const category = (args.category as string) || "fact";

  if (!key || !value) {
    return { result: "Both 'key' and 'value' are required.", isError: true };
  }

  // Sanitize key for Firestore document ID (alphanumeric + underscores + hyphens)
  const docId = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  const ref = adminDb.doc(`${memoryPath(userId, agentId)}/${docId}`);
  const now = FieldValue.serverTimestamp();

  // Check if exists (upsert)
  const existing = await ref.get();
  if (existing.exists) {
    await ref.update({
      value,
      category,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: FieldValue.increment(1),
    });
    return { result: `Memory updated: "${key}" = "${value}"`, isError: false };
  }

  // Check max entries — read memoryConfig from agent
  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  const memoryConfig = agentSnap.data()?.memoryConfig;
  const maxEntries = memoryConfig?.maxEntries || 100;

  const countSnap = await adminDb.collection(memoryPath(userId, agentId)).count().get();
  const currentCount = countSnap.data().count;

  // LRU eviction if at capacity
  if (currentCount >= maxEntries) {
    const oldestSnap = await adminDb
      .collection(memoryPath(userId, agentId))
      .orderBy("lastAccessedAt", "asc")
      .limit(1)
      .get();
    if (!oldestSnap.empty) {
      await oldestSnap.docs[0].ref.delete();
    }
  }

  // Create new memory
  await ref.set({
    key,
    value,
    category,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    accessCount: 0,
  });

  return { result: `Memory saved: "${key}" = "${value}"`, isError: false };
}

// --- recall ---

async function executeRecall(
  args: Record<string, unknown>,
  userId: string,
  agentId: string
): Promise<{ result: string; isError: boolean }> {
  const query = String(args.query || "").trim().toLowerCase();
  const limit = Math.min(Number(args.limit) || 10, 50);

  if (!query) {
    return { result: "A 'query' is required.", isError: true };
  }

  const snap = await adminDb.collection(memoryPath(userId, agentId)).get();
  if (snap.empty) {
    return { result: "No memories found.", isError: false };
  }

  const keywords = query.split(/\s+/).filter(Boolean);
  const now = Date.now();

  // Score and rank memories
  const scored = snap.docs
    .map((doc) => {
      const data = doc.data();
      const text = `${data.key || ""} ${data.value || ""}`.toLowerCase();

      // Keyword match score
      let matchScore = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) matchScore += 1;
      }
      if (matchScore === 0) return null;
      matchScore /= keywords.length; // Normalize to 0-1

      // Temporal decay (half-life 30 days)
      const lastAccess = data.lastAccessedAt?.toDate?.() ?? data.updatedAt?.toDate?.() ?? new Date();
      const ageInDays = (now - lastAccess.getTime()) / 86_400_000;
      const decayFactor = Math.exp((-ageInDays * Math.LN2) / 30);

      // Access count boost (logarithmic)
      const accessBoost = 1 + Math.log2(1 + (data.accessCount || 0)) * 0.1;

      const finalScore = matchScore * decayFactor * accessBoost;

      return { id: doc.id, key: data.key, value: data.value, category: data.category, score: finalScore };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 0) {
    return { result: `No memories matching "${query}".`, isError: false };
  }

  // Update lastAccessedAt on returned results (fire-and-forget)
  const batch = adminDb.batch();
  for (const r of scored) {
    batch.update(adminDb.doc(`${memoryPath(userId, agentId)}/${r.id}`), {
      lastAccessedAt: FieldValue.serverTimestamp(),
      accessCount: FieldValue.increment(1),
    });
  }
  batch.commit().catch(() => { /* fire-and-forget */ });

  const formatted = scored
    .map((r) => `- **${r.key}**: ${r.value}${r.category ? ` [${r.category}]` : ""}`)
    .join("\n");

  return { result: `Found ${scored.length} memory entries:\n${formatted}`, isError: false };
}

// --- forget ---

async function executeForget(
  args: Record<string, unknown>,
  userId: string,
  agentId: string
): Promise<{ result: string; isError: boolean }> {
  const key = String(args.key || "").trim();
  if (!key) {
    return { result: "A 'key' is required.", isError: true };
  }

  const docId = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  const ref = adminDb.doc(`${memoryPath(userId, agentId)}/${docId}`);
  const existing = await ref.get();

  if (!existing.exists) {
    return { result: `No memory found with key "${key}".`, isError: false };
  }

  await ref.delete();
  return { result: `Memory "${key}" has been forgotten.`, isError: false };
}

// --- search_sessions ---

async function executeSearchSessions(
  args: Record<string, unknown>,
  userId: string,
  agentId: string
): Promise<{ result: string; isError: boolean }> {
  const query = String(args.query || "").trim().toLowerCase();
  const limit = Math.min(Number(args.limit) || 5, 20);

  if (!query) {
    return { result: "A 'query' is required.", isError: true };
  }

  // Load recent sessions (max 50)
  const sessionsSnap = await adminDb
    .collection(sessionsPath(userId, agentId))
    .orderBy("startedAt", "desc")
    .limit(50)
    .get();

  if (sessionsSnap.empty) {
    return { result: "No past sessions found.", isError: false };
  }

  const keywords = query.split(/\s+/).filter(Boolean);
  const now = Date.now();

  type SessionMatch = {
    sessionId: string;
    date: string;
    firstMessage: string;
    snippet: string;
    score: number;
  };

  const matches: SessionMatch[] = [];

  for (const doc of sessionsSnap.docs) {
    const data = doc.data();
    const events = (data.events || []) as { type: string; data: Record<string, unknown> }[];

    // Only search message events
    const messageTexts: string[] = [];
    let firstUserMessage = "";
    for (const ev of events) {
      if (ev.type === "message" && typeof ev.data?.content === "string") {
        messageTexts.push(ev.data.content);
        if (!firstUserMessage && ev.data.role === "user") {
          firstUserMessage = ev.data.content.slice(0, 120);
        }
      }
    }

    if (messageTexts.length === 0) continue;

    const fullText = messageTexts.join(" ").toLowerCase();

    // Keyword match
    let matchCount = 0;
    let bestSnippet = "";
    for (const kw of keywords) {
      const idx = fullText.indexOf(kw);
      if (idx >= 0) {
        matchCount++;
        if (!bestSnippet) {
          const start = Math.max(0, idx - 50);
          const end = Math.min(fullText.length, idx + kw.length + 100);
          bestSnippet = (start > 0 ? "..." : "") + fullText.slice(start, end) + (end < fullText.length ? "..." : "");
        }
      }
    }

    if (matchCount === 0) continue;

    // Temporal decay
    const sessionDate = data.startedAt?.toDate?.() ?? new Date();
    const ageInDays = (now - sessionDate.getTime()) / 86_400_000;
    const decayFactor = Math.exp((-ageInDays * Math.LN2) / 30);

    const score = (matchCount / keywords.length) * decayFactor;

    matches.push({
      sessionId: doc.id,
      date: sessionDate.toISOString().split("T")[0],
      firstMessage: firstUserMessage || "(no user message)",
      snippet: bestSnippet,
      score,
    });
  }

  matches.sort((a, b) => b.score - a.score);
  const topMatches = matches.slice(0, limit);

  if (topMatches.length === 0) {
    return { result: `No past sessions matching "${query}".`, isError: false };
  }

  const formatted = topMatches
    .map(
      (m) =>
        `- **${m.date}** — "${m.firstMessage}"\n  Match: ${m.snippet}`
    )
    .join("\n\n");

  return {
    result: `Found ${topMatches.length} relevant past session(s):\n\n${formatted}`,
    isError: false,
  };
}

// --- Helper: Inject memory context into system prompt ---

export async function injectMemoryContext(
  systemPrompt: string,
  userId: string,
  agentId: string
): Promise<string> {
  try {
    const memSnap = await adminDb
      .collection(memoryPath(userId, agentId))
      .orderBy("lastAccessedAt", "desc")
      .limit(20)
      .get();

    if (memSnap.empty) return systemPrompt;

    const memoryXml = memSnap.docs
      .map((d) => {
        const data = d.data();
        return `<memory key="${data.key}">${data.value}</memory>`;
      })
      .join("\n");

    return (
      systemPrompt +
      `\n\n<agent-memory>\nThese are facts you have remembered from previous conversations. Use them to provide personalized, contextual responses. You can use the 'remember' tool to save new facts and 'recall' to search your memory.\n${memoryXml}\n</agent-memory>`
    );
  } catch {
    return systemPrompt;
  }
}
