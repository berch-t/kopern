"use client";

import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { onAuthChanged } from "@/lib/firebase/auth";
import { useTheme } from "@/providers/ThemeProvider";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  ArrowRight,
  Bot,
  Shield,
  Cable,
  ClipboardCheck,
  LayoutDashboard,
  Lightbulb,
  Moon,
  Sun,
  DollarSign as DollarSignIcon,
  GitBranch,
  Plug,
  Workflow,
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const t = useDictionary();

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold">Kopern</span>
        </div>
        <div className="flex items-center gap-3">
          <LocalizedLink href="/examples">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Lightbulb className="h-4 w-4" />
              {t.nav.examples}
            </Button>
          </LocalizedLink>
          <LocalizedLink href="/pricing">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <DollarSignIcon className="h-4 w-4" />
              {t.nav.pricing}
            </Button>
          </LocalizedLink>
          <LocaleSwitcher />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <>
              <LocalizedLink href="/dashboard">
                <Button variant="outline" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  {t.landing.ctaDashboard}
                </Button>
              </LocalizedLink>
              {user.photoURL ? (
                <LocalizedLink href="/dashboard">
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Profile"}
                    className="h-9 w-9 rounded-full border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                    referrerPolicy="no-referrer"
                  />
                </LocalizedLink>
              ) : (
                <LocalizedLink href="/dashboard">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                </LocalizedLink>
              )}
            </>
          ) : (
            <LocalizedLink href="/login">
              <Button variant="outline">{t.common.signIn}</Button>
            </LocalizedLink>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center pt-24 pb-16"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary mb-8">
            <FlaskConical className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            {t.landing.title}
            <br />
            <span className="text-primary">{t.landing.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {t.landing.subtitle}
          </p>
          <div className="mt-10 flex gap-4">
            <LocalizedLink href={user ? "/dashboard" : "/login"}>
              <Button size="lg" className="gap-2">
                {user ? t.landing.ctaDashboard : t.landing.cta} <ArrowRight className="h-4 w-4" />
              </Button>
            </LocalizedLink>
            <LocalizedLink href="/examples">
              <Button size="lg" variant="outline" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                {t.landing.examples}
              </Button>
            </LocalizedLink>
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pb-24"
        >
          {[
            {
              icon: Bot,
              title: t.landing.features.agentBuilder.title,
              description: t.landing.features.agentBuilder.description,
            },
            {
              icon: ClipboardCheck,
              title: t.landing.features.grading.title,
              description: t.landing.features.grading.description,
            },
            {
              icon: Cable,
              title: t.landing.features.api.title,
              description: t.landing.features.api.description,
            },
            {
              icon: Shield,
              title: t.landing.features.security.title,
              description: t.landing.features.security.description,
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border bg-card p-6 space-y-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </motion.section>

        {/* Integrations */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="pb-24"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t.integrations.title}{" "}
              <span className="text-primary">{t.integrations.titleAccent}</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              {t.integrations.subtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: GitBranch,
                title: t.integrations.github.title,
                description: t.integrations.github.description,
                accent: "text-emerald-500",
                bg: "bg-emerald-500/10",
              },
              {
                icon: Plug,
                title: t.integrations.mcp.title,
                description: t.integrations.mcp.description,
                accent: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                icon: Workflow,
                title: t.integrations.workflow.title,
                description: t.integrations.workflow.description,
                accent: "text-purple-500",
                bg: "bg-purple-500/10",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border bg-card p-6 space-y-4"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${item.bg}`}>
                  <item.icon className={`h-6 w-6 ${item.accent}`} />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {t.landing.footer}
      </footer>
    </div>
  );
}
