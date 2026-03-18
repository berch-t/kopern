"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BUILTIN_TOOLS } from "@/lib/pi-mono/tool-builder";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);

interface BuiltinToolSelectorProps {
  selected: string[];
  onChange: (tools: string[]) => void;
}

export function BuiltinToolSelector({ selected, onChange }: BuiltinToolSelectorProps) {
  const { user } = useAuth();
  const isAdmin = user ? ADMIN_UIDS.includes(user.uid) : false;

  function toggle(toolId: string) {
    if (selected.includes(toolId)) {
      onChange(selected.filter((t) => t !== toolId));
    } else {
      onChange([...selected, toolId]);
    }
  }

  const visibleTools = BUILTIN_TOOLS.filter(
    (tool) => !("adminOnly" in tool && tool.adminOnly) || isAdmin
  );

  return (
    <div className="space-y-2">
      <Label>Built-in Tools</Label>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {visibleTools.map((tool) => {
          const isSelected = selected.includes(tool.id);
          const isAdminTool = "adminOnly" in tool && tool.adminOnly;
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
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{tool.name}</p>
                    {isAdminTool && <Badge variant="outline" className="text-[10px] px-1 py-0">Admin</Badge>}
                  </div>
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
