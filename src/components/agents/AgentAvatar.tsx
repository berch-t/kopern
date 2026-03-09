"use client";

import type { AgentBranding } from "@/lib/firebase/firestore";
import {
  Bot,
  Brain,
  Code,
  Shield,
  Rocket,
  Zap,
  Target,
  Eye,
  Database,
  Globe,
  Lock,
  MessageSquare,
  Search,
  Terminal,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Bot,
  Brain,
  Code,
  Shield,
  Rocket,
  Zap,
  Target,
  Eye,
  Database,
  Globe,
  Lock,
  MessageSquare,
  Search,
  Terminal,
  Wand2,
};

interface AgentAvatarProps {
  branding: AgentBranding | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: { container: "h-8 w-8 rounded-md", icon: "h-4 w-4" },
  md: { container: "h-10 w-10 rounded-lg", icon: "h-5 w-5" },
  lg: { container: "h-12 w-12 rounded-xl", icon: "h-6 w-6" },
};

export function AgentAvatar({ branding, size = "md", className }: AgentAvatarProps) {
  const { container, icon } = sizeClasses[size];

  if (!branding) {
    return (
      <div className={cn("flex items-center justify-center bg-primary/10", container, className)}>
        <Bot className={cn(icon, "text-primary")} />
      </div>
    );
  }

  const IconComponent = ICON_MAP[branding.icon] ?? Bot;

  return (
    <div
      className={cn("flex items-center justify-center", container, className)}
      style={{ backgroundColor: branding.themeColor + "1a" }}
    >
      <IconComponent className={icon} style={{ color: branding.themeColor }} />
    </div>
  );
}
