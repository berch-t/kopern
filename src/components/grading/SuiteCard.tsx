"use client";

import { LocalizedLink } from "@/components/LocalizedLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Play, History } from "lucide-react";
import { type GradingSuiteDoc } from "@/lib/firebase/firestore";

interface SuiteCardProps {
  agentId: string;
  suite: GradingSuiteDoc & { id: string };
  onDelete: (suiteId: string) => void;
}

export function SuiteCard({ agentId, suite, onDelete }: SuiteCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <LocalizedLink href={`/agents/${agentId}/grading/${suite.id}`}>
          <CardTitle className="text-base hover:underline">{suite.name}</CardTitle>
        </LocalizedLink>
        <div className="flex gap-1">
          <LocalizedLink href={`/agents/${agentId}/grading/${suite.id}/runs`}>
            <Button variant="ghost" size="sm">
              <History className="mr-1 h-4 w-4" />
              Runs
            </Button>
          </LocalizedLink>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(suite.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      {suite.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{suite.description}</p>
        </CardContent>
      )}
    </Card>
  );
}
