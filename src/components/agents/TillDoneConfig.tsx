"use client";

import { useDictionary } from "@/providers/LocaleProvider";
import type { TillDoneConfig } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ListChecks, Power, PowerOff } from "lucide-react";

interface TillDoneConfigProps {
  config: TillDoneConfig | null;
  onChange: (config: TillDoneConfig | null) => void;
}

export function TillDoneConfig({ config, onChange }: TillDoneConfigProps) {
  const t = useDictionary();
  const enabled = config !== null;

  function handleToggle() {
    if (enabled) {
      onChange(null);
    } else {
      onChange({
        enabled: true,
        requireTaskListBeforeExecution: true,
        autoPromptOnIncomplete: true,
        confirmBeforeClear: true,
      });
    }
  }

  function handleUpdate(partial: Partial<TillDoneConfig>) {
    if (!config) return;
    onChange({ ...config, ...partial });
  }

  const toggleItems = config
    ? [
        {
          label: t.tillDone.requireTaskList,
          value: config.requireTaskListBeforeExecution,
          key: "requireTaskListBeforeExecution" as const,
        },
        {
          label: t.tillDone.autoPrompt,
          value: config.autoPromptOnIncomplete,
          key: "autoPromptOnIncomplete" as const,
        },
        {
          label: t.tillDone.confirmClear,
          value: config.confirmBeforeClear,
          key: "confirmBeforeClear" as const,
        },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{t.tillDone.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t.tillDone.description}
              </p>
            </div>
          </div>
          <Button
            variant={enabled ? "default" : "outline"}
            size="sm"
            onClick={handleToggle}
          >
            {enabled ? (
              <>
                <Power className="mr-1 h-3 w-3" />
                {t.tillDone.enabled}
              </>
            ) : (
              <>
                <PowerOff className="mr-1 h-3 w-3" />
                {t.tillDone.enabled}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {enabled && config && (
        <CardContent className="space-y-3">
          <Separator />

          {toggleItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-1"
            >
              <Label className="cursor-pointer">{item.label}</Label>
              <Button
                variant={item.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleUpdate({ [item.key]: !item.value })}
              >
                {item.value ? "On" : "Off"}
              </Button>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
