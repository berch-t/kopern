"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { staggerItem } from "@/components/motion/StaggerChildren";
import { StaggerChildren } from "@/components/motion/StaggerChildren";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDictionary } from "@/providers/LocaleProvider";
import { type AgentTeamMember, type AgentDoc } from "@/lib/firebase/firestore";
import { GripVertical, X, Bot } from "lucide-react";

interface TeamMemberListProps {
  members: AgentTeamMember[];
  agents: (AgentDoc & { id: string })[];
  onUpdate: (members: AgentTeamMember[]) => void;
  readonly?: boolean;
}

export function TeamMemberList({ members, agents, onUpdate, readonly }: TeamMemberListProps) {
  const t = useDictionary();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function getAgentName(agentId: string) {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name ?? agentId;
  }

  function handleRoleChange(index: number, role: string) {
    const updated = members.map((m, i) => (i === index ? { ...m, role } : m));
    onUpdate(updated);
  }

  function handleRemove(index: number) {
    const updated = members
      .filter((_, i) => i !== index)
      .map((m, i) => ({ ...m, order: i }));
    onUpdate(updated);
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return;

    const updated = [...members];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, removed);
    const reordered = updated.map((m, i) => ({ ...m, order: i }));
    onUpdate(reordered);
    setDragIndex(targetIndex);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <Bot className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t.teams.noMembers}</p>
      </div>
    );
  }

  return (
    <StaggerChildren className="space-y-2">
      {members.map((member, index) => (
        <motion.div
          key={`${member.agentId}-${index}`}
          variants={staggerItem}
          draggable={!readonly}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
            dragIndex === index ? "border-primary bg-primary/5" : "bg-card"
          }`}
        >
          {!readonly && (
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{getAgentName(member.agentId)}</p>
            {readonly ? (
              <Badge variant="outline" className="text-xs">
                {member.role || "—"}
              </Badge>
            ) : (
              <Input
                value={member.role}
                onChange={(e) => handleRoleChange(index, e.target.value)}
                placeholder={t.teams.rolePlaceholder}
                className="h-7 text-xs"
              />
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            #{member.order + 1}
          </Badge>
          {!readonly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleRemove(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </motion.div>
      ))}
    </StaggerChildren>
  );
}
