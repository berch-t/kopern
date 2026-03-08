"use client";

import { useDictionary } from "@/providers/LocaleProvider";
import type { PurposeGateConfig } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Power, PowerOff, Syringe } from "lucide-react";

interface PurposeGateConfigProps {
  config: PurposeGateConfig | null;
  onChange: (config: PurposeGateConfig | null) => void;
}

export function PurposeGateConfig({ config, onChange }: PurposeGateConfigProps) {
  const t = useDictionary();
  const enabled = config !== null;

  function handleToggle() {
    if (enabled) {
      onChange(null);
    } else {
      onChange({
        enabled: true,
        question: "What is the purpose of this session?",
        injectInSystemPrompt: true,
      });
    }
  }

  function handleUpdate(partial: Partial<PurposeGateConfig>) {
    if (!config) return;
    onChange({ ...config, ...partial });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{t.purposeGate.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t.purposeGate.description}
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
                {t.purposeGate.enabled}
              </>
            ) : (
              <>
                <PowerOff className="mr-1 h-3 w-3" />
                {t.purposeGate.enabled}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {enabled && config && (
        <CardContent className="space-y-4">
          <Separator />

          <div className="space-y-2">
            <Label>{t.purposeGate.question}</Label>
            <Input
              value={config.question}
              onChange={(e) => handleUpdate({ question: e.target.value })}
              placeholder={t.purposeGate.questionPlaceholder}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Syringe className="h-4 w-4 text-muted-foreground" />
              <Label className="cursor-pointer">
                {t.purposeGate.injectInPrompt}
              </Label>
            </div>
            <Button
              variant={config.injectInSystemPrompt ? "default" : "outline"}
              size="sm"
              onClick={() =>
                handleUpdate({
                  injectInSystemPrompt: !config.injectInSystemPrompt,
                })
              }
            >
              {config.injectInSystemPrompt ? "On" : "Off"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
