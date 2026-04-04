export const maxDuration = 600;

import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { resolveProviderKey, resolveProviderKeys } from "@/lib/llm/resolve-key";
import { teamExecuteSchema, validateBody } from "@/lib/security/validation";
import { checkRateLimit, chatRateLimit } from "@/lib/security/rate-limit";

interface TeamExecuteBody {
  prompt: string;
  userId: string;
  team: {
    name: string;
    executionMode: "parallel" | "sequential" | "conditional";
    agents: {
      agentId: string;
      agentName: string;
      role: string;
      order: number;
      systemPrompt: string;
      modelProvider: string;
      modelId: string;
      skills?: { name: string; content: string }[];
    }[];
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const raw = await request.json();
  const parsed = validateBody(teamExecuteSchema, raw);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data as TeamExecuteBody;
  const { prompt, userId, team } = body;

  // Rate limit
  const rl = await checkRateLimit(chatRateLimit, `team:${userId}`);
  if (rl) return rl;

  // Enforce plan: teams require Pro+
  if (userId) {
    const planCheck = await checkPlanLimits(userId, "teams");
    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: planCheck.reason, plan: planCheck.plan },
        { status: 403 }
      );
    }
    const tokenCheck = await checkPlanLimits(userId, "tokens");
    if (!tokenCheck.allowed) {
      return NextResponse.json(
        { error: tokenCheck.reason, plan: tokenCheck.plan },
        { status: 403 }
      );
    }
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      const runTimestamp = Date.now();
      const imageStoragePrefix = `teams/${teamId}/runs/${runTimestamp}`;
      console.log(`[Team Execute] Starting team "${team.name}" (${teamId}), mode=${team.executionMode}, agents=${team.agents.length}, user=${userId}, images→${imageStoragePrefix}`);
      send("team_start", { teamId, teamName: team.name, mode: team.executionMode });

      const sortedAgents = [...team.agents].sort((a, b) => a.order - b.order);

      /** Extract image URLs from [IMAGE_URL]...[/IMAGE_URL] tags in tool results */
      const IMAGE_URL_RE = /\[IMAGE_URL\](https?:\/\/[^\s[\]]+)\[\/IMAGE_URL\]/g;

      const runMember = async (
        agent: typeof sortedAgents[0],
        input: string
      ): Promise<{ text: string; imageUrls: string[] }> => {
        console.log(`[Team Execute] Running agent "${agent.agentName}" (${agent.agentId}), role=${agent.role}, model=${agent.modelProvider}/${agent.modelId}`);
        send("member_start", { agentId: agent.agentId, agentName: agent.agentName, role: agent.role });

        let systemPrompt = agent.systemPrompt || "";
        systemPrompt += `\n\n<team-context>
You are operating as part of an automated agent team in ${team.executionMode} mode. Your role: ${agent.role}
Team objective: ${prompt}

CRITICAL RULES:
- You are FULLY AUTONOMOUS. There is NO human in the loop during execution. Never ask questions, request confirmation, or wait for approval. Make decisions and produce your output directly.
- Your output is passed to the next agent in the pipeline. Produce COMPLETE, actionable output — not drafts or proposals.
- Do NOT reference "the user", "you", or ask "would you like". Address your output to the next agent or produce the final deliverable.
- If a tool call fails (403, timeout, etc.), work around it — use cached data, memory, or skip that source. Do not stop or ask for help.
- web_fetch: some sites block server requests (ProductHunt, npmjs, etc.). Use alternatives (news.ycombinator.com for HN, api.github.com for GitHub). Never fetch kopern.ai (blocked by anti-loop protection) — use your memory/skills for Kopern product knowledge.
- code_interpreter: write SELF-CONTAINED Python. Do NOT use undefined helper functions. Import all libraries explicitly (matplotlib, PIL, etc.). Escape all strings properly.
</team-context>`;

        if (agent.skills && agent.skills.length > 0) {
          const skillsXml = agent.skills
            .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
            .join("\n\n");
          systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
        }

        let result = "";
        const memberImageUrls: string[] = [];

        // Resolve API key(s) per agent's provider
        const apiKeys = userId ? await resolveProviderKeys(userId, agent.modelProvider) : [];
        const apiKey = apiKeys[0];

        await runAgentWithTools(
          {
            provider: agent.modelProvider,
            model: agent.modelId,
            systemPrompt,
            messages: [{ role: "user", content: input }],
            userId,
            agentId: agent.agentId,
            apiKey,
            apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
            skipOutboundWebhooks: true,
            imageStoragePrefix,
          },
          {
            onToken: (text) => {
              result += text;
              send("member_token", { agentId: agent.agentId, text });
            },
            onToolStart: (tc) => {
              send("member_tool_start", { agentId: agent.agentId, name: tc.name, args: tc.args });
            },
            onToolExecStart: (tc) => {
              send("member_tool_exec_start", { agentId: agent.agentId, name: tc.name, toolCallId: tc.toolCallId });
            },
            onToolEnd: (r) => {
              // Collect image URLs from generate_image tool results
              if (r.name === "generate_image" && !r.isError) {
                for (const match of r.result.matchAll(IMAGE_URL_RE)) {
                  memberImageUrls.push(match[1]);
                }
              }
              send("member_tool_end", { agentId: agent.agentId, name: r.name, result: r.result, isError: r.isError });
            },
            onDone: (metrics) => {
              console.log(`[Team Execute] Agent "${agent.agentName}" done: ${metrics.inputTokens}in/${metrics.outputTokens}out, ${metrics.toolCallCount} tools, ${metrics.toolIterations} iterations, ${memberImageUrls.length} images`);
              send("member_done", { agentId: agent.agentId, agentName: agent.agentName, result, metrics, imageUrls: memberImageUrls });
            },
            onError: (error) => {
              console.error(`[Team Execute] Agent "${agent.agentName}" (${agent.agentId}) error:`, error.message);
              send("member_error", { agentId: agent.agentId, message: error.message });
            },
          }
        );

        return { text: result, imageUrls: memberImageUrls };
      };

      if (team.executionMode === "parallel") {
        const promises = sortedAgents.map((agent) => runMember(agent, prompt));
        const settled = await Promise.allSettled(promises);
        const successResults = settled
          .map((r, i) => ({
            agentId: sortedAgents[i].agentId,
            agentName: sortedAgents[i].agentName,
            role: sortedAgents[i].role,
            result: r.status === "fulfilled" ? r.value.text : "",
          }));
        send("team_done", { teamId, results: successResults });
      } else if (team.executionMode === "sequential") {
        let previousOutput = "";
        let previousImageUrls: string[] = [];
        const allResults: { agentId: string; agentName: string; role: string; result: string }[] = [];

        for (const agent of sortedAgents) {
          let input = previousOutput
            ? `Original request: ${prompt}\n\nPrevious agent output:\n${previousOutput}`
            : prompt;

          // Inject image URLs from previous agent so the next agent can reference them
          if (previousImageUrls.length > 0) {
            input += `\n\n<generated-images>\nThe previous agent generated the following images. Use these URLs when referencing visuals in posts:\n${previousImageUrls.map((url, i) => `- Image ${i + 1}: ${url}`).join("\n")}\n</generated-images>`;
          }

          const { text, imageUrls } = await runMember(agent, input);
          previousOutput = text;
          previousImageUrls = imageUrls;
          allResults.push({ agentId: agent.agentId, agentName: agent.agentName, role: agent.role, result: text });
        }

        send("team_done", { teamId, results: allResults });
      } else {
        // Conditional: first agent routes, selected agent executes
        const router = sortedAgents[0];
        if (!router) {
          send("error", { message: "No agents in team" });
          close();
          return;
        }

        const { text: routerText } = await runMember(router,
          `You are a routing agent. Given the following request, decide which specialist agent should handle it.
Available agents: ${sortedAgents.slice(1).map((a) => `${a.agentName} (role: ${a.role})`).join(", ")}
Respond with ONLY the agent name that should handle this request.

Request: ${prompt}`
        );

        const selectedAgent = sortedAgents.slice(1).find((a) =>
          routerText.toLowerCase().includes(a.agentName.toLowerCase())
        ) ?? sortedAgents[1];

        if (selectedAgent) {
          const { text: selectedText } = await runMember(selectedAgent, prompt);
          send("team_done", { teamId, results: [{ agentId: selectedAgent.agentId, agentName: selectedAgent.agentName, role: selectedAgent.role, result: selectedText }] });
        }
      }

      close();
    } catch (err) {
      console.error(`[Team Execute] Fatal error for team "${team.name}" (${teamId}):`, (err as Error).message, (err as Error).stack);
      send("error", { message: (err as Error).message });
      close();
    }
  })();

  return sseResponse(stream);
}
