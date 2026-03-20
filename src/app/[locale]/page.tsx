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
import { createAgent, updateAgent } from "@/actions/agents";
import { createSkill } from "@/actions/skills";
import { createTool } from "@/actions/tools";
import { createExtension } from "@/actions/extensions";
import { createGradingSuite } from "@/actions/grading-suites";
import { createGradingCase } from "@/actions/grading-cases";
import { toast } from "sonner";
import type { AgentSpec } from "@/lib/meta-agent/types";
import BorderGlow from "@/components/motion/BorderGlow";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Shield,
  Cable,
  ClipboardCheck,
  CreditCard,
  Eye,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  MessageSquare,
  Sparkles,
  Users,
  CheckCircle2,
  Save,
  LogIn,
  RotateCcw,
  DollarSign as DollarSignIcon,
  Github,
  Linkedin,
  Plug,
  Webhook,
  Workflow,
  Heart,
  Target,
  Zap,
  Trophy,
  Dna,
  ArrowDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BugReportDialog } from "@/components/feedback/BugReportDialog";
import { Component, type ErrorInfo, type ReactNode } from "react";

const HowItWorks = lazy(() => import("@/components/docs/HowItWorks").then((m) => ({ default: m.HowItWorks })));

class DocsBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("HowItWorks error:", error, info); }
  render() { return this.state.hasError ? null : this.props.children; }
}

const PixelBlast = lazy(() => import("@/components/ui/PixelBlast"));

const THINKING_PHRASES = [
  "Reading between the lines of your idea...",
  "Giving your agent its personality...",
  "Teaching it a few tricks...",
  "Forging the right tools for the job...",
  "Writing the exam questions...",
  "Polishing the final touches...",
  "Calibrating the neural pathways...",
  "Translating intent into instructions...",
  "Picking the perfect words...",
  "Assembling the knowledge base...",
  "Fine-tuning the decision engine...",
  "Mapping out the conversation flow...",
  "Building guardrails and safety nets...",
  "Crafting edge case handlers...",
  "Wiring up the tool connections...",
  "Stress-testing the logic...",
  "Optimizing for clarity and precision...",
  "Adding a dash of personality...",
  "Encoding domain expertise...",
  "Designing the evaluation criteria...",
  "Almost there, tightening the bolts...",
  "Double-checking the specifications...",
  "Running a quick mental simulation...",
  "Shaping the response patterns...",
  "Infusing best practices...",
  "Weaving skills into the fabric...",
  "Setting the stage for deployment...",
  "Imagining your agent in action...",
  "Balancing creativity and precision...",
  "One more pass for perfection...",
];

// --- Hero Agent Creator types ---
type HeroStep = "input" | "generating" | "review" | "error";

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Timer-based phrase cycling during generation
  useEffect(() => {
    if (heroStep !== "generating") return;
    setHeroPhase(0);
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setHeroPhase(idx);
    }, 3500);
    return () => clearInterval(interval);
  }, [heroStep]);

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

      // Use parsed model/thinking or sensible defaults
      const modelProvider = heroSpec?.modelProvider || "anthropic";
      const modelId = heroSpec?.modelId || "claude-sonnet-4-6";
      const thinkingLevel = (heroSpec?.thinkingLevel || "off") as "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
      const builtinTools = heroSpec?.builtinTools?.length ? heroSpec.builtinTools : [];

      const agentId = await createAgent(user.uid, {
        name: agentName,
        description: heroDescription.trim(),
        domain: agentDomain,
        systemPrompt: agentPrompt,
        modelProvider,
        modelId,
        thinkingLevel,
        builtinTools,
      });

      // Apply purpose gate, tillDone, branding if parsed
      const updates: Record<string, unknown> = {};
      if (heroSpec?.purposeGate) updates.purposeGate = heroSpec.purposeGate;
      if (heroSpec?.tillDone) updates.tillDone = heroSpec.tillDone;
      if (heroSpec?.branding) updates.branding = heroSpec.branding;
      if (Object.keys(updates).length > 0) {
        await updateAgent(user.uid, agentId, updates as Parameters<typeof updateAgent>[2]);
      }

      // Create skills
      if (heroSpec?.skills?.length) {
        await Promise.all(
          heroSpec.skills.map((s) =>
            createSkill(user.uid, agentId, { name: s.name, description: s.name, content: s.content })
          )
        );
      }

      // Create tools
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

      // Create extensions
      if (heroSpec?.extensions?.length) {
        await Promise.all(
          heroSpec.extensions.map((ext) =>
            createExtension(user.uid, agentId, {
              name: ext.name,
              description: ext.description,
              code: ext.code,
              events: ext.events ?? [],
              blocking: ext.blocking ?? false,
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
      <div className={`sticky top-0 z-50 backdrop-blur-sm transition-all duration-300 ${scrolled ? "bg-background/50 border-b border-accent shadow-[0_2px_16px_oklch(0.7677_0.1606_310.19_/_0.5)]" : "bg-background"}`}>
      <nav className="flex items-center px-6 py-4 max-w-6xl mx-auto">
        <div className="w-7 shrink-0" />

        {/* Center nav buttons */}
        <div className="flex-1 flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-primary hover:text-primary/80"
            onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
          >
            <BookOpen className="h-4 w-4" />
            {t.nav.docs}
          </Button>
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
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <BugReportDialog />
          <a
            href="https://github.com/berch-t/kopern"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Github className="h-4 w-4" />
            </Button>
          </a>
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
      </div>

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
          className="flex flex-col items-center text-center pt-20 pb-6"
        >
          {/* Logo + Beta badge */}
          <div className="relative mb-4">
            <img src="/logo_small.png" alt="Kopern" className="h-16" />
            <span className="absolute -top-1 -right-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
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
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center gap-5">
                    {/* Animated thinking phrases with shimmer */}
                    <div className="flex flex-col items-center gap-3 min-h-[90px] justify-center">
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={heroPhase}
                          initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="shimmer-text text-base font-semibold tracking-wide"
                        >
                          {THINKING_PHRASES[heroPhase % THINKING_PHRASES.length]}
                        </motion.p>
                      </AnimatePresence>

                      {/* Pulsing dot indicator */}
                      <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <motion.div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: "oklch(0.75 0.18 280)" }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: i * 0.2,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Token counter (~4 chars per token) */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground/60"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>~{Math.ceil(heroStreamText.length / 4).toLocaleString()} tokens</span>
                    </motion.div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      abortRef.current?.abort();
                      heroReset();
                    }}
                    className="w-full rounded-xl text-muted-foreground"
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
                          <span className="text-xs bg-amber-500/10 text-amber-400 rounded-full px-2.5 py-0.5 font-medium">
                            {heroSpec.tools.length} tool{heroSpec.tools.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {heroSpec.extensions?.length > 0 && (
                          <span className="text-xs bg-purple-500/10 text-purple-400 rounded-full px-2.5 py-0.5 font-medium">
                            {heroSpec.extensions.length} extension{heroSpec.extensions.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {heroSpec.gradingCases?.length > 0 && (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 rounded-full px-2.5 py-0.5 font-medium">
                            {heroSpec.gradingCases.length} test{heroSpec.gradingCases.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {heroSpec.purposeGate && (
                          <span className="text-xs bg-pink-500/10 text-pink-400 rounded-full px-2.5 py-0.5 font-medium">
                            Purpose Gate
                          </span>
                        )}
                        {heroSpec.tillDone && (
                          <span className="text-xs bg-orange-500/10 text-orange-400 rounded-full px-2.5 py-0.5 font-medium">
                            TillDone
                          </span>
                        )}
                      </div>

                      {/* Model info */}
                      <p className="text-xs text-muted-foreground">
                        {heroSpec.modelProvider}/{heroSpec.modelId} — thinking: {heroSpec.thinkingLevel}
                      </p>

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

        {/* Deploy Everywhere */}
      <div className="pt-2 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Scrolling logo banner — directly under hero */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs text-black font-bold uppercase tracking-widest mb-12 mt-6">
              {t.deploySection.integratesWith}
            </span>
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-background to-transparent" />
              <div className="animate-scroll-logos flex items-center gap-12 w-max">
                {[...Array(4)].map((_, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-12" aria-hidden={setIdx > 0 ? "true" : undefined}>
                    <a href="https://slack.com" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-6 w-6 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="Slack"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z"/></svg></a>
                    <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-6 w-6 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="Stripe"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg></a>
                    <a href="https://zapier.com" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-6 w-6 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="Zapier"><path d="M4.157 0A4.151 4.151 0 0 0 0 4.161v15.678A4.151 4.151 0 0 0 4.157 24h15.682A4.152 4.152 0 0 0 24 19.839V4.161A4.152 4.152 0 0 0 19.839 0H4.157Zm10.61 8.761h.03a.577.577 0 0 1 .23.038.585.585 0 0 1 .201.124.63.63 0 0 1 .162.431.612.612 0 0 1-.162.435.58.58 0 0 1-.201.128.58.58 0 0 1-.23.042.529.529 0 0 1-.235-.042.585.585 0 0 1-.332-.328.559.559 0 0 1-.038-.235.613.613 0 0 1 .17-.431.59.59 0 0 1 .405-.162Zm2.853 1.572c.03.004.061.004.095.004.325-.011.646.064.937.219.238.144.431.355.552.609.128.279.189.582.185.888v.193a2 2 0 0 1 0 .219h-2.498c.003.227.075.45.204.642a.78.78 0 0 0 .646.265.714.714 0 0 0 .484-.136.642.642 0 0 0 .23-.318l.915.257a1.398 1.398 0 0 1-.28.537c-.14.159-.321.284-.521.355a2.234 2.234 0 0 1-.836.136 1.923 1.923 0 0 1-1.001-.245 1.618 1.618 0 0 1-.665-.703 2.221 2.221 0 0 1-.227-1.036 1.95 1.95 0 0 1 .48-1.398 1.9 1.9 0 0 1 1.3-.488Zm-9.607.023c.162.004.325.026.48.079.207.065.4.174.563.314.26.302.393.692.366 1.088v2.276H8.53l-.109-.711h-.065c-.064.163-.155.31-.272.439a1.122 1.122 0 0 1-.374.264 1.023 1.023 0 0 1-.453.083 1.334 1.334 0 0 1-.866-.264.965.965 0 0 1-.329-.801.993.993 0 0 1 .076-.431 1.02 1.02 0 0 1 .242-.363 1.478 1.478 0 0 1 1.043-.303h.952v-.181a.696.696 0 0 0-.136-.454.553.553 0 0 0-.438-.154.695.695 0 0 0-.378.086.48.48 0 0 0-.193.254l-.99-.144a1.26 1.26 0 0 1 .257-.563c.14-.174.321-.302.533-.378.261-.091.54-.136.82-.129.053-.003.106-.007.163-.007Zm4.384.007c.174 0 .347.038.506.114.182.083.34.211.458.374.257.423.377.911.351 1.406a2.53 2.53 0 0 1-.355 1.448 1.148 1.148 0 0 1-1.009.517c-.204 0-.401-.045-.582-.136a1.052 1.052 0 0 1-.48-.457 1.298 1.298 0 0 1-.114-.234h-.045l.004 1.784h-1.059v-4.713h.904l.117.805h.057c.068-.208.177-.401.328-.56a1.129 1.129 0 0 1 .843-.344h.076v-.004Zm7.559.084h.903l.113.805h.053a1.37 1.37 0 0 1 .235-.484.813.813 0 0 1 .313-.242.82.82 0 0 1 .39-.076h.234v1.051h-.401a.662.662 0 0 0-.313.008.623.623 0 0 0-.272.155.663.663 0 0 0-.174.26.683.683 0 0 0-.027.314v1.875h-1.054v-3.666Zm-17.515.003h3.262v.896L3.73 13.104l.034.113h1.973l.042.9H2.4v-.9l1.931-1.754-.045-.117H2.441v-.896Zm11.815 0h1.055v3.659h-1.055V10.45Zm3.443.684.019.016a.69.69 0 0 0-.351.045.756.756 0 0 0-.287.204c-.11.155-.174.336-.189.522h1.545c-.034-.526-.257-.787-.74-.787h.003Zm-5.718.163c-.026 0-.057 0-.083.004a.78.78 0 0 0-.31.053.746.746 0 0 0-.257.189 1.016 1.016 0 0 0-.204.695v.064c-.015.257.057.507.204.711a.634.634 0 0 0 .253.196.638.638 0 0 0 .314.061.644.644 0 0 0 .578-.265c.14-.223.204-.48.189-.74a1.216 1.216 0 0 0-.181-.711.677.677 0 0 0-.503-.257Zm-4.509 1.266a.464.464 0 0 0-.268.102.373.373 0 0 0-.114.276c0 .053.008.106.027.155a.375.375 0 0 0 .087.132.576.576 0 0 0 .397.11v.004a.863.863 0 0 0 .563-.182.573.573 0 0 0 .211-.457v-.14h-.903Z"/></svg></a>
                    <a href="https://n8n.io" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-6 w-6 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="n8n"><path d="M21.4737 5.6842c-1.1772 0-2.1663.8051-2.4468 1.8947h-2.8955c-1.235 0-2.289.893-2.492 2.111l-.1038.623a1.263 1.263 0 0 1-1.246 1.0555H11.289c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947s-2.1663.8051-2.4467 1.8947H4.973c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947C1.1311 9.4737 0 10.6047 0 12s1.131 2.5263 2.5263 2.5263c1.1772 0 2.1663-.8051 2.4468-1.8947h1.4223c.2804 1.0896 1.2696 1.8947 2.4467 1.8947 1.1772 0 2.1663-.8051 2.4468-1.8947h1.0008a1.263 1.263 0 0 1 1.2459 1.0555l.1038.623c.203 1.218 1.257 2.111 2.492 2.111h.3692c.2804 1.0895 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263c-1.1772 0-2.1664.805-2.4468 1.8947h-.3692a1.263 1.263 0 0 1-1.246-1.0555l-.1037-.623A2.52 2.52 0 0 0 13.9607 12a2.52 2.52 0 0 0 .821-1.4794l.1038-.623a1.263 1.263 0 0 1 1.2459-1.0555h2.8955c.2805 1.0896 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263m0 1.2632a1.263 1.263 0 0 1 1.2631 1.2631 1.263 1.263 0 0 1-1.2631 1.2632 1.263 1.263 0 0 1-1.2632-1.2632 1.263 1.263 0 0 1 1.2632-1.2631M2.5263 10.7368A1.263 1.263 0 0 1 3.7895 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 1.2632 12a1.263 1.263 0 0 1 1.2631-1.2632m6.3158 0A1.263 1.263 0 0 1 10.1053 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 7.579 12a1.263 1.263 0 0 1 1.2632-1.2632m10.1053 3.7895a1.263 1.263 0 0 1 1.2631 1.2632 1.263 1.263 0 0 1-1.2631 1.2631 1.263 1.263 0 0 1-1.2632-1.2631 1.263 1.263 0 0 1 1.2632-1.2632"/></svg></a>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-6 w-6 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="GitHub"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></a>
                    <a href="https://www.atlassian.com/software/jira" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-6 w-6 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="Jira"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z"/></svg></a>
                    <a href="https://www.make.com" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-6 w-6 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="Make"><path d="M13.38 3.498c-.27 0-.511.19-.566.465L9.85 18.986a.578.578 0 0 0 .453.678l4.095.826a.58.58 0 0 0 .682-.455l2.963-15.021a.578.578 0 0 0-.453-.678l-4.096-.826a.589.589 0 0 0-.113-.012zm-5.876.098a.576.576 0 0 0-.516.318L.062 17.697a.575.575 0 0 0 .256.774l3.733 1.877a.578.578 0 0 0 .775-.258l6.926-13.781a.577.577 0 0 0-.256-.776L7.762 3.658a.571.571 0 0 0-.258-.062zm11.74.115a.576.576 0 0 0-.576.576v15.426c0 .318.258.578.576.578h4.178a.58.58 0 0 0 .578-.578V4.287a.578.578 0 0 0-.578-.576Z"/></svg></a>
                    <a href="https://www.notion.so" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-6 w-6 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="Notion"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg></a>
                    <a href="https://linear.app" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-6 w-6 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="Linear"><path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z"/></svg></a>
                    <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="shrink-0"><svg className="h-5 w-5 text-muted-foreground/70 hover:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-label="Vercel"><path d="m12 1.608 12 20.784H0Z"/></svg></a>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.deploySection.title}{" "}
              <span className="text-primary">{t.deploySection.titleAccent}</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.deploySection.subtitle}
            </p>
          </motion.div>

          {/* Row 1 — 3 cards with brand logos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid gap-6 sm:grid-cols-3"
          >
            {/* GitHub */}
            <BorderGlow className="bg-card" glowRadius={30}>
              <div className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/5">
                  <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                </div>
                <h3 className="font-semibold">{t.integrations.github.title}</h3>
                <p className="text-sm text-muted-foreground">{t.integrations.github.description}</p>
              </div>
            </BorderGlow>

            {/* Automation Platforms — n8n / Zapier / Make */}
            <BorderGlow className="bg-card" glowRadius={30}>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EA4B71]/10">
                    <svg className="h-5 w-5 text-[#EA4B71]" viewBox="0 0 24 24" fill="currentColor" aria-label="n8n"><path d="M21.4737 5.6842c-1.1772 0-2.1663.8051-2.4468 1.8947h-2.8955c-1.235 0-2.289.893-2.492 2.111l-.1038.623a1.263 1.263 0 0 1-1.246 1.0555H11.289c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947s-2.1663.8051-2.4467 1.8947H4.973c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947C1.1311 9.4737 0 10.6047 0 12s1.131 2.5263 2.5263 2.5263c1.1772 0 2.1663-.8051 2.4468-1.8947h1.4223c.2804 1.0896 1.2696 1.8947 2.4467 1.8947 1.1772 0 2.1663-.8051 2.4468-1.8947h1.0008a1.263 1.263 0 0 1 1.2459 1.0555l.1038.623c.203 1.218 1.257 2.111 2.492 2.111h.3692c.2804 1.0895 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263c-1.1772 0-2.1664.805-2.4468 1.8947h-.3692a1.263 1.263 0 0 1-1.246-1.0555l-.1037-.623A2.52 2.52 0 0 0 13.9607 12a2.52 2.52 0 0 0 .821-1.4794l.1038-.623a1.263 1.263 0 0 1 1.2459-1.0555h2.8955c.2805 1.0896 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263m0 1.2632a1.263 1.263 0 0 1 1.2631 1.2631 1.263 1.263 0 0 1-1.2631 1.2632 1.263 1.263 0 0 1-1.2632-1.2632 1.263 1.263 0 0 1 1.2632-1.2631M2.5263 10.7368A1.263 1.263 0 0 1 3.7895 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 1.2632 12a1.263 1.263 0 0 1 1.2631-1.2632m6.3158 0A1.263 1.263 0 0 1 10.1053 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 7.579 12a1.263 1.263 0 0 1 1.2632-1.2632m10.1053 3.7895a1.263 1.263 0 0 1 1.2631 1.2632 1.263 1.263 0 0 1-1.2631 1.2631 1.263 1.263 0 0 1-1.2632-1.2631 1.263 1.263 0 0 1 1.2632-1.2632"/></svg>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF4A00]/10">
                    <svg className="h-5 w-5 text-[#FF4A00]" viewBox="0 0 24 24" fill="currentColor" aria-label="Zapier"><path d="M4.157 0A4.151 4.151 0 0 0 0 4.161v15.678A4.151 4.151 0 0 0 4.157 24h15.682A4.152 4.152 0 0 0 24 19.839V4.161A4.152 4.152 0 0 0 19.839 0H4.157Zm10.61 8.761h.03a.577.577 0 0 1 .23.038.585.585 0 0 1 .201.124.63.63 0 0 1 .162.431.612.612 0 0 1-.162.435.58.58 0 0 1-.201.128.58.58 0 0 1-.23.042.529.529 0 0 1-.235-.042.585.585 0 0 1-.332-.328.559.559 0 0 1-.038-.235.613.613 0 0 1 .17-.431.59.59 0 0 1 .405-.162Zm2.853 1.572c.03.004.061.004.095.004.325-.011.646.064.937.219.238.144.431.355.552.609.128.279.189.582.185.888v.193a2 2 0 0 1 0 .219h-2.498c.003.227.075.45.204.642a.78.78 0 0 0 .646.265.714.714 0 0 0 .484-.136.642.642 0 0 0 .23-.318l.915.257a1.398 1.398 0 0 1-.28.537c-.14.159-.321.284-.521.355a2.234 2.234 0 0 1-.836.136 1.923 1.923 0 0 1-1.001-.245 1.618 1.618 0 0 1-.665-.703 2.221 2.221 0 0 1-.227-1.036 1.95 1.95 0 0 1 .48-1.398 1.9 1.9 0 0 1 1.3-.488Zm-9.607.023c.162.004.325.026.48.079.207.065.4.174.563.314.26.302.393.692.366 1.088v2.276H8.53l-.109-.711h-.065c-.064.163-.155.31-.272.439a1.122 1.122 0 0 1-.374.264 1.023 1.023 0 0 1-.453.083 1.334 1.334 0 0 1-.866-.264.965.965 0 0 1-.329-.801.993.993 0 0 1 .076-.431 1.02 1.02 0 0 1 .242-.363 1.478 1.478 0 0 1 1.043-.303h.952v-.181a.696.696 0 0 0-.136-.454.553.553 0 0 0-.438-.154.695.695 0 0 0-.378.086.48.48 0 0 0-.193.254l-.99-.144a1.26 1.26 0 0 1 .257-.563c.14-.174.321-.302.533-.378.261-.091.54-.136.82-.129.053-.003.106-.007.163-.007Zm4.384.007c.174 0 .347.038.506.114.182.083.34.211.458.374.257.423.377.911.351 1.406a2.53 2.53 0 0 1-.355 1.448 1.148 1.148 0 0 1-1.009.517c-.204 0-.401-.045-.582-.136a1.052 1.052 0 0 1-.48-.457 1.298 1.298 0 0 1-.114-.234h-.045l.004 1.784h-1.059v-4.713h.904l.117.805h.057c.068-.208.177-.401.328-.56a1.129 1.129 0 0 1 .843-.344h.076v-.004Zm7.559.084h.903l.113.805h.053a1.37 1.37 0 0 1 .235-.484.813.813 0 0 1 .313-.242.82.82 0 0 1 .39-.076h.234v1.051h-.401a.662.662 0 0 0-.313.008.623.623 0 0 0-.272.155.663.663 0 0 0-.174.26.683.683 0 0 0-.027.314v1.875h-1.054v-3.666Zm-17.515.003h3.262v.896L3.73 13.104l.034.113h1.973l.042.9H2.4v-.9l1.931-1.754-.045-.117H2.441v-.896Zm11.815 0h1.055v3.659h-1.055V10.45Zm3.443.684.019.016a.69.69 0 0 0-.351.045.756.756 0 0 0-.287.204c-.11.155-.174.336-.189.522h1.545c-.034-.526-.257-.787-.74-.787h.003Zm-5.718.163c-.026 0-.057 0-.083.004a.78.78 0 0 0-.31.053.746.746 0 0 0-.257.189 1.016 1.016 0 0 0-.204.695v.064c-.015.257.057.507.204.711a.634.634 0 0 0 .253.196.638.638 0 0 0 .314.061.644.644 0 0 0 .578-.265c.14-.223.204-.48.189-.74a1.216 1.216 0 0 0-.181-.711.677.677 0 0 0-.503-.257Zm-4.509 1.266a.464.464 0 0 0-.268.102.373.373 0 0 0-.114.276c0 .053.008.106.027.155a.375.375 0 0 0 .087.132.576.576 0 0 0 .397.11v.004a.863.863 0 0 0 .563-.182.573.573 0 0 0 .211-.457v-.14h-.903Z"/></svg>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6D00CC]/10">
                    <svg className="h-5 w-5 text-[#6D00CC]" viewBox="0 0 24 24" fill="currentColor" aria-label="Make"><path d="M13.38 3.498c-.27 0-.511.19-.566.465L9.85 18.986a.578.578 0 0 0 .453.678l4.095.826a.58.58 0 0 0 .682-.455l2.963-15.021a.578.578 0 0 0-.453-.678l-4.096-.826a.589.589 0 0 0-.113-.012zm-5.876.098a.576.576 0 0 0-.516.318L.062 17.697a.575.575 0 0 0 .256.774l3.733 1.877a.578.578 0 0 0 .775-.258l6.926-13.781a.577.577 0 0 0-.256-.776L7.762 3.658a.571.571 0 0 0-.258-.062zm11.74.115a.576.576 0 0 0-.576.576v15.426c0 .318.258.578.576.578h4.178a.58.58 0 0 0 .578-.578V4.287a.578.578 0 0 0-.578-.576Z"/></svg>
                  </div>
                </div>
                <h3 className="font-semibold">{t.deploySection.automation.title}</h3>
                <p className="text-sm text-muted-foreground">{t.deploySection.automation.description}</p>
              </div>
            </BorderGlow>

            {/* Slack Bot */}
            <BorderGlow className="bg-card" glowRadius={30}>
              <div className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A154B]/10">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                    <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
                  </svg>
                </div>
                <h3 className="font-semibold">{t.deploySection.slack.title}</h3>
                <p className="text-sm text-muted-foreground">{t.deploySection.slack.description}</p>
              </div>
            </BorderGlow>
          </motion.div>

          {/* Row 2 — 4 smaller cards with icons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid gap-4 grid-cols-2 lg:grid-cols-4 mt-4"
          >
            <BorderGlow className="bg-card" glowRadius={24}>
              <div className="p-4 space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Plug className="h-4 w-4 text-blue-500" />
                </div>
                <h3 className="text-sm font-semibold">{t.integrations.mcp.title}</h3>
                <p className="text-xs text-muted-foreground">{t.integrations.mcp.description}</p>
              </div>
            </BorderGlow>

            <BorderGlow className="bg-card" glowRadius={24}>
              <div className="p-4 space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
                  <MessageSquare className="h-4 w-4 text-sky-500" />
                </div>
                <h3 className="text-sm font-semibold">{t.deploySection.widget.title}</h3>
                <p className="text-xs text-muted-foreground">{t.deploySection.widget.description}</p>
              </div>
            </BorderGlow>

            <BorderGlow className="bg-card" glowRadius={24}>
              <div className="p-4 space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Webhook className="h-4 w-4 text-amber-500" />
                </div>
                <h3 className="text-sm font-semibold">{t.deploySection.webhooks.title}</h3>
                <p className="text-xs text-muted-foreground">{t.deploySection.webhooks.description}</p>
              </div>
            </BorderGlow>

            <BorderGlow className="bg-card" glowRadius={24}>
              <div className="p-4 space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                  <Workflow className="h-4 w-4 text-purple-500" />
                </div>
                <h3 className="text-sm font-semibold">{t.integrations.workflow.title}</h3>
                <p className="text-xs text-muted-foreground">{t.integrations.workflow.description}</p>
              </div>
            </BorderGlow>
          </motion.div>
        </div>
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

        {/* AutoResearch — Self-Improving Agents */}
      <div className="max-w-6xl mx-auto px-6">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="py-24"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t.landing.autoResearch.title}{" "}
              <span className="text-primary">{t.landing.autoResearch.titleAccent}</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              {t.landing.autoResearch.subtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Target,
                title: t.landing.autoResearch.autotune.title,
                description: t.landing.autoResearch.autotune.description,
                accent: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                icon: Zap,
                title: t.landing.autoResearch.autofix.title,
                description: t.landing.autoResearch.autofix.description,
                accent: "text-amber-500",
                bg: "bg-amber-500/10",
              },
              {
                icon: Shield,
                title: t.landing.autoResearch.stressLab.title,
                description: t.landing.autoResearch.stressLab.description,
                accent: "text-red-500",
                bg: "bg-red-500/10",
              },
              {
                icon: Trophy,
                title: t.landing.autoResearch.tournament.title,
                description: t.landing.autoResearch.tournament.description,
                accent: "text-purple-500",
                bg: "bg-purple-500/10",
              },
              {
                icon: Dna,
                title: t.landing.autoResearch.evolution.title,
                description: t.landing.autoResearch.evolution.description,
                accent: "text-pink-500",
                bg: "bg-pink-500/10",
              },
              {
                icon: ArrowDown,
                title: t.landing.autoResearch.distillation.title,
                description: t.landing.autoResearch.distillation.description,
                accent: "text-emerald-500",
                bg: "bg-emerald-500/10",
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

      {/* How it Works — Full documentation */}
      <div style={{ background: "var(--landing-section-alt)" }}>
        <DocsBoundary>
          <Suspense fallback={null}>
            <HowItWorks id="how-it-works" />
          </Suspense>
        </DocsBoundary>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/berch-t/kopern"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://linkedin.com/in/thomas-berchet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            Made with <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" /> by berch-t and Tonton Claude
          </p>
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Kopern
          </p>
        </div>
      </footer>
    </div>
  );
}

function extractName(description: string): string {
  const words = description.trim().split(/\s+/).slice(0, 5);
  const name = words.join(" ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}
