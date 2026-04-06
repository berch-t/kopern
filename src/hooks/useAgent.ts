"use client";

import { useCallback, useRef, useState } from "react";
import { useSSE } from "./useSSE";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallInfo[];
  timestamp: number;
}

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  /** True when the tool is actively executing (after approval, before result) */
  executing?: boolean;
  result?: string;
  isError?: boolean;
}

export interface PendingApproval {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  isDestructive: boolean;
  timestamp: number;
}

export interface SessionMetrics {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  toolIterations: number;
  toolCallCount: number;
}

export interface AgentPlaygroundConfig {
  systemPrompt: string;
  modelProvider: string;
  modelId: string;
  skills?: { name: string; content: string }[];
  connectedRepos?: string[];
  userId?: string;
}

export function useAgent(agentId: string, agentConfig: AgentPlaygroundConfig | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAssistantContent, setCurrentAssistantContent] = useState("");
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCallInfo[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);
  const [cumulativeMetrics, setCumulativeMetrics] = useState<SessionMetrics>({
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    toolIterations: 0,
    toolCallCount: 0,
  });

  // Use refs to avoid stale closure in onMessage callbacks
  const contentRef = useRef("");
  const toolCallsRef = useRef<ToolCallInfo[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const sessionIdRef = useRef<string>("");
  const cumulativeRef = useRef<SessionMetrics>({
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    toolIterations: 0,
    toolCallCount: 0,
  });

  const { isStreaming, start, stop } = useSSE({
    onError: (error) => {
      const msg = error.message;
      const isPlanLimit = msg.includes("limit reached") || msg.includes("not available") || msg.includes("Subscription inactive");
      const content = isPlanLimit
        ? `⚠️ ${msg}`
        : `Error: ${msg}`;
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        timestamp: Date.now(),
      };
      messagesRef.current = [...messagesRef.current, errorMsg];
      setMessages([...messagesRef.current]);
      contentRef.current = "";
      toolCallsRef.current = [];
      setCurrentAssistantContent("");
      setCurrentToolCalls([]);
    },
    onMessage: (msg) => {
      const { event, data } = msg;
      switch (event) {
        case "session": {
          sessionIdRef.current = (data as { sessionId: string }).sessionId;
          break;
        }
        case "token": {
          const text = (data as { text: string }).text;
          contentRef.current += text;
          setCurrentAssistantContent(contentRef.current);
          break;
        }
        case "tool_start":
          toolCallsRef.current = [
            ...toolCallsRef.current,
            { name: (data as ToolCallInfo).name, args: (data as ToolCallInfo).args },
          ];
          setCurrentToolCalls([...toolCallsRef.current]);
          break;
        case "tool_exec_start": {
          const execData = data as { name: string; toolCallId: string };
          let execUpdated = false;
          toolCallsRef.current = toolCallsRef.current.map((tc) => {
            if (!execUpdated && tc.name === execData.name && !tc.result && !tc.executing) {
              execUpdated = true;
              return { ...tc, executing: true };
            }
            return tc;
          });
          setCurrentToolCalls([...toolCallsRef.current]);
          break;
        }
        case "tool_end": {
          const toolData = data as ToolCallInfo;
          let endUpdated = false;
          toolCallsRef.current = toolCallsRef.current.map((tc) => {
            if (!endUpdated && tc.name === toolData.name && !tc.result) {
              endUpdated = true;
              return { ...tc, executing: false, result: toolData.result, isError: toolData.isError };
            }
            return tc;
          });
          setCurrentToolCalls([...toolCallsRef.current]);
          break;
        }
        case "approval_request": {
          const approvalData = data as PendingApproval;
          setPendingApproval({ ...approvalData, timestamp: Date.now() });
          break;
        }
        case "done": {
          const doneData = data as { metrics?: SessionMetrics };

          // Capture metrics
          if (doneData.metrics) {
            setSessionMetrics(doneData.metrics);
            cumulativeRef.current = {
              inputTokens: cumulativeRef.current.inputTokens + doneData.metrics.inputTokens,
              outputTokens: cumulativeRef.current.outputTokens + doneData.metrics.outputTokens,
              estimatedCost: cumulativeRef.current.estimatedCost + doneData.metrics.estimatedCost,
              toolIterations: cumulativeRef.current.toolIterations + doneData.metrics.toolIterations,
              toolCallCount: cumulativeRef.current.toolCallCount + doneData.metrics.toolCallCount,
            };
            setCumulativeMetrics({ ...cumulativeRef.current });
          }

          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: contentRef.current,
            toolCalls: toolCallsRef.current.length > 0 ? [...toolCallsRef.current] : undefined,
            timestamp: Date.now(),
          };
          messagesRef.current = [...messagesRef.current, assistantMsg];
          setMessages([...messagesRef.current]);
          contentRef.current = "";
          toolCallsRef.current = [];
          setCurrentAssistantContent("");
          setCurrentToolCalls([]);
          break;
        }
        case "error": {
          const errMsg = (data as { message: string }).message;
          const errorMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Error: ${errMsg}`,
            timestamp: Date.now(),
          };
          messagesRef.current = [...messagesRef.current, errorMsg];
          setMessages([...messagesRef.current]);
          contentRef.current = "";
          toolCallsRef.current = [];
          setCurrentAssistantContent("");
          setCurrentToolCalls([]);
          break;
        }
      }
    },
  });

  const respondToApproval = useCallback(
    async (decision: "approved" | "denied") => {
      if (!pendingApproval) return;
      try {
        await fetch(`/api/agents/${agentId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolCallId: pendingApproval.toolCallId, decision }),
        });
      } catch {
        // If the POST fails, the gate will timeout and auto-deny
      }
      setPendingApproval(null);
    },
    [agentId, pendingApproval]
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!agentConfig) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      messagesRef.current = [...messagesRef.current, userMessage];
      setMessages([...messagesRef.current]);
      contentRef.current = "";
      toolCallsRef.current = [];
      setCurrentAssistantContent("");
      setCurrentToolCalls([]);
      setSessionMetrics(null);

      start(`/api/agents/${agentId}/chat`, {
        message: content,
        history: messagesRef.current
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(0, -1)
          .map((m) => ({ role: m.role, content: m.content })),
        userId: agentConfig.userId,
        connectedRepos: agentConfig.connectedRepos,
        sessionId: sessionIdRef.current || undefined,
        agentConfig: {
          systemPrompt: agentConfig.systemPrompt,
          modelProvider: agentConfig.modelProvider,
          modelId: agentConfig.modelId,
          skills: agentConfig.skills,
        },
      });
    },
    [agentId, agentConfig, start]
  );

  return {
    messages,
    currentAssistantContent,
    currentToolCalls,
    pendingApproval,
    respondToApproval,
    isStreaming,
    sendMessage,
    stop,
    sessionMetrics,
    cumulativeMetrics,
    sessionId: sessionIdRef.current,
  };
}
