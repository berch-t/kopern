"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type User } from "firebase/auth";
import { onAuthChanged } from "@/lib/firebase/auth";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  ArrowRight,
  Bot,
  Shield,
  Cable,
  ClipboardCheck,
  LayoutDashboard,
  Moon,
  Sun,
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();

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
              <Link href="/dashboard">
                <Button variant="outline" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              {user.photoURL ? (
                <Link href="/dashboard">
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Profile"}
                    className="h-9 w-9 rounded-full border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                    referrerPolicy="no-referrer"
                  />
                </Link>
              ) : (
                <Link href="/dashboard">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                </Link>
              )}
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline">Sign in</Button>
            </Link>
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
            Build, Test & Deploy
            <br />
            <span className="text-primary">AI Agents</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Create custom business AI agents, validate them through deterministic
            grading pipelines, and expose them as API endpoints — all from one platform.
          </p>
          <div className="mt-10 flex gap-4">
            <Link href={user ? "/dashboard" : "/login"}>
              <Button size="lg" className="gap-2">
                {user ? "Go to Dashboard" : "Get Started"} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
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
              title: "Agent Builder",
              description:
                "Configure agents with system prompts, skills, tools and extensions. Multi-model support.",
            },
            {
              icon: ClipboardCheck,
              title: "Deterministic Grading",
              description:
                "6 criterion types: output match, schema validation, tool usage, safety check, LLM judge and more.",
            },
            {
              icon: Cable,
              title: "API Endpoints",
              description:
                "Expose agents as JSON-RPC endpoints with API key auth, rate limiting and usage tracking.",
            },
            {
              icon: Shield,
              title: "Secure by Design",
              description:
                "Owner-only Firestore rules, hashed API keys, server-side key management, sandboxed execution.",
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
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Kopern — AI Agent Builder & Grader
      </footer>
    </div>
  );
}
