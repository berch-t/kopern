"use client";

import { motion } from "framer-motion";
import { type ChatMessage } from "@/hooks/useAgent";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { MarkdownContent } from "./MarkdownContent";
import { cn } from "@/lib/utils";
import { Bot, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary } from "@/providers/LocaleProvider";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const t = useDictionary();
  const isPlanLimit = !isUser && message.content.startsWith("⚠️");

  if (isPlanLimit) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
        <div className="max-w-[80%] space-y-2">
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-medium">{t.planLimit.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.planLimit.description}</p>
            <LocalizedLink href="/pricing">
              <Button size="sm" className="mt-2">{t.planLimit.viewPlans}</Button>
            </LocalizedLink>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("max-w-[80%] space-y-2", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-lg px-4 py-2 text-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCallDisplay key={i} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
