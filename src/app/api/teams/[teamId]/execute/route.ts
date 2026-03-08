import { NextRequest } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";

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
  const body = (await request.json()) as TeamExecuteBody;
  const { prompt, team } = body;

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      send("team_start", { teamId, teamName: team.name, mode: team.executionMode });

      const sortedAgents = [...team.agents].sort((a, b) => a.order - b.order);

      if (team.executionMode === "parallel") {
        // Run all agents simultaneously
        const promises = sortedAgents.map(async (agent) => {
          send("member_start", { agentId: agent.agentId, agentName: agent.agentName, role: agent.role });

          let result = "";
          const systemPrompt = buildTeamMemberPrompt(agent, prompt);
          const messages: LLMMessage[] = [{ role: "user", content: prompt }];

          await streamLLM(
            { provider: agent.modelProvider, model: agent.modelId, systemPrompt, messages },
            {
              onToken: (text) => {
                result += text;
                send("member_token", { agentId: agent.agentId, text });
              },
              onDone: () => {
                send("member_done", { agentId: agent.agentId, agentName: agent.agentName, result });
              },
              onError: (error) => {
                send("member_error", { agentId: agent.agentId, message: error.message });
              },
            }
          );

          return { agentId: agent.agentId, agentName: agent.agentName, role: agent.role, result };
        });

        const results = await Promise.allSettled(promises);
        const successResults = results
          .filter((r): r is PromiseFulfilledResult<{ agentId: string; agentName: string; role: string; result: string }> => r.status === "fulfilled")
          .map((r) => r.value);

        send("team_done", { teamId, results: successResults });
      } else if (team.executionMode === "sequential") {
        // Run agents in sequence, passing output forward
        let previousOutput = "";
        const allResults: { agentId: string; agentName: string; role: string; result: string }[] = [];

        for (const agent of sortedAgents) {
          send("member_start", { agentId: agent.agentId, agentName: agent.agentName, role: agent.role });

          let result = "";
          const systemPrompt = buildTeamMemberPrompt(agent, prompt);
          const contextMessage = previousOutput
            ? `Original request: ${prompt}\n\nPrevious agent output:\n${previousOutput}`
            : prompt;
          const messages: LLMMessage[] = [{ role: "user", content: contextMessage }];

          await streamLLM(
            { provider: agent.modelProvider, model: agent.modelId, systemPrompt, messages },
            {
              onToken: (text) => {
                result += text;
                send("member_token", { agentId: agent.agentId, text });
              },
              onDone: () => {
                send("member_done", { agentId: agent.agentId, agentName: agent.agentName, result });
              },
              onError: (error) => {
                send("member_error", { agentId: agent.agentId, message: error.message });
              },
            }
          );

          previousOutput = result;
          allResults.push({ agentId: agent.agentId, agentName: agent.agentName, role: agent.role, result });
        }

        send("team_done", { teamId, results: allResults });
      } else {
        // Conditional: first agent decides routing, then selected agent executes
        const router = sortedAgents[0];
        if (!router) {
          send("error", { message: "No agents in team" });
          close();
          return;
        }

        send("member_start", { agentId: router.agentId, agentName: router.agentName, role: "router" });

        let routerResult = "";
        const routerPrompt = `You are a routing agent. Given the following request, decide which specialist agent should handle it.
Available agents: ${sortedAgents.slice(1).map((a) => `${a.agentName} (role: ${a.role})`).join(", ")}
Respond with ONLY the agent name that should handle this request.`;

        await streamLLM(
          { provider: router.modelProvider, model: router.modelId, systemPrompt: routerPrompt, messages: [{ role: "user", content: prompt }] },
          {
            onToken: (text) => { routerResult += text; },
            onDone: () => { send("member_done", { agentId: router.agentId, agentName: router.agentName, result: routerResult }); },
            onError: (error) => { send("member_error", { agentId: router.agentId, message: error.message }); },
          }
        );

        // Find the selected agent
        const selectedAgent = sortedAgents.slice(1).find((a) =>
          routerResult.toLowerCase().includes(a.agentName.toLowerCase())
        ) ?? sortedAgents[1];

        if (selectedAgent) {
          send("member_start", { agentId: selectedAgent.agentId, agentName: selectedAgent.agentName, role: selectedAgent.role });

          let selectedResult = "";
          const systemPrompt = buildTeamMemberPrompt(selectedAgent, prompt);

          await streamLLM(
            { provider: selectedAgent.modelProvider, model: selectedAgent.modelId, systemPrompt, messages: [{ role: "user", content: prompt }] },
            {
              onToken: (text) => { selectedResult += text; send("member_token", { agentId: selectedAgent.agentId, text }); },
              onDone: () => { send("member_done", { agentId: selectedAgent.agentId, agentName: selectedAgent.agentName, result: selectedResult }); },
              onError: (error) => { send("member_error", { agentId: selectedAgent.agentId, message: error.message }); },
            }
          );

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

function buildTeamMemberPrompt(
  agent: { role: string; systemPrompt: string; skills?: { name: string; content: string }[] },
  teamPrompt: string
): string {
  let prompt = agent.systemPrompt || "";

  prompt += `\n\n<team-context>\nYou are operating as part of an agent team. Your role: ${agent.role}\nTeam objective: ${teamPrompt}\n</team-context>`;

  if (agent.skills && agent.skills.length > 0) {
    const skillsXml = agent.skills
      .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
      .join("\n\n");
    prompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
  }

  return prompt;
}
