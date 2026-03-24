"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConsent } from "@/hooks/useConsent";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";
import { LocalizedLink } from "@/components/LocalizedLink";
import { toast } from "sonner";

export function CookieConsent() {
  const t = useDictionary();
  const locale = useLocale();
  const { showBanner, acceptAll, rejectNonEssential, updateConsent } = useConsent();
  const [expanded, setExpanded] = useState(false);
  const [functional, setFunctional] = useState(false);

  if (!showBanner) return null;

  async function handleAcceptAll() {
    await acceptAll();
    toast.success(t.consent.updatedToast);
  }

  async function handleRejectNonEssential() {
    await rejectNonEssential();
    toast.success(t.consent.updatedToast);
  }

  async function handleSavePreferences() {
    await updateConsent({ essential: true, functional });
    toast.success(t.consent.updatedToast);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
      >
        <div className="mx-auto max-w-2xl rounded-xl border bg-background/95 backdrop-blur-md shadow-2xl">
          <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{t.consent.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t.consent.description}
                </p>
              </div>
            </div>

            {/* Expandable details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 py-3 border-t border-b mb-3">
                    {/* Essential — always on */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{t.consent.essential}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {t.consent.alwaysActive}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.consent.essentialDesc}
                        </p>
                      </div>
                      <Switch checked disabled className="opacity-50" />
                    </div>

                    {/* Functional — toggleable */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{t.consent.functional}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.consent.functionalDesc}
                        </p>
                      </div>
                      <Switch
                        checked={functional}
                        onCheckedChange={setFunctional}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-muted-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <><ChevronUp className="h-3 w-3" /> {t.consent.customize}</>
                ) : (
                  <><ChevronDown className="h-3 w-3" /> {t.consent.customize}</>
                )}
              </Button>

              <div className="flex-1" />

              <LocalizedLink href="/privacy" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 hidden sm:block">
                {t.consent.privacyLink}
              </LocalizedLink>

              {expanded ? (
                <Button size="sm" onClick={handleSavePreferences}>
                  {t.consent.savePreferences}
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleRejectNonEssential}>
                    {t.consent.rejectNonEssential}
                  </Button>
                  <Button size="sm" onClick={handleAcceptAll}>
                    {t.consent.acceptAll}
                  </Button>
                </>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground mt-2 text-center sm:hidden">
              <LocalizedLink href="/privacy" className="underline underline-offset-2">
                {t.consent.privacyLink}
              </LocalizedLink>
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
