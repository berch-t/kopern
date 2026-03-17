"use client";

import { LocalizedLink } from "@/components/LocalizedLink";
import { motion } from "framer-motion";
import { ArrowRight, Clock, DollarSign, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UseCase } from "@/data/use-cases";

interface UseCaseCardProps {
  useCase: UseCase;
  index: number;
}

export function UseCaseCard({ useCase, index }: UseCaseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <LocalizedLink href={`/examples/${useCase.slug}`}>
        <div className="group relative flex h-full flex-col rounded-xl border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <useCase.icon className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs">
              {useCase.domain}
            </Badge>
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
            {useCase.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {useCase.tagline}
          </p>

          {/* Metrics */}
          <div className="mt-auto space-y-2 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span>{useCase.timeSaved}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>{useCase.costReduction}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span>{useCase.riskMitigation}</span>
            </div>
          </div>

          {/* Hover arrow */}
          <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
        </div>
      </LocalizedLink>
    </motion.div>
  );
}
