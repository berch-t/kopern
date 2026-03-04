"use client";

import { useState, useRef, useEffect } from "react";
import { useAgent, type AgentPlaygroundConfig } from "@/hooks/useAgent";
import { MessageBubble } from "./MessageBubble";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { StreamIndicator } from "./StreamIndicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Bot } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";

interface ChatContainerProps {
  agentId: string;
  agentConfig: AgentPlaygroundConfig | null;
}

export function ChatContainer({ agentId, agentConfig }: ChatContainerProps) {
  const {
    messages,
    currentAssistantContent,
    currentToolCalls,
    isStreaming,
    sendMessage,
    stop,
  } = useAgent(agentId, agentConfig);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, currentAssistantContent]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming || !agentConfig) return;
    sendMessage(input.trim());
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {agentConfig
              ? "Send a message to start chatting with your agent"
              : "Loading agent configuration..."}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming content */}
        {isStreaming && (
          <div className="space-y-2">
            {currentToolCalls.map((tc, i) => (
              <ToolCallDisplay key={i} toolCall={tc} />
            ))}
            {currentAssistantContent ? (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="inline-block max-w-[80%] rounded-lg bg-muted px-4 py-2 text-sm">
                  <MarkdownContent content={currentAssistantContent} />
                  <span className="inline-block h-4 w-1 animate-pulse bg-foreground" />
                </div>
              </div>
            ) : (
              <StreamIndicator />
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            disabled={!agentConfig}
          />
          {isStreaming ? (
            <Button type="button" variant="outline" size="icon" onClick={stop}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim() || !agentConfig}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
