"use client";

import { useState, useRef, useEffect } from "react";
import { useAgent, type AgentPlaygroundConfig } from "@/hooks/useAgent";
import { useDictionary } from "@/providers/LocaleProvider";
import { MessageBubble } from "./MessageBubble";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { StreamIndicator } from "./StreamIndicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Bot, ArrowDownToLine, ArrowUpFromLine, DollarSign, Wrench, ExternalLink } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import { ApprovalDialog } from "./ApprovalDialog";
import { LocalizedLink } from "@/components/LocalizedLink";

interface ChatContainerProps {
  agentId: string;
  agentConfig: AgentPlaygroundConfig | null;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ChatContainer({ agentId, agentConfig }: ChatContainerProps) {
  const t = useDictionary();
  const {
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
    sessionId,
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

  const hasMetrics = cumulativeMetrics.inputTokens > 0 || cumulativeMetrics.outputTokens > 0;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border">
      {/* Metrics bar */}
      {hasMetrics && (
        <div className="flex items-center gap-4 border-b bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ArrowDownToLine className="h-3 w-3" />
            {formatTokens(cumulativeMetrics.inputTokens)} in
          </span>
          <span className="flex items-center gap-1">
            <ArrowUpFromLine className="h-3 w-3" />
            {formatTokens(cumulativeMetrics.outputTokens)} out
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {cumulativeMetrics.estimatedCost < 0.01
              ? "< $0.01"
              : `$${cumulativeMetrics.estimatedCost.toFixed(4)}`}
          </span>
          {cumulativeMetrics.toolCallCount > 0 && (
            <span className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              {cumulativeMetrics.toolCallCount} {t.playground.toolCalls}
            </span>
          )}
          {sessionId && (
            <LocalizedLink
              href={`/agents/${agentId}/sessions/${sessionId}`}
              className="ml-auto flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {t.playground.viewSession}
            </LocalizedLink>
          )}
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {agentConfig
              ? t.playground.emptyChat
              : t.playground.loadingConfig}
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

      {/* Approval dialog */}
      {pendingApproval && (
        <ApprovalDialog approval={pendingApproval} onRespond={respondToApproval} />
      )}

      {/* Input area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.playground.sendMessage}
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
