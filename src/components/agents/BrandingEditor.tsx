"use client";

import { useState } from "react";
import { useDictionary } from "@/providers/LocaleProvider";
import type { AgentBranding } from "@/lib/firebase/firestore";
import { ICON_OPTIONS, ICON_CATEGORIES, getIconComponent } from "@/lib/agent-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Palette } from "lucide-react";

interface BrandingEditorProps {
  branding: AgentBranding | null;
  onChange: (branding: AgentBranding | null) => void;
}

const categories = Object.keys(ICON_CATEGORIES);

export function BrandingEditor({ branding, onChange }: BrandingEditorProps) {
  const t = useDictionary();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const current: AgentBranding = branding ?? {
    themeColor: "#6366f1",
    accentColor: "#f59e0b",
    icon: "Bot",
  };

  function handleUpdate(partial: Partial<AgentBranding>) {
    onChange({ ...current, ...partial });
  }

  const SelectedIcon = getIconComponent(current.icon);

  const filteredIcons = activeCategory
    ? ICON_OPTIONS.filter((o) => o.category === activeCategory)
    : ICON_OPTIONS;

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
        <div className="space-y-3">
          <Label>{t.agentBranding.icon}</Label>

          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                activeCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {ICON_CATEGORIES[cat]}
              </button>
            ))}
          </div>

          {/* Icon grid */}
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto rounded-md border border-input p-2">
            {filteredIcons.map(({ name, Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => handleUpdate({ icon: name })}
                className={`flex h-9 w-full items-center justify-center rounded-md border transition-colors ${
                  current.icon === name
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title={name}
              >
                <Icon className="h-4 w-4" />
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
