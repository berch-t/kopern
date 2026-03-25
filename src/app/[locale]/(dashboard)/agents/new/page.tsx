"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren } from "@/components/motion/StaggerChildren";
import { AgentForm } from "@/components/agents/AgentForm";
import { TemplateCard } from "@/components/agents/TemplateCard";
import { OnboardingQuestionnaire } from "@/components/agents/OnboardingQuestionnaire";
import { AgentPreview } from "@/components/agents/AgentPreview";
import { verticalTemplates } from "@/data/vertical-templates";
import { deployFromTemplate } from "@/actions/deploy-template";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDocument } from "@/hooks/useFirestore";
import { userDoc, type UserDoc } from "@/lib/firebase/firestore";

type View = "choose" | "scratch" | "template" | "preview";

export default function NewAgentPage() {
  const t = useDictionary();
  const locale = useLocale();
  const { user } = useAuth();
  const router = useLocalizedRouter();
  const [view, setView] = useState<View>("choose");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, string>>({});
  const [deploying, setDeploying] = useState(false);
  const { data: userData } = useDocument<UserDoc>(user ? userDoc(user.uid) : null);

  const selectedTemplate = selectedSlug
    ? verticalTemplates.find((t) => t.slug === selectedSlug) ?? null
    : null;

  if (view === "scratch") {
    return (
      <div className="space-y-6">
        <SlideUp>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("choose")}
            className="mb-2 -ml-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t.common.back}
          </Button>
          <h1 className="text-3xl font-bold">{t.agents.createTitle}</h1>
          <p className="text-muted-foreground">{t.agents.createSubtitle}</p>
        </SlideUp>
        <SlideUp delay={0.1}>
          <AgentForm />
        </SlideUp>
      </div>
    );
  }

  if (view === "template" && selectedTemplate) {
    return (
      <div className="space-y-6">
        <SlideUp>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("rounded-lg p-2", `bg-${selectedTemplate.color}-500/10`)}>
              <selectedTemplate.icon className={cn("h-6 w-6", `text-${selectedTemplate.color}-500`)} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {locale === "fr" ? selectedTemplate.titleFr : selectedTemplate.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {locale === "fr" ? selectedTemplate.taglineFr : selectedTemplate.tagline}
              </p>
            </div>
          </div>
        </SlideUp>
        <SlideUp delay={0.1}>
          <OnboardingQuestionnaire
            template={selectedTemplate}
            locale={locale}
            onBack={() => {
              setView("choose");
              setSelectedSlug(null);
            }}
            onComplete={(answers) => {
              setOnboardingAnswers(answers);
              setView("preview");
            }}
          />
        </SlideUp>
      </div>
    );
  }

  if (view === "preview" && selectedTemplate) {
    async function handleDeploy() {
      if (!user) return;
      setDeploying(true);
      try {
        const agentId = await deployFromTemplate(
          user.uid,
          selectedTemplate!,
          onboardingAnswers,
          locale
        );
        toast.success(
          locale === "fr" ? "Agent créé avec succès !" : "Agent created successfully!"
        );
        router.push(`/agents/${agentId}`);
      } catch (err) {
        toast.error(
          locale === "fr"
            ? "Erreur lors de la création de l'agent"
            : "Failed to create agent"
        );
        setDeploying(false);
      }
    }

    return (
      <div className="space-y-6">
        <SlideUp>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("template")}
            className="mb-2 -ml-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {locale === "fr" ? "Modifier les réponses" : "Edit answers"}
          </Button>
          <h1 className="text-2xl font-bold">
            {locale === "fr" ? "Aperçu de votre agent" : "Your Agent Preview"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === "fr"
              ? "Vérifiez la configuration et déployez en un clic."
              : "Review the configuration and deploy in one click."}
          </p>
        </SlideUp>
        <SlideUp delay={0.1}>
          <AgentPreview
            template={selectedTemplate}
            answers={onboardingAnswers}
            locale={locale}
            onDeploy={handleDeploy}
            deploying={deploying}
            hasApiKey={!!userData?.apiKeys?.[selectedTemplate.modelProvider]}
          />
        </SlideUp>
      </div>
    );
  }

  // Default: "choose" view — template catalog + scratch CTA
  return (
    <div className="space-y-8">
      <SlideUp>
        <h1 className="text-3xl font-bold">
          {locale === "fr" ? "Créer un Agent" : "Create an Agent"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {locale === "fr"
            ? "Choisissez un modèle métier prêt à l'emploi ou partez de zéro."
            : "Pick a ready-made business template or start from scratch."}
        </p>
      </SlideUp>

      {/* ── Template catalog ────────────────────────── */}
      <SlideUp delay={0.05}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">
            {locale === "fr" ? "Modèles métier" : "Business Templates"}
          </h2>
          <Badge variant="secondary" className="text-xs">
            {locale === "fr" ? "Nouveau" : "New"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {locale === "fr"
            ? "Répondez à quelques questions, et votre agent est prêt à déployer — aucune connaissance technique requise."
            : "Answer a few questions and your agent is ready to deploy — no technical knowledge required."}
        </p>
      </SlideUp>

      <StaggerChildren className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {verticalTemplates.map((tmpl) => (
          <TemplateCard
            key={tmpl.slug}
            template={tmpl}
            locale={locale}
            onSelect={() => {
              setSelectedSlug(tmpl.slug);
              setView("template");
            }}
          />
        ))}
      </StaggerChildren>

      {/* ── Scratch CTA ────────────────────────── */}
      <SlideUp delay={0.2}>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t.common.or}
            </span>
          </div>
        </div>
      </SlideUp>

      <SlideUp delay={0.25}>
        <button
          onClick={() => setView("scratch")}
          className="w-full group rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors p-6 flex items-center gap-4"
        >
          <div className="rounded-lg bg-muted p-3 group-hover:bg-primary/10 transition-colors">
            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground">
              {locale === "fr" ? "Créer de zéro" : "Create from Scratch"}
            </p>
            <p className="text-sm text-muted-foreground">
              {locale === "fr"
                ? "Configurez manuellement le prompt, le modèle, les tools et les skills."
                : "Manually configure the prompt, model, tools, and skills."}
            </p>
          </div>
        </button>
      </SlideUp>
    </div>
  );
}
