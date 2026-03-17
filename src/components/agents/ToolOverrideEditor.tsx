"use client";

import { useDictionary } from "@/providers/LocaleProvider";
import type { ToolOverrideConfig } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, Plus, Trash2, Power, PowerOff } from "lucide-react";

interface ToolOverrideEditorProps {
  overrides: ToolOverrideConfig[];
  onChange: (overrides: ToolOverrideConfig[]) => void;
}

const TOOL_NAMES = ["read", "write", "edit", "bash"] as const;

export function ToolOverrideEditor({
  overrides,
  onChange,
}: ToolOverrideEditorProps) {
  const t = useDictionary();

  function handleAdd() {
    const usedTools = new Set(overrides.map((o) => o.toolName));
    const available = TOOL_NAMES.find((name) => !usedTools.has(name));
    onChange([
      ...overrides,
      {
        toolName: available ?? "read",
        wrapperCode: "",
        enabled: true,
      },
    ]);
  }

  function handleUpdate(index: number, partial: Partial<ToolOverrideConfig>) {
    const updated = overrides.map((item, i) =>
      i === index ? { ...item, ...partial } : item
    );
    onChange(updated);
  }

  function handleRemove(index: number) {
    onChange(overrides.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">
                {t.toolOverrides.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t.toolOverrides.description}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={overrides.length >= TOOL_NAMES.length}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t.toolOverrides.addOverride}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {overrides.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Wrench className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {t.toolOverrides.noOverrides}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.toolOverrides.noOverridesDesc}
            </p>
          </div>
        )}

        {overrides.map((override, index) => (
          <div key={index}>
            {index > 0 && <Separator className="mb-4" />}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-40">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {t.toolOverrides.toolName}
                    </Label>
                    <Select
                      value={override.toolName}
                      onValueChange={(value) =>
                        handleUpdate(index, { toolName: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOOL_NAMES.map((name) => (
                          <SelectItem
                            key={name}
                            value={name}
                            disabled={
                              overrides.some(
                                (o, i) => o.toolName === name && i !== index
                              )
                            }
                          >
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-5">
                  <Button
                    variant={override.enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      handleUpdate(index, { enabled: !override.enabled })
                    }
                  >
                    {override.enabled ? (
                      <Power className="h-3 w-3" />
                    ) : (
                      <PowerOff className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t.toolOverrides.wrapperCode}
                </Label>
                <Textarea
                  value={override.wrapperCode}
                  onChange={(e) =>
                    handleUpdate(index, { wrapperCode: e.target.value })
                  }
                  placeholder={`// Wrap the ${override.toolName} tool\nasync function wrapper(args, originalTool) {\n  // Pre-processing\n  const result = await originalTool(args);\n  // Post-processing\n  return result;\n}`}
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
