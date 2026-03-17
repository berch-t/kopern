"use client";

import Link from "next/link";
import { useLocale } from "@/providers/LocaleProvider";
import type { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof Link>;

export function LocalizedLink({ href, ...props }: LinkProps) {
  const locale = useLocale();
  const localizedHref = typeof href === "string" ? `/${locale}${href}` : href;
  return <Link {...props} href={localizedHref} />;
}
