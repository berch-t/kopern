"use client";

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { type User } from "firebase/auth";
import { onAuthChanged } from "@/lib/firebase/auth";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { LocalizedLink } from "@/components/LocalizedLink";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createAgent } from "@/actions/agents";
import { createSkill } from "@/actions/skills";
import { createTool } from "@/actions/tools";
import { createGradingSuite } from "@/actions/grading-suites";
import { createGradingCase } from "@/actions/grading-cases";
import { toast } from "sonner";
import {
  ArrowRight,
  Bot,
  Shield,
  Cable,
  ClipboardCheck,
  CreditCard,
  Eye,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Sparkles,
  Users,
  CheckCircle2,
  Save,
  LogIn,
  RotateCcw,
  DollarSign as DollarSignIcon,
  GitBranch,
  Plug,
  Workflow,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PixelBlast = lazy(() => import("@/components/ui/PixelBlast"));

// --- Hero Agent Creator types ---
type HeroStep = "input" | "generating" | "review" | "error";

interface AgentSpec {
  name: string;
  domain: string;
  systemPrompt: string;
  skills: { name: string; content: string }[];
  tools: { name: string; description: string; parametersSchema: string; executeCode: string }[];
  gradingCases: { name: string; input: string; expected: string; criterionType: string }[];
  settings: { model?: string; thinking?: string; purposeGate?: string; tillDone?: string };
  rawSpec: string;
}

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useDictionary();
  const router = useLocalizedRouter();

  // Hero agent creator state
  const [heroStep, setHeroStep] = useState<HeroStep>("input");
  const [heroDescription, setHeroDescription] = useState("");
  const [heroStreamText, setHeroStreamText] = useState("");
  const [heroSpec, setHeroSpec] = useState<AgentSpec | null>(null);
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroPhase, setHeroPhase] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const heroReset = useCallback(() => {
    setHeroStep("input");
    setHeroDescription("");
    setHeroStreamText("");
    setHeroSpec(null);
    setHeroSaving(false);
    setHeroPhase(0);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const handleHeroGenerate = useCallback(async () => {
    if (!heroDescription.trim() || heroDescription.trim().length < 10) return;

    setHeroStep("generating");
    setHeroStreamText("");
    setHeroSpec(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agents/meta-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: heroDescription.trim(),
          modelProvider: "anthropic",
          modelId: "claude-sonnet-4-6",
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const evt = currentEvent;
              currentEvent = "";

              if (evt === "token") {
                accumulated += data.text;
                setHeroStreamText(accumulated);
                // Detect phase from section headings in the stream
                const lower = accumulated.toLowerCase();
                if (lower.includes("### recommended") || lower.includes("### settings") || lower.includes("### config")) {
                  setHeroPhase(5);
                } else if (lower.includes("### grading") || lower.includes("### test") || lower.includes("### evaluation")) {
                  setHeroPhase(4);
                } else if (lower.includes("### tool")) {
                  setHeroPhase(3);
                } else if (lower.includes("### skill")) {
                  setHeroPhase(2);
                } else if (lower.includes("### system prompt") || lower.includes("### prompt")) {
                  setHeroPhase(1);
                }
              } else if (evt === "spec") {
                setHeroSpec(data as AgentSpec);
              } else if (evt === "done") {
                setHeroStep("review");
              } else if (evt === "error") {
                throw new Error(data.message);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      if (accumulated && !abortRef.current?.signal.aborted) {
        setHeroStep("review");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setHeroStep("error");
      toast.error((err as Error).message || "Generation failed");
    }
  }, [heroDescription]);

  const handleHeroSave = useCallback(async () => {
    if (!user) {
      // Store spec in sessionStorage so we can restore after login
      sessionStorage.setItem(
        "kopern_pending_agent",
        JSON.stringify({
          description: heroDescription,
          spec: heroSpec,
          rawSpec: heroStreamText,
        })
      );
      router.push("/login");
      return;
    }

    setHeroSaving(true);
    try {
      const agentName = heroSpec?.name || extractName(heroDescription);
      const agentDomain = heroSpec?.domain || "other";
      const agentPrompt = heroSpec?.systemPrompt || heroStreamText;

      const agentId = await createAgent(user.uid, {
        name: agentName,
        description: heroDescription.trim(),
        domain: agentDomain,
        systemPrompt: agentPrompt,
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-6",
        thinkingLevel: "off",
        builtinTools: ["read", "bash"],
      });

      // Create skills in sub-collection
      if (heroSpec?.skills?.length) {
        await Promise.all(
          heroSpec.skills.map((s) =>
            createSkill(user.uid, agentId, { name: s.name, description: s.name, content: s.content })
          )
        );
      }

      // Create tools in sub-collection
      if (heroSpec?.tools?.length) {
        await Promise.all(
          heroSpec.tools.map((t) =>
            createTool(user.uid, agentId, {
              name: t.name,
              label: t.name,
              description: t.description,
              parametersSchema: t.parametersSchema,
              executeCode: t.executeCode,
            })
          )
        );
      }

      // Create grading suite + cases
      if (heroSpec?.gradingCases?.length) {
        const suiteId = await createGradingSuite(user.uid, agentId, {
          name: "Auto-generated Suite",
          description: `Generated from meta-agent for: ${agentName}`,
        });
        await Promise.all(
          heroSpec.gradingCases.map((c, i) =>
            createGradingCase(user.uid, agentId, suiteId, {
              name: c.name,
              inputPrompt: c.input,
              expectedBehavior: c.expected,
              orderIndex: i,
              criteria: [
                {
                  id: crypto.randomUUID(),
                  type: c.criterionType as "output_match" | "schema_validation" | "tool_usage" | "safety_check" | "custom_script" | "llm_judge",
                  name: c.name,
                  config: {},
                  weight: 1,
                },
              ],
            })
          )
        );
      }

      toast.success(t.metaAgent.generated);
      router.push(`/agents/${agentId}`);
    } catch {
      toast.error("Failed to create agent");
    } finally {
      setHeroSaving(false);
    }
  }, [user, heroSpec, heroStreamText, heroDescription, router, t]);

  const canGenerate =
    heroDescription.trim().length >= 10 && heroStep === "input";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="w-7" />
        {/* Logo hidden — already in hero */}
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
      <div className="relative overflow-hidden" style={{ background: "var(--landing-section-hero)" }}>
        {/* PixelBlast background */}
        <Suspense fallback={null}>
          <PixelBlast
            variant="diamond"
            pixelSize={9}
            color="#37005e"
            patternScale={2.25}
            patternDensity={0.55}
            pixelSizeJitter={1.25}
            enableRipples
            rippleSpeed={0.05}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid={false}
            speed={1.2}
            edgeFade={0.15}
            transparent
            style={{ zIndex: 0, pointerEvents: "none" }}
          />
        </Suspense>

      <main className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center pt-20 pb-16"
        >
          {/* Logo + Beta badge */}
          <div className="relative mb-4">
            <img src="/logo_small.png" alt="Kopern" className="h-16" />
            <span className="absolute -top-1 -right-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              beta
            </span>
          </div>

          {/* Tagline */}
          <p className="text-xl font-bold text-muted-foreground mb-10">
            {t.landing.hero.tagline}
          </p>

          {/* Agent Creator — central component */}
          <motion.div
            layout
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full max-w-2xl"
          >
            {/* Input step */}
            <AnimatePresence mode="wait">
              {heroStep === "input" && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <Textarea
                      value={heroDescription}
                      onChange={(e) => setHeroDescription(e.target.value)}
                      placeholder={t.landing.hero.placeholder}
                      className="min-h-[120px] resize-none text-base pr-4 rounded-xl border-2 border-muted focus:border-primary transition-colors"
                    />
                  </div>
                  <Button
                    size="lg"
                    onClick={handleHeroGenerate}
                    disabled={!canGenerate}
                    className="w-full gap-2 rounded-xl h-12 text-base"
                  >
                    <Sparkles className="h-5 w-5" />
                    {t.landing.hero.generate}
                  </Button>
                </motion.div>
              )}

              {/* Generating step — animated status phases */}
              {heroStep === "generating" && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="flex flex-col items-center gap-4">
                    {/* Animated thinking phases */}
                    <div className="flex flex-col items-center gap-2 min-h-[80px] justify-center">
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={heroPhase}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.4 }}
                          className="text-sm font-medium text-transparent bg-clip-text animate-shimmer"
                          style={{
                            backgroundImage: "linear-gradient(90deg, hsl(var(--primary)), hsl(280 80% 70%), hsl(var(--primary)))",
                            backgroundSize: "200% 100%",
                          }}
                        >
                          {[
                            "Analyzing your requirements...",
                            "Crafting the system prompt...",
                            "Designing skills & knowledge...",
                            "Building custom tools...",
                            "Creating test suite...",
                            "Finalizing configuration...",
                          ][heroPhase]}
                        </motion.p>
                      </AnimatePresence>

                      {/* Phase progress dots */}
                      <div className="flex gap-1.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <motion.div
                            key={i}
                            className="h-1.5 rounded-full"
                            initial={{ width: 6, backgroundColor: "hsl(var(--muted))" }}
                            animate={{
                              width: i === heroPhase ? 20 : 6,
                              backgroundColor: i <= heroPhase ? "hsl(var(--primary))" : "hsl(var(--muted))",
                            }}
                            transition={{ duration: 0.3 }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Subtle pulsing indicator */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{Math.min(heroStreamText.length, 9999).toLocaleString()} characters generated</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      abortRef.current?.abort();
                      heroReset();
                    }}
                    className="w-full rounded-xl"
                  >
                    {t.common.cancel}
                  </Button>
                </motion.div>
              )}

              {/* Review step — spec summary + preview + deploy */}
              {heroStep === "review" && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-4"
                >
                  {/* Success banner */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-center gap-2 text-sm text-emerald-400"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t.landing.hero.specReady}
                  </motion.div>

                  {/* Spec summary card */}
                  {heroSpec && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 text-left space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg font-semibold">{heroSpec.name}</p>
                          <p className="text-sm text-muted-foreground">{heroSpec.domain}</p>
                        </div>
                        <Bot className="h-8 w-8 text-primary/40" />
                      </div>

                      {/* Capability badges */}
                      <div className="flex gap-2 flex-wrap">
                        {heroSpec.skills.length > 0 && (
                          <span className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-0.5 font-medium">
                            {heroSpec.skills.length} skill{heroSpec.skills.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {heroSpec.tools?.length > 0 && (
                          <span className="text-xs bg-blue-500/10 text-blue-400 rounded-full px-2.5 py-0.5 font-medium">
                            {heroSpec.tools.length} tool{heroSpec.tools.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {heroSpec.gradingCases?.length > 0 && (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 rounded-full px-2.5 py-0.5 font-medium">
                            {heroSpec.gradingCases.length} test{heroSpec.gradingCases.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Skill & tool names */}
                      {(heroSpec.skills.length > 0 || (heroSpec.tools?.length ?? 0) > 0) && (
                        <div className="flex gap-1.5 flex-wrap">
                          {heroSpec.skills.map((s) => (
                            <span key={s.name} className="text-[11px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                              {s.name}
                            </span>
                          ))}
                          {heroSpec.tools?.map((tool) => (
                            <span key={tool.name} className="text-[11px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                              {tool.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Collapsible raw spec preview */}
                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center justify-center gap-1">
                      {t.landing.hero.viewSpec}
                    </summary>
                    <ScrollArea className="h-[200px] mt-2 rounded-xl border bg-card/50 p-4 text-left">
                      <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed text-muted-foreground">
                        {heroStreamText}
                      </pre>
                    </ScrollArea>
                  </details>

                  {/* Action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex gap-3"
                  >
                    <Button
                      variant="outline"
                      onClick={heroReset}
                      className="flex-1 rounded-xl gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {t.landing.hero.tryAnother}
                    </Button>
                    <Button
                      onClick={handleHeroSave}
                      disabled={heroSaving}
                      className="flex-1 rounded-xl gap-2"
                    >
                      {heroSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user ? (
                        <Save className="h-4 w-4" />
                      ) : (
                        <LogIn className="h-4 w-4" />
                      )}
                      {user ? t.landing.hero.saveAgent : t.landing.hero.signInToSave}
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {/* Error step */}
              {heroStep === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-destructive text-center">
                    {t.metaAgent.error}
                  </p>
                  <Button
                    variant="outline"
                    onClick={heroReset}
                    className="w-full rounded-xl"
                  >
                    {t.landing.hero.tryAnother}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Secondary CTA links */}
          <div className="mt-8 flex gap-4">
            <LocalizedLink href={user ? "/dashboard" : "/login"}>
              <Button size="sm" variant="ghost" className="gap-2 text-muted-foreground">
                {user ? t.landing.ctaDashboard : t.landing.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </LocalizedLink>
            <LocalizedLink href="/examples">
              <Button size="sm" variant="ghost" className="gap-2 text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" />
                {t.landing.examples}
              </Button>
            </LocalizedLink>
          </div>
        </motion.section>
      </main>
      </div>

        {/* Features */}
      <div style={{ background: "var(--landing-section-alt)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 py-24"
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
      </div>
      </div>

        {/* Integrations */}
      <div className="max-w-6xl mx-auto px-6">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="py-24"
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
      </div>

        {/* Orchestration & Teams */}
      <div style={{ background: "var(--landing-section-alt)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="py-24"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t.landing.orchestration.title}{" "}
              <span className="text-primary">{t.landing.orchestration.titleAccent}</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              {t.landing.orchestration.subtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Users,
                title: t.landing.orchestration.teams.title,
                description: t.landing.orchestration.teams.description,
              },
              {
                icon: Workflow,
                title: t.landing.orchestration.pipelines.title,
                description: t.landing.orchestration.pipelines.description,
              },
              {
                icon: Sparkles,
                title: t.landing.orchestration.metaAgent.title,
                description: t.landing.orchestration.metaAgent.description,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border bg-card p-6 space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
      </div>

        {/* Observability & Billing */}
      <div className="max-w-6xl mx-auto px-6">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="py-24"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t.landing.observability.title}{" "}
              <span className="text-primary">{t.landing.observability.titleAccent}</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              {t.landing.observability.subtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: Eye,
                title: t.landing.observability.sessions.title,
                description: t.landing.observability.sessions.description,
              },
              {
                icon: CreditCard,
                title: t.landing.observability.billing.title,
                description: t.landing.observability.billing.description,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border bg-card p-6 space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {t.landing.footer}
      </footer>
    </div>
  );
}

function extractName(description: string): string {
  const words = description.trim().split(/\s+/).slice(0, 5);
  const name = words.join(" ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}
