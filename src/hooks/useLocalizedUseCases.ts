"use client";

import { useMemo } from "react";
import { useLocale } from "@/providers/LocaleProvider";
import { useCases, type UseCase } from "@/data/use-cases";
import { useCasesFr } from "@/data/use-cases-fr";

export function useLocalizedUseCases(): UseCase[] {
  const locale = useLocale();

  return useMemo(() => {
    if (locale === "en") return useCases;

    return useCases.map((uc) => {
      const tr = useCasesFr[uc.slug];
      if (!tr) return uc;
      return {
        ...uc,
        title: tr.title,
        domain: tr.domain,
        tagline: tr.tagline,
        description: tr.description,
        timeSaved: tr.timeSaved,
        costReduction: tr.costReduction,
        riskMitigation: tr.riskMitigation,
      };
    });
  }, [locale]);
}
