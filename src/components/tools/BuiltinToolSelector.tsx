"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BUILTIN_TOOLS } from "@/lib/pi-mono/tool-builder";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import {
  Check,
  Brain,
  Mail,
  CalendarDays,
  Globe,
  Terminal,
  ImagePlus,
  Share2,
  SendHorizonal,
  BarChart3,
} from "lucide-react";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

function DatagouvIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="2" y="4" width="6" height="16" rx="1" fill="#002395" />
      <rect x="9" y="4" width="6" height="16" rx="1" fill="#FFFFFF" stroke="#e5e7eb" strokeWidth="0.5" />
      <rect x="16" y="4" width="6" height="16" rx="1" fill="#ED2939" />
    </svg>
  );
}

function LegifranceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2L3 7v2h18V7L12 2zm0 2.236L17.764 7H6.236L12 4.236zM5 11v8h2v-8H5zm4 0v8h2v-8H9zm4 0v8h2v-8h-2zm4 0v8h2v-8h-2zM3 21v2h18v-2H3z" />
    </svg>
  );
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github_write: <GitHubIcon className="h-4 w-4" />,
  slack_read: <SlackIcon className="h-4 w-4" />,
  datagouv: <DatagouvIcon className="h-4 w-4" />,
  piste: <LegifranceIcon className="h-4 w-4" />,
  bug_management: <Image src="/logo_small.png" alt="Kopern" width={16} height={16} className="h-4 w-4 object-contain" />,
  memory: <Brain className="h-4 w-4" />,
  service_email: <Mail className="h-4 w-4" />,
  service_calendar: <CalendarDays className="h-4 w-4" />,
  web_fetch: <Globe className="h-4 w-4" />,
  code_interpreter: <Terminal className="h-4 w-4" />,
  image_generation: <ImagePlus className="h-4 w-4" />,
  service_social_media: <Share2 className="h-4 w-4" />,
  campaign_email: <SendHorizonal className="h-4 w-4" />,
  campaign_tracker: <BarChart3 className="h-4 w-4" />,
};

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);

interface BuiltinToolSelectorProps {
  selected: string[];
  onChange: (tools: string[]) => void;
}

export function BuiltinToolSelector({ selected, onChange }: BuiltinToolSelectorProps) {
  const { user } = useAuth();
  const t = useDictionary();
  const isAdmin = user ? ADMIN_UIDS.includes(user.uid) : false;
  const descriptions = (t.agents?.form?.builtinToolDescriptions ?? {}) as Record<string, string>;

  function toggle(toolId: string) {
    if (selected.includes(toolId)) {
      onChange(selected.filter((t) => t !== toolId));
    } else {
      onChange([...selected, toolId]);
    }
  }

  const allVisible = BUILTIN_TOOLS.filter(
    (tool) => !("adminOnly" in tool && tool.adminOnly) || isAdmin
  );
  const adminTools = allVisible.filter((tool) => "adminOnly" in tool && tool.adminOnly);
  const userTools = allVisible.filter((tool) => !("adminOnly" in tool && tool.adminOnly));

  return (
    <div className="space-y-2">
      <Label>Built-in Tools</Label>
      <div className="flex flex-col gap-1.5">
        {/* Admin tools — visible only to admins, displayed first */}
        {isAdmin && adminTools.length > 0 && (
          <>
            {adminTools.map((tool) => (
              <ToolRow
                key={tool.id}
                tool={tool}
                isSelected={selected.includes(tool.id)}
                isAdminTool
                description={descriptions[tool.id] || tool.description}
                onToggle={() => toggle(tool.id)}
              />
            ))}
            <Separator className="my-1.5" />
          </>
        )}

        {/* User tools */}
        {userTools.map((tool) => (
          <ToolRow
            key={tool.id}
            tool={tool}
            isSelected={selected.includes(tool.id)}
            isAdminTool={false}
            description={descriptions[tool.id] || tool.description}
            onToggle={() => toggle(tool.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ToolRow({
  tool,
  isSelected,
  isAdminTool,
  description,
  onToggle,
}: {
  tool: (typeof BUILTIN_TOOLS)[number];
  isSelected: boolean;
  isAdminTool: boolean;
  description: string;
  onToggle: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all",
        isSelected
          ? "border-primary bg-primary/5"
          : "hover:border-primary/50"
      )}
      onClick={onToggle}
    >
      <CardContent className="flex items-center gap-3 px-3 py-2">
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30"
          )}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50">
          {TOOL_ICONS[tool.id] ?? <Terminal className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">{tool.name}</p>
            {isAdminTool && <Badge variant="outline" className="text-[10px] px-1 py-0">Admin</Badge>}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
