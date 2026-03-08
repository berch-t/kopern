"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/providers/LocaleProvider";
import { useCallback, useMemo } from "react";

export function useLocalizedRouter() {
  const router = useRouter();
  const locale = useLocale();

  const push = useCallback(
    (path: string) => {
      router.push(`/${locale}${path}`);
    },
    [router, locale]
  );

  const replace = useCallback(
    (path: string) => {
      router.replace(`/${locale}${path}`);
    },
    [router, locale]
  );

  const back = useCallback(() => {
    router.back();
  }, [router]);

  return useMemo(() => ({ push, replace, back, locale }), [push, replace, back, locale]);
}
