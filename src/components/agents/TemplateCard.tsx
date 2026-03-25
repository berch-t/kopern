"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { staggerItem } from "@/components/motion/StaggerChildren";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VerticalTemplate } from "@/data/vertical-templates";

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  widget: "Widget",
  slack: "Slack",
  telegram: "Telegram",
};

interface TemplateCardProps {
  template: VerticalTemplate;
  locale: string;
  onSelect: () => void;
}

export function TemplateCard({ template, locale, onSelect }: TemplateCardProps) {
  const isFr = locale === "fr";
  const title = isFr ? template.titleFr : template.title;
  const vertical = isFr ? template.verticalFr : template.vertical;
  const tagline = isFr ? template.taglineFr : template.tagline;
  const persona = isFr ? template.targetPersonaFr : template.targetPersona;

  return (
    <motion.div variants={staggerItem}>
      <Card
        className="group cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-md h-full"
        onClick={onSelect}
      >
        <CardContent className="p-5 flex flex-col h-full">
          {/* Header: icon + vertical badge */}
          <div className="flex items-start justify-between mb-3">
            <div className={cn("rounded-lg p-2.5", `bg-${template.color}-500/10`)}>
              <template.icon className={cn("h-6 w-6", `text-${template.color}-500`)} />
            </div>
            <Badge variant="outline" className="text-xs">
              {vertical}
            </Badge>
          </div>

          {/* Title + tagline */}
          <h3 className="font-semibold text-base mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4 flex-1">{tagline}</p>

          {/* Footer: channel + tools count + arrow */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {channelLabels[template.suggestedChannel] ?? template.suggestedChannel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {template.tools.length} tools
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
