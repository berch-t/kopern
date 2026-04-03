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
      send("team_start", { teamId, teamName: team.name, mode: team.executionMode });

      const sortedAgents = [...team.agents].sort((a, b) => a.order - b.order);

      const runMember = async (
        agent: typeof sortedAgents[0],
        input: string
      ): Promise<string> => {
        send("member_start", { agentId: agent.agentId, agentName: agent.agentName, role: agent.role });

        let systemPrompt = agent.systemPrompt || "";
        systemPrompt += `\n\n<team-context>\nYou are operating as part of an agent team. Your role: ${agent.role}\nTeam objective: ${prompt}\n</team-context>`;

        if (agent.skills && agent.skills.length > 0) {
          const skillsXml = agent.skills
            .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
            .join("\n\n");
          systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
        }

        let result = "";

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
          },
          {
            onToken: (text) => {
              result += text;
              send("member_token", { agentId: agent.agentId, text });
            },
            onToolStart: (tc) => {
              send("member_tool_start", { agentId: agent.agentId, name: tc.name, args: tc.args });
            },
            onToolEnd: (r) => {
              send("member_tool_end", { agentId: agent.agentId, name: r.name, result: r.result, isError: r.isError });
            },
            onDone: (metrics) => {
              send("member_done", { agentId: agent.agentId, agentName: agent.agentName, result, metrics });
            },
            onError: (error) => {
              send("member_error", { agentId: agent.agentId, message: error.message });
            },
          }
        );

        return result;
      };

      if (team.executionMode === "parallel") {
        const promises = sortedAgents.map((agent) => runMember(agent, prompt));
        const results = await Promise.allSettled(promises);
        const successResults = results
          .map((r, i) => ({
            agentId: sortedAgents[i].agentId,
            agentName: sortedAgents[i].agentName,
            role: sortedAgents[i].role,
            result: r.status === "fulfilled" ? r.value : "",
          }));
        send("team_done", { teamId, results: successResults });
      } else if (team.executionMode === "sequential") {
        let previousOutput = "";
        const allResults: { agentId: string; agentName: string; role: string; result: string }[] = [];

        for (const agent of sortedAgents) {
          const input = previousOutput
            ? `Original request: ${prompt}\n\nPrevious agent output:\n${previousOutput}`
            : prompt;
          const result = await runMember(agent, input);
          previousOutput = result;
          allResults.push({ agentId: agent.agentId, agentName: agent.agentName, role: agent.role, result });
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

        const routerResult = await runMember(router,
          `You are a routing agent. Given the following request, decide which specialist agent should handle it.
Available agents: ${sortedAgents.slice(1).map((a) => `${a.agentName} (role: ${a.role})`).join(", ")}
Respond with ONLY the agent name that should handle this request.

Request: ${prompt}`
        );

        const selectedAgent = sortedAgents.slice(1).find((a) =>
          routerResult.toLowerCase().includes(a.agentName.toLowerCase())
        ) ?? sortedAgents[1];

        if (selectedAgent) {
          const selectedResult = await runMember(selectedAgent, prompt);
          send("team_done", { teamId, results: [{ agentId: selectedAgent.agentId, agentName: selectedAgent.agentName, role: selectedAgent.role, result: selectedResult }] });
        }
      }

      close();
    } catch (err) {
      send("error", { message: (err as Error).message });
      close();
    }
  })();

  return sseResponse(stream);
}
