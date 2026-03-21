"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const localeNames: Record<string, string> = {
  en: "English",
  fr: "Fran\u00e7ais",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    // Replace current locale segment in the path
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const newPath = segments.join("/");
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.push(newPath);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:!bg-transparent dark:hover:!bg-transparent border border-transparent hover:border-primary/50">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(localeNames).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => switchLocale(code)}
            className={locale === code ? "bg-accent" : ""}
          >
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
