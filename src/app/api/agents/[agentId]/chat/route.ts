import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { calculateTokenCost } from "@/lib/billing/pricing";
import { createSessionServer, endSessionServer, updateSessionMetrics, appendSessionEvents } from "@/lib/billing/track-usage-server";
import { adminDb } from "@/lib/firebase/admin";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { logAppError } from "@/lib/errors/logger";
import { resolveProviderKey } from "@/lib/llm/resolve-key";

interface ChatRequestBody {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  userId?: string;
  connectedRepos?: string[];
  sessionId?: string;
  agentConfig: {
    systemPrompt: string;
    modelProvider: string;
    modelId: string;
    skills?: { name: string; content: string }[];
    purpose?: string | null;
    tillDoneEnabled?: boolean;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = (await request.json()) as ChatRequestBody;
  const { message, history, agentConfig, userId, connectedRepos } = body;

  // Skip plan limits for internal triggers (bug fixer, admin)
  const isInternalTrigger = request.headers.get("X-Internal-Trigger") === "bug-fixer";
  const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);
  const isAdmin = userId ? ADMIN_UIDS.includes(userId) : false;

  // Enforce plan limits (unless internal trigger or admin)
  if (userId && !isInternalTrigger && !isAdmin) {
    const planCheck = await checkPlanLimits(userId, "tokens");
    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: planCheck.reason, plan: planCheck.plan },
        { status: 403 }
      );
    }
    // Enforce model restriction
    const modelCheck = await checkPlanLimits(userId, "model", { modelId: agentConfig.modelId });
    if (!modelCheck.allowed) {
      return NextResponse.json(
        { error: modelCheck.reason, plan: modelCheck.plan },
        { status: 403 }
      );
    }
    // Enforce GitHub integration limit
    if (connectedRepos && connectedRepos.length > 0) {
      const ghCheck = await checkPlanLimits(userId, "github");
      if (!ghCheck.allowed) {
        return NextResponse.json(
          { error: ghCheck.reason, plan: ghCheck.plan },
          { status: 403 }
        );
      }
    }
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      // Create or reuse session
      let sessionId = body.sessionId || "";
      if (!sessionId && userId) {
        try {
          sessionId = await createSessionServer(userId, agentId, {
            purpose: agentConfig.purpose || message.slice(0, 120) || null,
            modelUsed: agentConfig.modelId,
            providerUsed: agentConfig.modelProvider,
          });
          send("session", { sessionId });
        } catch {
          // Continue without session tracking
        }
      }

      // Build system prompt
      let systemPrompt = agentConfig.systemPrompt || "";

      // Inject connected GitHub repos context
      if (connectedRepos && connectedRepos.length > 0 && userId) {
        const repoContext = await fetchRepoContext(userId, connectedRepos);
        if (repoContext) {
          systemPrompt += `\n\n${repoContext}`;
        }
      }
      if (agentConfig.skills && agentConfig.skills.length > 0) {
        const skillsXml = agentConfig.skills
          .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
          .join("\n\n");
        systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
      }

      if (agentConfig.purpose) {
        systemPrompt += `\n\n<session-purpose>\n${agentConfig.purpose}\n</session-purpose>`;
      }

      if (agentConfig.tillDoneEnabled) {
        systemPrompt += `\n\n<till-done-mode>
You MUST maintain a task list for this session. Before executing any action:
1. Create a task describing what you plan to do
2. Update the task status to "in_progress" when starting
3. Mark it "done" when complete
4. Do NOT finish until all tasks are marked done
</till-done-mode>`;
      }

      // Build message history
      const messages = [
        ...(history || []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: message },
      ];

      send("status", { status: "thinking" });

      // Resolve API key from user Firestore settings
      const apiKey = userId ? await resolveProviderKey(userId, agentConfig.modelProvider) : undefined;

      // Track events for session history
      let assistantOutput = "";
      const toolEvents: { type: string; data: Record<string, unknown> }[] = [];

      // Record user message event
      if (userId && sessionId) {
        appendSessionEvents(userId, agentId, sessionId, [
          { type: "message", data: { role: "user", content: message } },
        ]).catch((err) => logAppError({ code: "SESSION_EVENT_WRITE_FAILED", message: (err as Error).message, source: "session", userId, agentId }));
      }

      await runAgentWithTools(
        {
          provider: agentConfig.modelProvider,
          model: agentConfig.modelId,
          systemPrompt,
          messages,
          userId,
          agentId,
          connectedRepos,
          apiKey,
        },
        {
          onToken: (text) => {
            assistantOutput += text;
            send("token", { text });
          },
          onToolStart: (tc) => {
            toolEvents.push({ type: "tool_call", data: { name: tc.name, args: tc.args } });
            send("tool_start", { name: tc.name, args: tc.args });
          },
          onToolEnd: (result) => {
            toolEvents.push({ type: "tool_result", data: { name: result.name, result: result.result, isError: result.isError } });
            send("tool_end", { name: result.name, result: result.result, isError: result.isError });
          },
          onDone: (metrics) => {
            const cost = calculateTokenCost(
              agentConfig.modelProvider,
              metrics.inputTokens,
              metrics.outputTokens
            );

            // Persist session events + metrics (fire-and-forget)
            if (userId && sessionId) {
              const events = [
                ...toolEvents,
                { type: "message", data: { role: "assistant", content: assistantOutput.slice(0, 10000) } },
              ];
              appendSessionEvents(userId, agentId, sessionId, events).catch((err) => logAppError({ code: "SESSION_EVENT_WRITE_FAILED", message: (err as Error).message, source: "session", userId, agentId }));
              updateSessionMetrics(userId, agentId, sessionId, {
                inputTokens: metrics.inputTokens,
                outputTokens: metrics.outputTokens,
                cost,
                toolCallCount: metrics.toolCallCount,
                messageCount: 2,
              }).catch((err) => logAppError({ code: "SESSION_METRICS_WRITE_FAILED", message: (err as Error).message, source: "session", userId, agentId }));
            }

            send("done", {
              agentId,
              sessionId,
              metrics: {
                inputTokens: metrics.inputTokens,
                outputTokens: metrics.outputTokens,
                estimatedCost: cost,
                toolIterations: metrics.toolIterations,
                toolCallCount: metrics.toolCallCount,
              },
            });
            close();
          },
          onError: (error) => {
            // End session on error
            if (userId && sessionId) {
              endSessionServer(userId, agentId, sessionId).catch((err) => logAppError({ code: "SESSION_END_FAILED", message: (err as Error).message, source: "session", userId, agentId }));
            }
            send("error", { message: error.message });
            close();
          },
        }
      );
    } catch (err) {
      send("error", { message: (err as Error).message });
      close();
    }
  })();

  return sseResponse(stream);
}

/**
 * Fetch repo tree + README for connected repos and format as context.
 */
async function fetchRepoContext(
  userId: string,
  repos: string[]
): Promise<string | null> {
  try {
    const userSnap = await adminDb.doc(`users/${userId}`).get();
    const githubToken = userSnap.data()?.githubAccessToken;
    if (!githubToken) return null;

    const IGNORE_PATTERNS = [
      /^node_modules\//,
      /^\.git\//,
      /^dist\//,
      /^build\//,
      /^\.next\//,
      /^coverage\//,
      /^__pycache__\//,
      /\.lock$/,
      /\.map$/,
      /\.min\.(js|css)$/,
    ];

    const sections: string[] = [];

    for (const repo of repos.slice(0, 3)) {
      const treeRes = await fetch(
        `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      if (!treeRes.ok) continue;

      const treeData = await treeRes.json();
      const files = (treeData.tree || [])
        .filter((item: { path: string; type: string }) =>
          item.type === "blob" && !IGNORE_PATTERNS.some((p) => p.test(item.path))
        )
        .map((item: { path: string }) => item.path)
        .slice(0, 300);

      let repoSection = `<connected-repo name="${repo}">\n`;
      repoSection += `<file-tree>\n${files.join("\n")}\n</file-tree>\n`;

      const readmeEntry = (treeData.tree || []).find(
        (item: { path: string }) => /^readme\.md$/i.test(item.path)
      );
      if (readmeEntry) {
        try {
          const readmeRes = await fetch(
            `https://api.github.com/repos/${repo}/contents/${readmeEntry.path}`,
            {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: "application/vnd.github.raw+json",
              },
            }
          );
          if (readmeRes.ok) {
            let readme = await readmeRes.text();
            if (readme.length > 2000) {
              readme = readme.slice(0, 2000) + "\n[... truncated]";
            }
            repoSection += `<readme>\n${readme}\n</readme>\n`;
          }
        } catch {
          // skip
        }
      }

      repoSection += `</connected-repo>`;
      sections.push(repoSection);
    }

    if (sections.length === 0) return null;

    return `<github-context>
You have access to the following connected GitHub repositories. Use the file tree to understand the project structure. You can use the read_file and search_files tools to inspect specific files.

${sections.join("\n\n")}
</github-context>`;
  } catch {
    return null;
  }
}
