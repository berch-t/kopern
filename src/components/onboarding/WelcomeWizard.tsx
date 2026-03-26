"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Rocket,
  Search,
  Settings2,
  Sparkles,
  Wrench,
  BookOpen,
  FlaskConical,
  Pen,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  verticalTemplates,
  type VerticalTemplate,
  type OnboardingQuestion,
} from "@/data/vertical-templates";
import { hydratePrompt, extractAgentName } from "@/lib/templates/hydrate";
import { deployFromTemplate } from "@/actions/deploy-template";
import { createAgentFromSpec } from "@/lib/meta-agent/create-from-spec";
import type { AgentSpec } from "@/lib/meta-agent/types";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/providers/LocaleProvider";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";

// ─── Types ──────────────────────────────────────────────────────────

type WizardStep =
  | "welcome"
  | "pick-template"
  | "questionnaire"
  | "personalize"
  | "channel"
  | "review"
  | "generating"
  | "deploying";

const AVATAR_EMOJIS = [
  "🤖", "💼", "🏠", "🍽️", "🛒", "👥", "✂️", "💪", "⚖️",
  "🔧", "📊", "🎯", "🧠", "💡", "🌟", "🏗️", "📱", "🎨",
];

const CHANNELS = [
  { id: "telegram" as const, label: "Telegram", icon: "✈️", desc: "Bot Telegram automatique", descEn: "Automatic Telegram bot" },
  { id: "whatsapp" as const, label: "WhatsApp", icon: "💬", desc: "Via WhatsApp Business", descEn: "Via WhatsApp Business" },
  { id: "widget" as const, label: "Website Widget", icon: "🌐", desc: "Chat sur votre site web", descEn: "Chat embedded on your website" },
];

// ─── Generic questions for custom (no-template) flow ────────────────

const CUSTOM_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "businessName",
    type: "text",
    label: "What is your business or brand name?",
    labelFr: "Quel est le nom de votre entreprise ou marque ?",
    placeholder: "e.g. Domaine Lafleur",
    placeholderFr: "ex. Domaine Lafleur",
    helperText: "This will be your assistant's identity.",
    helperTextFr: "Ce sera l'identite de votre assistant.",
    required: true,
  },
  {
    id: "mainTasks",
    type: "textarea",
    label: "What should your assistant do? Describe its main tasks.",
    labelFr: "Que doit faire votre assistant ? Decrivez ses missions principales.",
    placeholder: "e.g. Answer customer questions about our wines, recommend pairings, handle visit bookings...",
    placeholderFr: "ex. Repondre aux questions clients sur nos vins, recommander des accords mets-vins, gerer les reservations de visites...",
    helperText: "Be as specific as possible — this shapes the assistant's behavior.",
    helperTextFr: "Soyez aussi precis que possible — cela definit le comportement de l'assistant.",
    required: true,
  },
  {
    id: "targetAudience",
    type: "text",
    label: "Who will talk to your assistant?",
    labelFr: "Qui parlera avec votre assistant ?",
    placeholder: "e.g. Our clients, wine enthusiasts, tourists",
    placeholderFr: "ex. Nos clients, amateurs de vin, touristes",
    helperText: "This helps the assistant adapt its tone and vocabulary.",
    helperTextFr: "Cela aide l'assistant a adapter son ton et vocabulaire.",
    required: true,
  },
  {
    id: "tone",
    type: "select",
    label: "What tone should the assistant use?",
    labelFr: "Quel ton doit adopter l'assistant ?",
    placeholder: "Select a tone",
    placeholderFr: "Choisissez un ton",
    helperText: "The personality your customers will experience.",
    helperTextFr: "La personnalite que vos clients vont ressentir.",
    required: true,
    options: [
      { value: "professional", label: "Professional & formal", labelFr: "Professionnel & formel" },
      { value: "friendly", label: "Friendly & approachable", labelFr: "Amical & accessible" },
      { value: "expert", label: "Expert & authoritative", labelFr: "Expert & autoritaire" },
      { value: "casual", label: "Casual & relaxed", labelFr: "Decontracte & detendu" },
      { value: "enthusiastic", label: "Enthusiastic & energetic", labelFr: "Enthousiaste & energique" },
    ],
  },
  {
    id: "specialInstructions",
    type: "textarea",
    label: "Any special instructions or constraints?",
    labelFr: "Des instructions ou contraintes particulieres ?",
    placeholder: "e.g. Always mention we're organic certified, never discuss competitor prices...",
    placeholderFr: "ex. Toujours mentionner notre certification bio, ne jamais discuter des prix concurrents...",
    helperText: "Optional but useful to fine-tune behavior.",
    helperTextFr: "Optionnel mais utile pour affiner le comportement.",
    required: false,
  },
];

// ─── Animation variants ──────────────────────────────────────────────

const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

// ─── Component ──────────────────────────────────────────────────────

interface WelcomeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomeWizard({ open, onOpenChange }: WelcomeWizardProps) {
  const { user } = useAuth();
  const locale = useLocale();
  const router = useLocalizedRouter();
  const isFr = locale === "fr";

  const [step, setStep] = useState<WizardStep>("welcome");
  const [selectedTemplate, setSelectedTemplate] = useState<VerticalTemplate | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customActivity, setCustomActivity] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIdx, setQuestionIdx] = useState(0);
  const [botName, setBotName] = useState("");
  const [botAvatar, setBotAvatar] = useState("🤖");
  const [channel, setChannel] = useState<"telegram" | "whatsapp" | "widget">("telegram");
  const [searchQuery, setSearchQuery] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);

  // Generation state
  const [streamText, setStreamText] = useState("");
  const [tokenCount, setTokenCount] = useState(0);
  const [spec, setSpec] = useState<AgentSpec | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll stream
  useEffect(() => {
    if (step === "generating" && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamText, step]);

  // ─── Derived ────────────────────────────────────────────────

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return verticalTemplates;
    const q = searchQuery.toLowerCase();
    return verticalTemplates.filter(
      (t) =>
        t.titleFr.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.verticalFr.toLowerCase().includes(q) ||
        t.vertical.toLowerCase().includes(q) ||
        t.taglineFr.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeQuestions = isCustomMode
    ? CUSTOM_QUESTIONS
    : (selectedTemplate?.onboardingQuestions ?? []);
  const currentQuestion = activeQuestions[questionIdx] ?? null;
  const totalQuestions = activeQuestions.length;
  const qProgress = totalQuestions > 0 ? ((questionIdx + 1) / totalQuestions) * 100 : 0;

  const generatedPrompt = useMemo(() => {
    if (isCustomMode) return buildMetaDescription(customActivity, answers, botName, isFr);
    if (!selectedTemplate) return "";
    return hydratePrompt(selectedTemplate.systemPromptTemplate, answers);
  }, [isCustomMode, selectedTemplate, answers, customActivity, botName, isFr]);

  const agentDisplayName = useMemo(() => {
    if (botName.trim()) return botName.trim();
    if (isCustomMode) return answers.businessName?.trim() || customActivity.trim() || "";
    if (!selectedTemplate) return "";
    return extractAgentName(selectedTemplate, answers, locale);
  }, [botName, isCustomMode, selectedTemplate, answers, customActivity, locale]);

  // ─── Overall progress ────────────────────────────────────────

  const overallProgress = useMemo(() => {
    const steps: WizardStep[] = ["welcome", "pick-template", "questionnaire", "personalize", "channel", "review"];
    const idx = steps.indexOf(step);
    if (step === "generating") return 95;
    if (step === "deploying") return 100;
    return idx >= 0 ? Math.round(((idx + 1) / steps.length) * 100) : 100;
  }, [step]);

  // ─── Handlers ────────────────────────────────────────────────

  const canProceedQuestion = useMemo(() => {
    if (!currentQuestion) return false;
    const val = answers[currentQuestion.id]?.trim();
    return currentQuestion.required ? !!val : true;
  }, [currentQuestion, answers]);

  function handleSelectTemplate(tmpl: VerticalTemplate) {
    setSelectedTemplate(tmpl);
    setIsCustomMode(false);
    setAnswers({});
    setQuestionIdx(0);
    setBotName("");
    setChannel(tmpl.suggestedChannel as "telegram" | "whatsapp" | "widget");
    setStep("questionnaire");
  }

  function handleCustomContinue() {
    setSelectedTemplate(null);
    setIsCustomMode(true);
    setAnswers({});
    setQuestionIdx(0);
    setBotName("");
    setCustomActivity(searchQuery.trim());
    setStep("questionnaire");
  }

  function handleNextQuestion() {
    if (questionIdx < totalQuestions - 1) {
      setQuestionIdx((i) => i + 1);
    } else {
      setStep("personalize");
    }
  }

  function handlePrevQuestion() {
    if (questionIdx > 0) {
      setQuestionIdx((i) => i - 1);
    } else {
      setStep("pick-template");
    }
  }

  function handleQuestionKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && canProceedQuestion && currentQuestion?.type !== "textarea") {
      e.preventDefault();
      handleNextQuestion();
    }
  }

  // ─── Deploy: template path (instant) ─────────────────────

  async function handleDeployTemplate() {
    if (!user || !selectedTemplate) return;
    setStep("deploying");

    try {
      const finalAnswers = { ...answers };
      const nameKey = selectedTemplate.onboardingQuestions.find(
        (q) => q.id === "businessName" || q.id === "firmName" || q.id === "agencyName" ||
               q.id === "shopName" || q.id === "companyName" || q.id === "salonName" ||
               q.id === "coachName"
      )?.id;
      if (nameKey && botName.trim()) {
        finalAnswers[nameKey] = botName.trim();
      }
      const agentId = await deployFromTemplate(user.uid, selectedTemplate, finalAnswers, locale);

      toast.success(isFr ? "Agent cree avec succes !" : "Agent created successfully!");
      onOpenChange(false);
      router.push(`/agents/${agentId}/connectors`);
    } catch {
      toast.error(isFr ? "Erreur lors de la creation" : "Failed to create agent");
      setStep("review");
    }
  }

  // ─── Deploy: custom path (LLM generation via meta-create) ──

  async function handleDeployCustom() {
    if (!user) return;
    setStep("generating");
    setStreamText("");
    setTokenCount(0);
    setSpec(null);
    setGenError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const description = buildMetaDescription(customActivity, answers, botName, isFr);

      const res = await fetch("/api/agents/meta-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          modelProvider: "anthropic",
          modelId: "claude-sonnet-4-6",
          userId: user.uid,
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
      let tCount = 0;
      let parsedSpec: AgentSpec | null = null;

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
                tCount += 1;
                setStreamText(accumulated);
                setTokenCount(tCount);
              } else if (evt === "spec") {
                parsedSpec = data as AgentSpec;
                setSpec(parsedSpec);
              } else if (evt === "done") {
                // Auto-create agent from the parsed spec
                await finalizeCustomAgent(parsedSpec, accumulated);
                return;
              } else if (evt === "error") {
                throw new Error(
                  data.message === "API_KEY_REQUIRED"
                    ? (isFr ? "Cle API requise. Ajoutez une cle dans Parametres." : "API key required. Add a key in Settings.")
                    : data.message
                );
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      // Fallback if stream ended without explicit done
      if (accumulated) {
        await finalizeCustomAgent(spec, accumulated);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setGenError((err as Error).message);
      setStep("generating"); // stay on generating to show error
    }
  }

  async function finalizeCustomAgent(parsedSpec: AgentSpec | null, rawText: string) {
    setStep("deploying");

    try {
      const finalSpec: AgentSpec = parsedSpec ?? spec ?? {
        name: agentDisplayName || customActivity,
        domain: customActivity,
        systemPrompt: rawText,
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-6",
        thinkingLevel: "off",
        builtinTools: [],
        skills: [],
        tools: [],
        extensions: [],
        gradingCases: [],
        purposeGate: null,
        tillDone: null,
        branding: null,
        rawSpec: rawText,
      };

      // Override name if user set one in personalize step
      if (botName.trim()) {
        finalSpec.name = botName.trim();
      }

      const agentId = await createAgentFromSpec(
        user!.uid,
        finalSpec,
        isFr ? `Assistant IA pour ${customActivity}` : `AI assistant for ${customActivity}`
      );

      toast.success(isFr ? "Agent cree avec succes !" : "Agent created successfully!");
      onOpenChange(false);
      router.push(`/agents/${agentId}/connectors`);
    } catch {
      toast.error(isFr ? "Erreur lors de la creation" : "Failed to create agent");
      setStep("review");
    }
  }

  function handleDeploy() {
    if (isCustomMode) {
      handleDeployCustom();
    } else {
      handleDeployTemplate();
    }
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v && abortRef.current) abortRef.current.abort();
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">
          {isFr ? "Assistant de creation" : "Creation wizard"}
        </DialogTitle>

        {/* Top progress bar */}
        {step !== "welcome" && step !== "deploying" && (
          <div className="px-6 pt-4">
            <Progress value={overallProgress} className="h-1.5" />
          </div>
        )}

        <div className="px-6 pb-6 pt-4 overflow-y-auto max-h-[85vh]">
          <AnimatePresence mode="wait">
            {/* ═══════════════ WELCOME ═══════════════ */}
            {step === "welcome" && (
              <motion.div
                key="welcome"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center py-8 space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="rounded-full bg-primary/10 p-6"
                >
                  <Sparkles className="h-12 w-12 text-primary" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-2xl font-bold">
                    {isFr ? "Bienvenue sur Kopern !" : "Welcome to Kopern!"}
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    {isFr
                      ? "Creez votre assistant IA personnalise en 2 minutes. Aucune competence technique requise."
                      : "Create your custom AI assistant in 2 minutes. No technical skills required."}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-3"
                >
                  <Button size="lg" onClick={() => setStep("pick-template")}>
                    {isFr ? "C'est parti !" : "Let's go!"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
                    {isFr ? "Plus tard" : "Later"}
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════════ PICK TEMPLATE ═══════════════ */}
            {step === "pick-template" && (
              <motion.div
                key="pick-template"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-xl font-bold">
                    {isFr ? "Decrivez votre activite" : "Describe your business"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isFr
                      ? "Tapez votre metier ou choisissez un modele ci-dessous."
                      : "Type your business or pick a template below."}
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isFr ? "ex. Vigneron, Fleuriste, Coach sportif..." : "e.g. Winemaker, Florist, Fitness coach..."}
                    className="pl-9 text-base"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        e.preventDefault();
                        handleCustomContinue();
                      }
                    }}
                  />
                </div>

                {/* Custom continue */}
                {searchQuery.trim() && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    <button
                      onClick={handleCustomContinue}
                      className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 hover:bg-primary/10 transition-all text-left"
                    >
                      <div className="rounded-lg p-2 bg-primary/10">
                        <Pen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {isFr ? `Creer un assistant "${searchQuery.trim()}"` : `Create a "${searchQuery.trim()}" assistant`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isFr ? "L'IA generera un agent complet sur mesure" : "AI will generate a complete custom agent"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                    </button>
                  </motion.div>
                )}

                <ScrollArea className={cn("pr-2", searchQuery.trim() ? "h-[300px]" : "h-[400px]")}>
                  {filteredTemplates.length > 0 && searchQuery.trim() && (
                    <p className="text-xs text-muted-foreground mb-2 px-1">
                      {isFr ? "Ou choisissez un modele :" : "Or pick a template:"}
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredTemplates.map((tmpl, i) => (
                      <motion.button
                        key={tmpl.slug}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => handleSelectTemplate(tmpl)}
                        className="group text-left rounded-xl border p-4 hover:border-primary/50 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("rounded-lg p-2", `bg-${tmpl.color}-500/10`)}>
                            <tmpl.icon className={cn("h-5 w-5", `text-${tmpl.color}-500`)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{isFr ? tmpl.titleFr : tmpl.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{isFr ? tmpl.taglineFr : tmpl.tagline}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  {filteredTemplates.length === 0 && !searchQuery.trim() && (
                    <p className="text-center text-muted-foreground py-12">{isFr ? "Aucun resultat" : "No results"}</p>
                  )}
                </ScrollArea>

                <Button variant="ghost" size="sm" onClick={() => setStep("welcome")} className="-ml-2">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {isFr ? "Retour" : "Back"}
                </Button>
              </motion.div>
            )}

            {/* ═══════════════ QUESTIONNAIRE ═══════════════ */}
            {step === "questionnaire" && currentQuestion && (
              <motion.div
                key={`questionnaire-${currentQuestion.id}`}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-6"
                onKeyDown={handleQuestionKeyDown}
              >
                {isCustomMode && questionIdx === 0 && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Pen className="h-4 w-4" />
                    <span className="font-medium">
                      {isFr ? `Assistant pour : ${customActivity}` : `Assistant for: ${customActivity}`}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Question {questionIdx + 1}/{totalQuestions}</span>
                    <span>{Math.round(qProgress)}%</span>
                  </div>
                  <Progress value={qProgress} className="h-2" />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <Label className="text-lg font-medium">
                        {isFr ? currentQuestion.labelFr : currentQuestion.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isFr ? currentQuestion.helperTextFr : currentQuestion.helperText}
                      </p>
                    </div>
                    <QuestionInput
                      question={currentQuestion}
                      value={answers[currentQuestion.id] ?? ""}
                      locale={locale}
                      onChange={(val) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))}
                    />
                  </motion.div>
                </AnimatePresence>

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={handlePrevQuestion}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {isFr ? "Precedent" : "Previous"}
                  </Button>
                  <Button onClick={handleNextQuestion} disabled={!canProceedQuestion}>
                    {questionIdx === totalQuestions - 1 ? (isFr ? "Continuer" : "Continue") : (isFr ? "Suivant" : "Next")}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                <div className="flex justify-center gap-1.5">
                  {activeQuestions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => { if (i <= questionIdx || answers[q.id]) setQuestionIdx(i); }}
                      className={cn(
                        "h-2 rounded-full transition-all duration-200",
                        i === questionIdx ? "w-6 bg-primary" : answers[q.id] ? "w-2 bg-primary/40" : "w-2 bg-muted-foreground/20"
                      )}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══════════════ PERSONALIZE ═══════════════ */}
            {step === "personalize" && (
              <motion.div
                key="personalize"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">{isFr ? "Personnalisez votre assistant" : "Personalize your assistant"}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isFr ? "Donnez-lui un nom et un avatar qui representent votre activite." : "Give it a name and avatar that represent your business."}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{isFr ? "Nom de l'assistant" : "Assistant name"}</Label>
                    <Input
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder={agentDisplayName || (isFr ? "Mon Assistant" : "My Assistant")}
                      className="text-base"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      {isFr ? "Vos clients verront ce nom quand ils parleront a votre bot." : "Your clients will see this name when chatting with your bot."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Avatar</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setBotAvatar(emoji)}
                          className={cn(
                            "h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-all",
                            botAvatar === emoji ? "bg-primary/15 ring-2 ring-primary scale-110" : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">{isFr ? "Apercu" : "Preview"}</p>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">{botAvatar}</div>
                        <div>
                          <p className="font-medium text-sm">{agentDisplayName || "..."}</p>
                          <p className="text-xs text-muted-foreground">
                            {isCustomMode ? customActivity : selectedTemplate ? (isFr ? selectedTemplate.verticalFr : selectedTemplate.vertical) : ""}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => { setStep("questionnaire"); setQuestionIdx(totalQuestions - 1); }}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {isFr ? "Precedent" : "Previous"}
                  </Button>
                  <Button onClick={() => setStep("channel")}>
                    {isFr ? "Choisir le canal" : "Choose channel"}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════ CHANNEL ═══════════════ */}
            {step === "channel" && (
              <motion.div
                key="channel"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">{isFr ? "Ou deployer votre assistant ?" : "Where to deploy your assistant?"}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{isFr ? "Vous pourrez en ajouter d'autres plus tard." : "You can add more channels later."}</p>
                </div>
                <div className="space-y-3">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setChannel(ch.id)}
                      className={cn(
                        "w-full flex items-center gap-4 rounded-xl border p-4 transition-all text-left",
                        channel === ch.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground/30"
                      )}
                    >
                      <span className="text-2xl">{ch.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{ch.label}</p>
                        <p className="text-sm text-muted-foreground">{isFr ? ch.desc : ch.descEn}</p>
                      </div>
                      {channel === ch.id && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => setStep("personalize")}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {isFr ? "Precedent" : "Previous"}
                  </Button>
                  <Button onClick={() => setStep("review")}>
                    {isFr ? "Voir le resume" : "See summary"}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════ REVIEW ═══════════════ */}
            {step === "review" && (
              <motion.div
                key="review"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-bold">{isFr ? "Tout est pret !" : "All set!"}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isFr ? "Verifiez et lancez la creation de votre assistant." : "Review and launch your assistant creation."}
                  </p>
                </div>

                {/* Identity card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">{botAvatar}</div>
                      <div>
                        <p className="font-bold">{agentDisplayName}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {isCustomMode ? customActivity : selectedTemplate ? (isFr ? selectedTemplate.verticalFr : selectedTemplate.vertical) : ""}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {CHANNELS.find((c) => c.id === channel)?.label}
                          </Badge>
                          {isCustomMode && (
                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                              {isFr ? "IA generee" : "AI generated"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats — template mode */}
                {selectedTemplate && !isCustomMode && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <Wrench className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{selectedTemplate.tools.length}</p>
                      <p className="text-xs text-muted-foreground">Tools</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <BookOpen className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{selectedTemplate.skills.length}</p>
                      <p className="text-xs text-muted-foreground">Skills</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <FlaskConical className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-medium">{selectedTemplate.gradingSuite.length}</p>
                      <p className="text-xs text-muted-foreground">Tests</p>
                    </div>
                  </div>
                )}

                {/* Custom mode info */}
                {isCustomMode && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 text-sm space-y-1">
                      <div className="flex items-center gap-2 font-medium text-primary">
                        <Sparkles className="h-4 w-4" />
                        {isFr ? "Generation IA complete" : "Full AI generation"}
                      </div>
                      <p className="text-muted-foreground">
                        {isFr
                          ? "L'IA va generer un agent complet avec prompt, skills, tools et tests de qualite adaptes a votre activite."
                          : "AI will generate a complete agent with prompt, skills, tools, and quality tests tailored to your business."}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Expandable prompt (template mode only) */}
                {!isCustomMode && (
                  <Card>
                    <button
                      onClick={() => setPromptExpanded(!promptExpanded)}
                      className="w-full flex items-center justify-between p-3 text-sm font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        {isFr ? "Prompt systeme" : "System prompt"}
                      </span>
                      {promptExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {promptExpanded && (
                      <CardContent className="px-3 pb-3 pt-0">
                        <ScrollArea className="h-48 rounded border p-2">
                          <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{generatedPrompt}</pre>
                        </ScrollArea>
                      </CardContent>
                    )}
                  </Card>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => setStep("channel")}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {isFr ? "Modifier" : "Edit"}
                  </Button>
                  <Button size="lg" onClick={handleDeploy}>
                    <Rocket className="h-5 w-5 mr-2" />
                    {isFr ? "Creer mon assistant" : "Create my assistant"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════ GENERATING (custom path — LLM streaming) ═══════════════ */}
            {step === "generating" && (
              <motion.div
                key="generating"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {!genError ? (
                  <>
                    {/* Header with shimmer status + token counter */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="shimmer-text text-sm font-medium">
                          {tokenCount < 100
                            ? (isFr ? "Generation du prompt systeme..." : "Generating system prompt...")
                            : tokenCount < 500
                              ? (isFr ? "Creation des skills & tools..." : "Creating skills & tools...")
                              : tokenCount < 1000
                                ? (isFr ? "Generation des tests de qualite..." : "Generating quality tests...")
                                : (isFr ? "Finalisation de l'agent..." : "Finalizing agent...")}
                        </span>
                      </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="flex items-center gap-2 text-xs text-muted-foreground/60"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="tabular-nums">~{Math.ceil(streamText.length / 4).toLocaleString()} tokens</span>
                      </motion.div>
                    </div>

                    {/* Streaming text output */}
                    <ScrollArea className="h-[330px] rounded-lg border bg-muted/30 p-4">
                      <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed text-muted-foreground">
                        {streamText || (
                          <span className="shimmer-text">
                            {isFr ? "Analyse de votre activite..." : "Analyzing your business..."}
                          </span>
                        )}
                        {streamText && (
                          <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                        )}
                      </pre>
                      <div ref={streamEndRef} />
                    </ScrollArea>

                    {/* Phase progress dots */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex gap-1.5">
                        {[0, 100, 500, 1000].map((threshold, i) => (
                          <motion.span
                            key={threshold}
                            initial={{ scale: 0.8 }}
                            animate={tokenCount > threshold ? { scale: 1, backgroundColor: "var(--color-primary)" } : {}}
                            className={cn(
                              "h-2 w-2 rounded-full transition-colors duration-500",
                              tokenCount > threshold ? "bg-primary" : "bg-muted-foreground/20"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-muted-foreground/50">
                        {[
                          isFr ? "Prompt" : "Prompt",
                          "Skills",
                          "Tools",
                          isFr ? "Tests" : "Tests",
                        ].map((label, i) => (
                          <span key={label} className={cn(
                            "mr-2",
                            tokenCount > [0, 100, 500, 1000][i] ? "text-foreground/70" : ""
                          )}>{label}</span>
                        ))}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { abortRef.current?.abort(); setStep("review"); }}
                      className="self-start -ml-2"
                    >
                      {isFr ? "Annuler" : "Cancel"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{genError}</span>
                    </div>
                    <Button variant="outline" onClick={() => { setGenError(null); setStep("review"); }}>
                      {isFr ? "Retour" : "Back"}
                    </Button>
                  </>
                )}
              </motion.div>
            )}

            {/* ═══════════════ DEPLOYING (final creation) ═══════════════ */}
            {step === "deploying" && (
              <motion.div
                key="deploying"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center py-16 space-y-6"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                  <Loader2 className="h-12 w-12 text-primary" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold">
                    {isFr ? "Creation en cours..." : "Creating..."}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {isFr ? "Sauvegarde de votre agent, skills, tools et tests..." : "Saving your agent, skills, tools and tests..."}
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    {channel === "telegram"
                      ? (isFr ? "Vous pourrez connecter votre bot Telegram juste apres." : "You'll connect your Telegram bot right after.")
                      : channel === "whatsapp"
                        ? (isFr ? "Vous configurerez WhatsApp Business juste apres." : "You'll set up WhatsApp Business right after.")
                        : (isFr ? "Vous configurerez le widget de chat juste apres." : "You'll set up the chat widget right after.")}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Build rich description for meta-create API ────────────────

function buildMetaDescription(
  activity: string,
  answers: Record<string, string>,
  botName: string,
  isFr: boolean
): string {
  const name = botName.trim() || answers.businessName || activity;
  const tasks = answers.mainTasks || "";
  const audience = answers.targetAudience || "";
  const tone = answers.tone || "professional";
  const special = answers.specialInstructions || "";

  if (isFr) {
    return [
      `Cree un agent IA complet pour "${name}", un(e) ${activity}.`,
      tasks && `Missions principales : ${tasks}`,
      audience && `Public cible : ${audience}`,
      `Ton souhaite : ${tone}`,
      special && `Instructions speciales : ${special}`,
      `L'agent doit etre entierement operationnel avec un prompt systeme detaille, des skills pertinents, des tools avec du vrai code JavaScript fonctionnel (pas de placeholders), et une suite de tests de qualite complete.`,
    ].filter(Boolean).join("\n\n");
  }

  return [
    `Create a complete AI agent for "${name}", a ${activity} business.`,
    tasks && `Main tasks: ${tasks}`,
    audience && `Target audience: ${audience}`,
    `Desired tone: ${tone}`,
    special && `Special instructions: ${special}`,
    `The agent must be fully operational with a detailed system prompt, relevant skills, tools with real working JavaScript code (no placeholders), and a comprehensive quality test suite.`,
  ].filter(Boolean).join("\n\n");
}

// ─── Question Input (shared) ──────────────────────────────────────

function QuestionInput({
  question,
  value,
  locale,
  onChange,
}: {
  question: OnboardingQuestion;
  value: string;
  locale: string;
  onChange: (val: string) => void;
}) {
  const isFr = locale === "fr";
  const placeholder = isFr ? question.placeholderFr : question.placeholder;

  switch (question.type) {
    case "text":
      return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus className="text-base" />;
    case "textarea":
      return <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus rows={4} className="text-base resize-none" />;
    case "number":
      return <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus className="text-base" />;
    case "select":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="text-base"><SelectValue placeholder={isFr ? "Selectionnez..." : "Select..."} /></SelectTrigger>
          <SelectContent>
            {question.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{isFr ? opt.labelFr : opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    default:
      return null;
  }
}
