"use client";

import { useDictionary } from "@/providers/LocaleProvider";
import type { AgentBranding } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Palette,
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

interface BrandingEditorProps {
  branding: AgentBranding | null;
  onChange: (branding: AgentBranding | null) => void;
}

const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Bot", Icon: Bot },
  { name: "Brain", Icon: Brain },
  { name: "Code", Icon: Code },
  { name: "Shield", Icon: Shield },
  { name: "Rocket", Icon: Rocket },
  { name: "Zap", Icon: Zap },
  { name: "Target", Icon: Target },
  { name: "Eye", Icon: Eye },
  { name: "Database", Icon: Database },
  { name: "Globe", Icon: Globe },
  { name: "Lock", Icon: Lock },
  { name: "MessageSquare", Icon: MessageSquare },
  { name: "Search", Icon: Search },
  { name: "Terminal", Icon: Terminal },
  { name: "Wand2", Icon: Wand2 },
];

function getIconComponent(name: string): LucideIcon {
  return ICON_OPTIONS.find((o) => o.name === name)?.Icon ?? Bot;
}

export function BrandingEditor({ branding, onChange }: BrandingEditorProps) {
  const t = useDictionary();

  const current: AgentBranding = branding ?? {
    themeColor: "#6366f1",
    accentColor: "#f59e0b",
    icon: "Bot",
  };

  function handleUpdate(partial: Partial<AgentBranding>) {
    onChange({ ...current, ...partial });
  }

  const SelectedIcon = getIconComponent(current.icon);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">{t.agentBranding.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t.agentBranding.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Color pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t.agentBranding.themeColor}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={current.themeColor}
                onChange={(e) => handleUpdate({ themeColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
              />
              <span className="text-sm text-muted-foreground font-mono">
                {current.themeColor}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.agentBranding.accentColor}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={current.accentColor}
                onChange={(e) => handleUpdate({ accentColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
              />
              <span className="text-sm text-muted-foreground font-mono">
                {current.accentColor}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Icon selector */}
        <div className="space-y-2">
          <Label>{t.agentBranding.icon}</Label>
          <div className="grid grid-cols-5 gap-2">
            {ICON_OPTIONS.map(({ name, Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => handleUpdate({ icon: name })}
                className={`flex h-12 w-full items-center justify-center rounded-md border transition-colors ${
                  current.icon === name
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title={name}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Preview
          </Label>
          <div
            className="flex items-center gap-3 rounded-lg border p-4"
            style={{ borderColor: current.themeColor }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: current.themeColor }}
            >
              <SelectedIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div
                className="text-sm font-semibold"
                style={{ color: current.themeColor }}
              >
                Agent Name
              </div>
              <div className="text-xs text-muted-foreground">
                Your custom agent description
              </div>
            </div>
            <div
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: current.accentColor }}
            >
              Active
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
