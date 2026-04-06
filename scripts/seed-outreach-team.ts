/**
 * Seed skills and extensions for the Outreach Squad team.
 * Run: npx tsx scripts/seed-outreach-team.ts
 * Requires: .env.local with Firebase Admin credentials
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

// --- Agent IDs (from MCP creation) ---
const AGENTS = {
  scout: "ExD77n7t4WfEDzYxVhxo",
  analyst: "AUB4MLDgEFsYZ94W9ZdK",
  copywriter: "Epa2ScBrpPjZARtdZuxI",
  editor: "aRpR1AX4xj2eepvMxzZA",
};

// Owner userId (from NEXT_PUBLIC_ADMIN_UID or BUG_FIXER_OWNER_ID)
const USER_ID = process.env.NEXT_PUBLIC_ADMIN_UID?.split(",")[0]?.trim();
if (!USER_ID) {
  console.error("NEXT_PUBLIC_ADMIN_UID not set in .env.local");
  process.exit(1);
}

const now = FieldValue.serverTimestamp();

// ─── Skills ──────────────────────────────────────────────────────────

const SKILLS: Record<string, Array<{ name: string; description: string; content: string }>> = {
  scout: [
    {
      name: "Sources de leads IA",
      description: "Liste des meilleures sources pour trouver des entreprises avec des agents IA",
      content: `## Sources prioritaires pour le lead gen IA

### Tier 1 — Volume + qualite
- **Product Hunt** : https://www.producthunt.com/topics/artificial-intelligence — filtrer par "Newest", categorie "AI", "Chatbots"
- **GitHub Trending** : https://github.com/trending?since=monthly — repos avec "agent", "chatbot", "llm" dans le titre
- **There's An AI For That** : https://theresanaiforthat.com/agents/ — directory de 10k+ outils IA

### Tier 2 — Niche + qualite
- **Hacker News** : recherche "Show HN" + "AI agent" via https://hn.algolia.com/
- **Twitter/X** : hashtags #AIagent #BuildInPublic #LLMops — comptes < 10k followers = startups accessibles
- **Dev.to / Hashnode** : articles "I built an AI agent" — auteurs = prospects ideaux

### Tier 3 — Enrichissement
- **Crunchbase** : startups IA early-stage (seed/series A), filtre par date de creation
- **LinkedIn** : "AI agent" dans le titre du poste → profil de l'entreprise
- **Futurtools.io** : https://www.futuretools.io/ — directory IA avec categories

### Filtres de qualification
- Taille equipe < 50 personnes (ideal < 10)
- Produit lance < 6 mois (early stage)
- Pas de grading/testing/monitoring visible = pain point Kopern
- Endpoint/demo accessible publiquement = grader avec kopern.ai/grader`,
    },
    {
      name: "Qualification leads",
      description: "Criteres de qualification et scoring des leads pour Kopern",
      content: `## Grille de qualification des leads

### Relevance HIGH (priorite absolue)
- L'entreprise a un agent/chatbot deploye en production (widget visible, API doc, demo)
- Equipe < 10 personnes (decision rapide, CTO = acheteur)
- Pas de solution de testing/grading visible
- Stack compatible (LLM-based, pas rule-based)
- Secteur B2B ou SaaS (budget techno)

### Relevance MEDIUM (a traiter)
- L'entreprise construit des outils pour agents IA (framework, SDK)
- Agent en beta/preview (pas encore en prod)
- Equipe 10-50 personnes
- Concurrents indirects qui pourraient utiliser Kopern en complement

### Relevance LOW (skip sauf si idle)
- Grands comptes (> 50 personnes, cycle de vente long)
- Agent uniquement interne (pas de produit)
- Rule-based chatbot (pas de LLM)
- Marche non-tech (sauf si vertical Kopern : BTP, resto, immo, etc.)

### Signaux de disqualification (EXCLURE)
- Concurrents directs : Voiceflow, Botpress, Flowise, Langflow, Dify, Stack AI
- Geants : OpenAI, Google, Microsoft, Anthropic, Meta, Amazon, Cohere
- Entreprises deja clientes Kopern
- Sites en maintenance / domaines expires`,
    },
  ],

  analyst: [
    {
      name: "Features Kopern",
      description: "Catalogue complet des features Kopern pour identifier les pain points prospects",
      content: `## Features Kopern — Reference pour l'analyse de pain points

### Agent Builder
- Zero-code wizard avec 37 templates (28 generaux + 9 verticaux metier)
- Multi-provider : Anthropic, OpenAI, Google, Mistral, Ollama (local)
- Tool calling natif, skills, custom tools (JS sandboxe), extensions (event hooks)
- Agent Memory persistante (LRU, cross-session search)
- Key rotation failover (5 cles/provider)

### Grading & Optimization (AVANTAGE UNIQUE)
- 6 criteres de grading (output_match, schema_validation, tool_usage, safety_check, custom_script, llm_judge)
- AutoFix 1-clic : genere tests → grade → analyse → patch le prompt automatiquement
- Stress Lab : red team adversarial (prompt injection, jailbreak, hallucination, edge cases)
- AutoTune : optimisation iterative du prompt par mutation LLM
- Tournament : comparaison head-to-head modeles/configs
- Scheduled grading : monitoring continu avec alertes (email, Slack, webhook)

### Orchestration Multi-Agents
- React Flow v12 : editeur visuel drag-and-drop
- 3 modes : parallel, sequential, conditional
- Kanban, Goal Tree, Org Chart, Activity Timeline
- Budget enforcer, delegate_task, atomic task checkout

### Deploiement
- Widget embeddable (Shadow DOM, SSE, mobile)
- Slack, Telegram, WhatsApp, Webhooks (n8n/Zapier/Make)
- MCP Protocol (32 outils, compatible Claude Code/Cursor/Windsurf)
- Self-hosted Docker (zero cloud possible avec Ollama + Firebase Emulator)

### Compliance & Securite
- EU AI Act compliance reports (Art. 6, 12, 14, 52)
- Tool approval (auto / confirm_destructive / confirm_all)
- Rate limiting, input validation Zod, CSP headers
- Sandbox VM pour custom tools (zero network access)

### Pricing
- Starter : gratuit (limites)
- Pro : $79/mois
- Usage PAYG : pay-as-you-go
- Enterprise : $499/mois`,
    },
    {
      name: "Mapping pain points",
      description: "Mapping entre observations prospect et value props Kopern",
      content: `## Mapping : ce que tu observes → value prop Kopern

| Observation chez le prospect | Pain point | Value prop Kopern |
|-----|-----|-----|
| Chatbot visible mais reponses generiques | Pas de grading qualite | Grading Engine 6 criteres + improvement notes |
| Pas de page "testing" ou "quality" | Pas d'outil de QA | Stress Lab (red team adversarial) + AutoFix |
| Un seul agent sans orchestration | Limitation single-agent | Orchestration multi-agents (React Flow) |
| Setup technique complexe (code-only) | Pas de no-code | WelcomeWizard zero-code + 37 templates |
| Deploye sur un seul canal | Pas de multi-canal | 5 connecteurs (Widget, Slack, Telegram, WhatsApp, Webhooks) |
| Pas de monitoring visible | Pas de monitoring prod | Scheduled grading + alertes 3 canaux |
| Open-source sans infra | Besoin d'infra managee | Kopern SaaS ou Self-hosted Docker |
| Utilise un seul provider LLM | Vendor lock-in | Multi-provider + key rotation failover |
| Pas de mention compliance | Pas de compliance EU | EU AI Act reports + tool approval |
| API mais pas de CLI/IDE integration | Workflow dev limité | MCP Protocol 32 outils (Claude Code, Cursor) |`,
    },
  ],

  copywriter: [
    {
      name: "Exemples cold emails",
      description: "Templates et exemples d'emails de cold outreach pour chaque mode de campagne",
      content: `## Exemples par mode — a adapter, JAMAIS a copier tel quel

### Mode promotion — bon exemple
Subject: Quality testing pour agents vocaux ?
Body:
Les agents vocaux de Vocode gerent bien le multi-LLM — mais quand un agent deraille en prod sur un edge case, comment vous le detectez ?

On a construit un engine de grading qui teste les agents contre 6 criteres (y compris prompt injection et hallucination) avant le deploiement. Open-source.

https://github.com/berch/kopern

Si ca peut etre utile, jette un oeil — sinon pas de souci.

Thomas

### Mode beta — bon exemple
Subject: Beta testeur pour Kopern ?
Body:
Ton chatbot sur chatbase.co est propre — j'ai regarde comment tu geres les fallbacks quand l'utilisateur sort du scope, c'est bien pense.

On lance Kopern en beta : un outil de grading + stress testing pour agents IA. On cherche des builders comme toi pour tester et donner du feedback.

Acces Pro gratuit + call direct avec moi si tu veux.

https://www.kopern.ai

Thomas

### Mode outreach — bon exemple
Subject: Score 62% sur ton chatbot support
Body:
J'ai passe ton agent support dans notre grader (kopern.ai/grader) — score global 62%.

Point positif : les reponses sont coherentes et le ton est bien calibre.
Points faibles : vulnérable aux prompt injections (score 3/10) et hallucine sur les questions hors-scope (score 4/10).

Notre AutoFix peut patcher ces problemes en 1 clic — si tu veux voir le rapport complet, je te l'envoie.

Thomas — Kopern

### Anti-patterns (rappel)
- JAMAIS "I hope this email finds you well"
- JAMAIS commencer par "je" ou "nous"
- JAMAIS de bullet points marketing
- JAMAIS plus de 2 liens
- Signature = "Thomas" ou "Thomas — Kopern" (pas de titre)`,
    },
    {
      name: "Principes cold email",
      description: "Regles d'or du cold email B2B a fort taux de reponse",
      content: `## Regles d'or cold email B2B

### Structure AIDA adaptee cold email
1. **Attention** (1ere phrase) : hook personnalise, detail specifique au prospect
2. **Interest** (2-3 phrases) : probleme que tu resous, lie a leur situation
3. **Desire** (1-2 phrases) : ce que Kopern fait concretement pour eux
4. **Action** (1 phrase) : CTA simple, bas engagement ("jette un oeil", "reponds si ca t'interesse")

### Metriques cibles
- Taux d'ouverture : > 40% (subject line court + personnalise)
- Taux de reponse : > 5% (email court + valeur immediate)
- Taux de bounce : < 2% (emails verifies)

### Subject lines qui marchent
- Question + leur produit : "Quality testing pour [product] ?"
- Score + intrigue : "Score 62% sur ton chatbot"
- Peer reference : "[Concurrent] utilise ca pour ses agents"
- Direct + court : "[Prenom], quick question"

### Subject lines a eviter
- Tout en majuscules
- Avec "FREE", "OFFER", "GUARANTEED"
- Avec des chiffres exageres ("10x your revenue")
- Trop vague ("Quick question" sans contexte)
- Trop long (> 50 caracteres)

### Timing
- Mardi-jeudi, 8h-10h ou 14h-16h (timezone du prospect)
- Follow-up J+3 (pas avant)
- Maximum 2 follow-ups (3 emails total)
- Stop si pas de reponse apres 3 emails`,
    },
  ],

  editor: [
    {
      name: "Checklist deliverabilite",
      description: "Checklist complete pour maximiser la deliverabilite des emails de cold outreach",
      content: `## Checklist deliverabilite email

### Spam words a detecter (score +5 chacun)
free, guarantee, act now, limited time, click here, buy now, no obligation, order now, winner, congratulations, urgent, exclusive deal, risk-free, double your, earn money, no cost, subscribe, unsubscribe, opt-in, bulk email, mass email, dear friend, this is not spam

### Patterns HTML a eviter (score +10 chacun)
- Images (surtout sans alt text)
- Background colors
- Fonts exotiques
- Tables complexes
- CSS inline excessif
→ REGLE : texte brut uniquement pour le cold outreach

### Metriques de scoring
| Critere | Poids | Seuil OK |
|---------|-------|----------|
| Spam words | +5/mot | 0 mot |
| Majuscules excessives (> 20% du texte) | +15 | < 10% |
| Ponctuation excessive (!! ou ??) | +10 | 0 |
| Nombre de liens | +10/lien au-dela de 2 | <= 2 |
| Subject > 50 chars | +10 | <= 50 |
| Ratio texte/liens < 10:1 | +10 | > 10:1 |
| Pas de personalisation | +20 | Au moins 1 detail specifique |
| Commence par "je/nous" | +5 | Non |

### Score interpretation
- 0-20 : Excellent — approuve
- 21-40 : Acceptable — approuve avec notes
- 41-60 : Risque — needs_revision
- 61-80 : Dangereux — needs_revision urgent
- 81-100 : Spam — rejected`,
    },
    {
      name: "Compliance RGPD CAN-SPAM",
      description: "Regles de compliance pour le cold outreach B2B en Europe et US",
      content: `## Compliance cold email B2B

### RGPD (Europe)
- **Base legale** : interet legitime (Article 6(1)(f)) — valide pour B2B si :
  - Le destinataire est un professionnel contacte sur son adresse pro
  - L'objet est en rapport avec son activite professionnelle
  - On offre un moyen simple de se desinscrire
- **Pas besoin de consentement prealable** pour le B2B (contrairement au B2C)
- **Donnees minimales** : nom + email pro + entreprise — pas de donnees sensibles
- **Opt-out obligatoire** : chaque email doit permettre de refuser facilement
  - Phrase implicite OK : "Si ca ne t'interesse pas, pas de souci — je ne te relancerai pas"
  - Lien de desinscription pas obligatoire en B2B (mais recommande)

### CAN-SPAM (US)
- **Identite expediteur** : le FROM doit identifier clairement l'expediteur (contact@mail.kopern.ai + "Thomas — Kopern")
- **Pas de subject trompeur** : le subject doit refleter le contenu
- **Adresse physique** : techniquement requise (PO Box OK) — pour le cold outreach initial, la mention du site web est generalement toleree
- **Opt-out** : doit etre honore sous 10 jours ouvrables
- **Pas d'obligation de consentement prealable** pour le B2B

### Bonnes pratiques Kopern
- Toujours inclure une phrase de sortie ("pas de souci si ca ne t'interesse pas")
- Maximum 3 emails par prospect (initial + 2 follow-ups)
- Espacement : J+3 entre chaque email
- Ne jamais revendre/partager les leads
- Supprimer les leads qui ont demande l'opt-out
- Logger les envois pour audit (date, destinataire, contenu)`,
    },
  ],
};

// ─── Extensions ──────────────────────────────────────────────────────

const EXTENSIONS: Record<string, Array<{ name: string; description: string; code: string; events: string[]; blocking: boolean }>> = {
  scout: [
    {
      name: "Lead counter",
      description: "Verifie que le Scout produit entre 5 et 15 leads",
      code: `
const output = context.assistantOutput || "";
try {
  const parsed = JSON.parse(output.match(/\\{[\\s\\S]*\\}/)?.[0] || "{}");
  const count = parsed.leads?.length || 0;
  if (count < 5) return { action: "warn", message: "Seulement " + count + " leads trouves — minimum 5 requis" };
  if (count > 15) return { action: "warn", message: count + " leads trouves — maximum 15, garde les meilleurs" };
  return { action: "continue", message: count + " leads qualifies" };
} catch { return { action: "continue" }; }
      `.trim(),
      events: ["after_response"],
      blocking: false,
    },
  ],
  editor: [
    {
      name: "Campaign summary check",
      description: "Verifie que l'Editor produit un campaign_summary",
      code: `
const output = context.assistantOutput || "";
try {
  const parsed = JSON.parse(output.match(/\\{[\\s\\S]*\\}/)?.[0] || "{}");
  if (!parsed.campaign_summary) return { action: "warn", message: "Pas de campaign_summary dans l'output" };
  if (!parsed.final_emails?.length) return { action: "warn", message: "Pas d'emails dans final_emails" };
  const rejected = parsed.final_emails.filter(e => e.status === "rejected").length;
  if (rejected > 0) return { action: "warn", message: rejected + " email(s) rejected — verifier les warnings" };
  return { action: "continue", message: "Campaign summary OK — " + parsed.final_emails.length + " emails traites" };
} catch { return { action: "continue" }; }
      `.trim(),
      events: ["after_response"],
      blocking: false,
    },
  ],
};

// ─── Main ────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding Outreach Squad skills & extensions...\n");
  console.log("User ID:", USER_ID);

  // Skills
  for (const [agentKey, skills] of Object.entries(SKILLS)) {
    const agentId = AGENTS[agentKey as keyof typeof AGENTS];
    console.log(`\n[${agentKey}] Adding ${skills.length} skills to ${agentId}...`);

    for (const skill of skills) {
      const ref = await db.collection(`users/${USER_ID}/agents/${agentId}/skills`).add({
        name: skill.name,
        description: skill.description,
        content: skill.content,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`  ✓ Skill "${skill.name}" → ${ref.id}`);
    }
  }

  // Extensions
  for (const [agentKey, extensions] of Object.entries(EXTENSIONS)) {
    const agentId = AGENTS[agentKey as keyof typeof AGENTS];
    console.log(`\n[${agentKey}] Adding ${extensions.length} extensions to ${agentId}...`);

    for (const ext of extensions) {
      const ref = await db.collection(`users/${USER_ID}/agents/${agentId}/extensions`).add({
        name: ext.name,
        description: ext.description,
        code: ext.code,
        events: ext.events,
        blocking: ext.blocking,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`  ✓ Extension "${ext.name}" → ${ref.id}`);
    }
  }

  console.log("\n✅ Done! Outreach Squad fully equipped.");
  console.log("\nSummary:");
  console.log("  Scout:      2 skills, 1 extension");
  console.log("  Analyst:    2 skills, 0 extensions");
  console.log("  Copywriter: 2 skills, 0 extensions");
  console.log("  Editor:     2 skills, 1 extension");
  console.log("  Grading:    4 suites (created via MCP)");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
