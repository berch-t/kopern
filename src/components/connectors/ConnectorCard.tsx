"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ConnectorCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  enabled?: boolean;
  statusLabel?: string;
  accent: string;
  bg: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  tutorialLabel?: string;
  tutorialActive?: boolean;
  onTutorial?: () => void;
}

export function ConnectorCard({
  icon: Icon,
  title,
  description,
  enabled,
  statusLabel,
  accent,
  bg,
  actionLabel,
  onAction,
  disabled,
  tutorialLabel,
  tutorialActive,
  onTutorial,
}: ConnectorCardProps) {
  return (
    <Card className={tutorialActive ? "ring-2 ring-primary/50" : undefined}>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-5 w-5 ${accent}`} />
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              {statusLabel !== undefined && (
                <Badge variant={enabled ? "default" : "secondary"} className="mt-1">
                  {statusLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-2">
          <Button onClick={onAction} disabled={disabled} className="flex-1">
            {actionLabel}
          </Button>
          {onTutorial && tutorialLabel && (
            <Button
              variant={tutorialActive ? "default" : "outline"}
              size="icon"
              onClick={onTutorial}
              title={tutorialLabel}
              className="shrink-0"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
