"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BUILTIN_TOOLS } from "@/lib/pi-mono/tool-builder";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface BuiltinToolSelectorProps {
  selected: string[];
  onChange: (tools: string[]) => void;
}

export function BuiltinToolSelector({ selected, onChange }: BuiltinToolSelectorProps) {
  function toggle(toolId: string) {
    if (selected.includes(toolId)) {
      onChange(selected.filter((t) => t !== toolId));
    } else {
      onChange([...selected, toolId]);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Built-in Tools</Label>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {BUILTIN_TOOLS.map((tool) => {
          const isSelected = selected.includes(tool.id);
          return (
            <Card
              key={tool.id}
              className={cn(
                "cursor-pointer transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              )}
              onClick={() => toggle(tool.id)}
            >
              <CardContent className="flex items-center gap-2 p-3">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
