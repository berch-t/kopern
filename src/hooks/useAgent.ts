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
  result?: string;
  isError?: boolean;
}

export interface AgentPlaygroundConfig {
  systemPrompt: string;
  modelProvider: string;
  modelId: string;
  skills?: { name: string; content: string }[];
}

export function useAgent(agentId: string, agentConfig: AgentPlaygroundConfig | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAssistantContent, setCurrentAssistantContent] = useState("");
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCallInfo[]>([]);

  // Use refs to avoid stale closure in onMessage callbacks
  const contentRef = useRef("");
  const toolCallsRef = useRef<ToolCallInfo[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);

  const { isStreaming, start, stop } = useSSE({
    onMessage: (msg) => {
      const { event, data } = msg;
      switch (event) {
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
        case "tool_end": {
          const toolData = data as ToolCallInfo;
          toolCallsRef.current = toolCallsRef.current.map((tc) =>
            tc.name === toolData.name && !tc.result
              ? { ...tc, result: toolData.result, isError: toolData.isError }
              : tc
          );
          setCurrentToolCalls([...toolCallsRef.current]);
          break;
        }
        case "done": {
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
          // Show error as assistant message
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

      start(`/api/agents/${agentId}/chat`, {
        message: content,
        history: messagesRef.current
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(0, -1) // exclude current user message, it's sent separately
          .map((m) => ({ role: m.role, content: m.content })),
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
    isStreaming,
    sendMessage,
    stop,
  };
}
