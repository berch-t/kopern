export const docsMarkdownFr = `
## Introduction

Kopern est une plateforme de création et d'évaluation d'agents IA. Elle vous permet de créer des agents IA métier personnalisés, de les valider grâce à des pipelines de notation déterministes, et de les exposer en tant que points d'accès API.

### Fonctionnalités clés

- **Support multi-modèle** — Anthropic, OpenAI, Google Gemini, Ollama (local)
- **Notation déterministe** — 6 types de critères pour valider les sorties des agents
- **Points d'accès API** — Exposez vos agents comme des services JSON-RPC avec authentification par clé
- **Temps réel** — Abonnements Firestore, chat en streaming SSE
- **Extensible** — Compétences, outils personnalisés et extensions

---

## Agents

Un agent est l'entité centrale dans Kopern. Il combine une configuration de modèle avec un prompt système, des compétences, des outils et des extensions.

### Créer un Agent

1. Naviguez vers **Agents** > **Nouvel Agent**
2. Remplissez la configuration :
   - **Nom** — Un identifiant lisible par un humain
   - **Description** — Ce que fait l'agent
   - **Domaine** — Catégorie (comptabilité, juridique, devops, support, ventes, etc.)
3. Sélectionnez le modèle :
   - **Fournisseur** — \`anthropic\`, \`openai\`, \`google\`, \`ollama\`
   - **ID du modèle** — ex. \`claude-sonnet-4-5-20250514\`, \`gpt-4o\`, \`gemini-2.0-flash\`
   - **Niveau de réflexion** — \`off\`, \`minimal\`, \`low\`, \`medium\`, \`high\`, \`xhigh\`
4. Rédigez le prompt système
5. Enregistrez — l'agent est créé à la version 1

### Configuration de l'Agent

\`\`\`typescript
interface AgentDoc {
  name: string;
  description: string;
  domain: string;
  systemPrompt: string;
  modelProvider: string;       // "anthropic" | "openai" | "google" | "ollama"
  modelId: string;
  thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  builtinTools: string[];      // ["read", "bash", ...]
  connectedRepos: string[];    // ["owner/repo-name", ...]
  version: number;
  isPublished: boolean;
  latestGradingScore: number | null;
}
\`\`\`

### Versionnage

Chaque agent possède un numéro de \`version\`. Lors de la publication, un instantané de la configuration actuelle est sauvegardé en tant que \`VersionDoc\`. Les exécutions de notation sont liées à des versions spécifiques afin de pouvoir suivre les régressions.

---

## Compétences

Les compétences sont des **blocs de connaissances réutilisables** injectés dans le prompt système de l'agent. Elles permettent de modulariser les instructions sans surcharger le prompt principal.

### Fonctionnement des Compétences

Les compétences sont des templates markdown stockés dans Firestore. Au moment de l'exécution, elles sont injectées dans le prompt système sous forme XML :

\`\`\`xml
<skills>
  <skill name="tone-guide">
    Always respond in a professional, concise manner.
    Use bullet points for lists.
  </skill>

  <skill name="code-review-checklist">
    When reviewing code, check for:
    - Security vulnerabilities (XSS, injection)
    - Performance issues
    - Code style consistency
    - Test coverage
  </skill>
</skills>
\`\`\`

### Créer une Compétence

1. Allez dans **Détail de l'Agent** > **Compétences**
2. Cliquez sur **Nouvelle Compétence**
3. Remplissez :
   - **Nom** — identifiant (utilisé dans la balise XML)
   - **Description** — ce que cette compétence apporte
   - **Contenu** — le contenu markdown/texte à injecter
4. Enregistrez — la compétence est immédiatement disponible dans l'agent

### Exemples de Compétences

**Guide de ton :**
\`\`\`markdown
You are a helpful assistant for a fintech company.
- Be concise and professional
- Use technical terms when appropriate
- Always cite relevant regulations when discussing compliance
\`\`\`

**Format de sortie :**
\`\`\`markdown
Always structure your responses as:
1. **Summary** — One-line answer
2. **Details** — Full explanation
3. **Next Steps** — Actionable recommendations
\`\`\`

---

## Outils

Les outils donnent à votre agent la capacité d'**exécuter des actions** pendant une conversation. Chaque outil possède un schéma JSON pour les paramètres et du code JavaScript pour l'exécution.

### Outils intégrés

Les agents disposent d'outils intégrés optionnels :
- \`read\` — Lire le contenu de fichiers
- \`bash\` — Exécuter des commandes shell

### Outils personnalisés

Vous pouvez définir des outils personnalisés avec :
- **Nom** — Identifiant de l'outil (appelé par le LLM)
- **Label** — Nom d'affichage
- **Description** — Ce que fait l'outil (affiché au LLM)
- **Schéma des paramètres** — Schéma JSON définissant les entrées attendues
- **Code d'exécution** — Corps de la fonction JavaScript

### Exemple de schéma d'outil

\`\`\`json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query"
    },
    "limit": {
      "type": "number",
      "description": "Maximum results to return",
      "default": 10
    }
  },
  "required": ["query"]
}
\`\`\`

### Exemple de code d'exécution d'outil

\`\`\`javascript
// The 'params' object contains the validated parameters
const response = await fetch(
  \\\`https://api.example.com/search?q=\\\${encodeURIComponent(params.query)}&limit=\\\${params.limit}\\\`
);
const data = await response.json();
return JSON.stringify(data.results);
\`\`\`

---

## Extensions

Les extensions sont des **modules TypeScript** qui se branchent sur les événements de l'agent pour ajouter des comportements personnalisés. Elles peuvent intercepter des messages, modifier les sorties, ajouter des commandes slash et persister l'état.

### Structure d'une Extension

\`\`\`typescript
// Extension code runs in a sandboxed environment
export default {
  name: "my-extension",
  description: "Adds custom behavior",
  enabled: true,

  // Called when the agent starts
  onAgentStart(context) {
    console.log("Agent started:", context.agentId);
  },

  // Called before each turn
  onTurnStart(context) {
    // Can modify the message before processing
  },

  // Called after each turn
  onTurnEnd(context, response) {
    // Can modify or log the response
  },
};
\`\`\`

### Cas d'utilisation

- **Journalisation** — Suivre toutes les interactions de l'agent
- **Filtrage de contenu** — Bloquer ou modifier les sorties non sûres
- **Commandes personnalisées** — Ajouter des commandes slash comme \`/reset\` ou \`/export\`
- **Gestion d'état** — Persister l'état de la conversation entre les sessions

---

## Playground

Le Playground est une **interface de chat en direct** pour tester votre agent. Il utilise les Server-Sent Events (SSE) pour le streaming en temps réel.

### Fonctionnalités

- **Streaming en temps réel** — Les tokens apparaissent au fur et à mesure que le LLM les génère
- **Rendu Markdown** — Les réponses de l'agent sont rendues avec un support markdown complet
- **Visualisation des appels d'outils** — Consultez quels outils l'agent appelle et leurs résultats
- **Historique des messages** — Le contexte complet de la conversation est maintenu
- **Indicateur de streaming** — Retour visuel pendant que l'agent réfléchit

### Comment ça fonctionne

\`\`\`text
User message → POST /api/agents/[agentId]/chat
                    ↓
              Build system prompt + inject skills
                    ↓
              streamLLM(provider, model, messages)
                    ↓
              SSE stream: status → token → token → ... → done
                    ↓
              Rendered in real-time in the UI
\`\`\`

### Conseils de test

1. Commencez par des requêtes simples pour vérifier que le prompt système fonctionne
2. Testez les cas limites qui devraient déclencher des compétences spécifiques
3. Vérifiez que les appels d'outils se produisent quand c'est attendu
4. Vérifiez que le niveau de réflexion produit une profondeur de raisonnement appropriée

---

## Notation

Le système de notation fournit une **validation déterministe** des sorties de l'agent. Il vous permet de créer des suites de tests, de définir des critères et de suivre la qualité dans le temps.

### Concepts

- **Suite** — Une collection de cas de test (ex. « Tests Support Client »)
- **Cas** — Un test individuel avec une entrée, un comportement attendu et des critères
- **Critère** — Une règle de validation spécifique avec un poids
- **Exécution** — L'exécution d'une suite, produisant des résultats et un score

### Types de critères

#### 1. Correspondance de sortie
Vérifie si la sortie de l'agent correspond à un motif.

\`\`\`json
{
  "type": "output_match",
  "config": {
    "pattern": "regex or substring",
    "mode": "contains"
  }
}
\`\`\`

#### 2. Validation de schéma
Valide la sortie par rapport à un schéma JSON (via ajv).

\`\`\`json
{
  "type": "schema_validation",
  "config": {
    "schema": {
      "type": "object",
      "required": ["summary", "recommendations"],
      "properties": {
        "summary": { "type": "string" },
        "recommendations": { "type": "array" }
      }
    }
  }
}
\`\`\`

#### 3. Utilisation des outils
Vérifie que des outils spécifiques ont été appelés pendant l'exécution.

\`\`\`json
{
  "type": "tool_usage",
  "config": {
    "requiredTools": ["search", "calculate"],
    "mode": "all"
  }
}
\`\`\`

#### 4. Contrôle de sécurité
Détecte les motifs dangereux dans la sortie (XSS, injection, etc.).

\`\`\`json
{
  "type": "safety_check",
  "config": {
    "checks": ["xss", "sql_injection", "prompt_injection"]
  }
}
\`\`\`

#### 5. Script personnalisé
Exécute une évaluation JavaScript arbitraire sur la sortie.

\`\`\`javascript
// 'output' is the agent's response string
// 'toolCalls' is an array of tool call records
// Return { passed: boolean, score: number, message: string }

const hasGreeting = output.toLowerCase().includes("hello");
const isShort = output.length < 500;

return {
  passed: hasGreeting && isShort,
  score: hasGreeting && isShort ? 1.0 : 0.0,
  message: hasGreeting ? "Greeting found" : "Missing greeting"
};
\`\`\`

#### 6. Juge LLM
Utilise un autre LLM pour évaluer la qualité de la sortie.

\`\`\`json
{
  "type": "llm_judge",
  "config": {
    "prompt": "Rate the following response for helpfulness and accuracy on a scale of 0-10.",
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250514"
  }
}
\`\`\`

### Calcul du score

Chaque critère possède un **poids**. Le score final est une moyenne pondérée :

\`\`\`text
score = Σ (criterion_score × criterion_weight) / Σ (criterion_weight)
\`\`\`

Un cas est réussi si **tous les critères sont validés**. Le score de la suite est la moyenne de tous les scores de cas.

### Exécuter une Suite

1. Allez dans **Détail de l'Agent** > **Notation**
2. Sélectionnez ou créez une suite de tests
3. Ajoutez des cas de test avec des critères
4. Cliquez sur **Exécuter** — chaque cas est exécuté contre l'agent
5. Consultez les résultats : scores par cas, détails des critères, sortie de l'agent

---

## Serveurs MCP

Les serveurs MCP (Model Context Protocol) vous permettent d'**exposer vos agents comme des points d'accès API** que des applications externes peuvent appeler.

### Architecture

\`\`\`
External App → POST /api/mcp (Bearer token)
                    ↓
              Hash API key → lookup apiKeys/{hash}
                    ↓
              Validate: enabled? rate limit?
                    ↓
              Load agent config + skills
                    ↓
              Build system prompt → call LLM
                    ↓
              Count tokens → track usage
                    ↓
              JSON-RPC response
\`\`\`

### Créer un Serveur

1. Allez dans **Détail de l'Agent** > **Serveurs MCP**
2. Cliquez sur **Nouveau Serveur**
3. Entrez un **nom** et une **description**
4. Copiez la clé API (affichée une seule fois !)

### Sécurité des clés API

- Les clés sont préfixées par \`kpn_\` suivi de 32 octets hexadécimaux aléatoires
- Seul le **hash SHA-256** est stocké dans Firestore
- Le \`apiKeyPrefix\` (12 premiers caractères) est conservé pour l'affichage
- Les clés sont recherchées via une collection de niveau supérieur \`apiKeys/{hash}\` (O(1))
- La clé en clair est retournée **une seule fois** à la création et **n'est jamais stockée**

### Point d'accès JSON-RPC

**URL :** \`POST /api/mcp\`

**En-têtes :**
\`\`\`
Authorization: Bearer kpn_your_api_key_here
Content-Type: application/json
\`\`\`

#### Méthode : \`initialize\`

Retourne les métadonnées de l'agent.

\`\`\`json
// Request
{"jsonrpc": "2.0", "method": "initialize", "id": 1}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "name": "My Agent",
    "description": "A helpful assistant",
    "model": {"provider": "anthropic", "id": "claude-sonnet-4-5-20250514"}
  },
  "id": 1
}
\`\`\`

#### Méthode : \`completion/create\`

Envoie un message et retourne la réponse complète.

\`\`\`json
// Request
{
  "jsonrpc": "2.0",
  "method": "completion/create",
  "params": {
    "message": "Analyze this code for security issues",
    "history": [
      {"role": "user", "content": "Hello"},
      {"role": "assistant", "content": "Hi! How can I help?"}
    ]
  },
  "id": 2
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "content": "I'll analyze the code for security vulnerabilities...",
    "usage": {"inputTokens": 245, "outputTokens": 512}
  },
  "id": 2
}
\`\`\`

### Suivi d'utilisation

L'utilisation est suivie par mois avec des incréments atomiques (pas de lecture avant écriture) :
- **inputTokens** — Estimation du nombre de tokens en entrée
- **outputTokens** — Estimation du nombre de tokens en sortie
- **requestCount** — Nombre d'appels API
- **lastRequestAt** — Horodatage de la dernière requête

### Limitation de débit

Chaque serveur dispose d'un paramètre \`rateLimitPerMinute\` (par défaut : 60). Configurez-le par serveur en fonction de vos besoins.

### Exemples cURL

**Bash / Linux / macOS :**
\`\`\`bash
curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer kpn_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"completion/create","params":{"message":"Hello"},"id":1}'
\`\`\`

**PowerShell :**
\`\`\`powershell
Invoke-WebRequest -Uri "https://your-domain.com/api/mcp" \`
  -Method POST -UseBasicParsing \`
  -Headers @{"Authorization"="Bearer kpn_your_key";"Content-Type"="application/json"} \`
  -Body '{"jsonrpc":"2.0","method":"completion/create","params":{"message":"Hello"},"id":1}'
\`\`\`

---

## Configuration

### Variables d'environnement

\`\`\`bash
# Firebase Client (public, utilisé dans le navigateur)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (côté serveur uniquement, pour les routes API)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"

# Clés API LLM (ajoutez les fournisseurs que vous utilisez)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AI...
OLLAMA_BASE_URL=http://localhost:11434
\`\`\`

### Règles de sécurité Firestore

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Refus par défaut
    match /{document=**} { allow read, write: if false; }

    // Clés API — admin SDK uniquement
    match /apiKeys/{keyHash} { allow read, write: if false; }

    // Données utilisateur — propriétaire uniquement
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      match /agents/{agentId} {
        allow read, write: if request.auth.uid == userId;
        // + skills, tools, extensions, versions, gradingSuites, mcpServers
        // Sous-collection usage : lecture seule pour le propriétaire
      }
    }
  }
}
\`\`\`

### Authentification

Kopern prend en charge trois méthodes d'authentification via Firebase :
- **Google OAuth** — Connexion en un clic
- **GitHub OAuth** — Adaptée aux développeurs
- **Email/Mot de passe** — Inscription traditionnelle

---

## Internationalisation (i18n)

Kopern prend en charge **le français et l'anglais** avec un système i18n léger et personnalisé — sans bibliothèque lourde.

### Fonctionnement

Toutes les routes vivent sous \`src/app/[locale]/\` où \`locale\` est \`en\` ou \`fr\`. Un middleware détecte la locale préférée depuis :
1. Le préfixe de l'URL (\`/en/...\` ou \`/fr/...\`)
2. Le cookie \`NEXT_LOCALE\`
3. L'en-tête \`Accept-Language\` du navigateur
4. Par défaut : \`en\`

### Fichiers Clés

| Fichier | Rôle |
|---------|------|
| \`src/i18n/config.ts\` | Définitions de type de locale (\`"en" | "fr"\`) |
| \`src/i18n/getDictionary.ts\` | Chargeur asynchrone de dictionnaire via import dynamique |
| \`src/i18n/dictionaries/en.json\` | Chaînes anglaises (~350 clés) |
| \`src/i18n/dictionaries/fr.json\` | Chaînes françaises |
| \`src/providers/LocaleProvider.tsx\` | Contexte React : \`useLocale()\`, \`useDictionary()\` |
| \`src/hooks/useLocalizedRouter.ts\` | Routeur avec \`push\`/\`replace\`/\`back\` préfixés par la locale |
| \`src/components/LocalizedLink.tsx\` | Wrapper \`<Link>\` qui préfixe \`/\${locale}\` |
| \`src/components/layout/LocaleSwitcher.tsx\` | Sélecteur EN/FR dans l'en-tête |
| \`src/middleware.ts\` | Détection de locale + redirection |

### Utilisation dans les Composants

\`\`\`tsx
// Accéder aux chaînes traduites
const t = useDictionary();
<h1>{t.dashboard.title}</h1>

// Navigation avec locale
const router = useLocalizedRouter();
router.push("/agents"); // devient /en/agents ou /fr/agents

// Liens avec locale
<LocalizedLink href="/pricing">Tarifs</LocalizedLink>
\`\`\`

### Structure du Dictionnaire

Les dictionnaires sont organisés par section : \`common\`, \`landing\`, \`nav\`, \`auth\`, \`dashboard\`, \`agents\`, \`skills\`, \`tools\`, \`extensions\`, \`playground\`, \`grading\`, \`mcp\`, \`examples\`, \`pricing\`, \`docs\`, \`settings\`, \`apiKeys\`, \`github\`, \`integrations\`, \`breadcrumbs\`.

### Groupes de Routes

| Groupe | Chemin | Auth | Layout |
|--------|--------|------|--------|
| \`(dashboard)\` | \`/[locale]/(dashboard)/...\` | Requise | Sidebar + Header |
| \`(auth)\` | \`/[locale]/(auth)/login\` | Aucune | Carte centrée |
| \`(public)\` | \`/[locale]/(public)/examples\` | Aucune | Navbar publique + footer |
| Racine | \`/[locale]/\`, \`/[locale]/pricing\` | Aucune | Autonome |

---

## Intégration GitHub

Kopern fournit une **intégration GitHub native** pour que les agents puissent accéder à vos dépôts de code.

### Fonctionnement

1. **Authentification** — Lors de la connexion avec GitHub, le flux OAuth demande le scope \`repo\`. Le token d'accès est capturé et stocké dans le document Firestore de l'utilisateur.
2. **Connexion de dépôt** — Sur la page de détail de tout agent, cliquez sur **Connecter un Repo** pour parcourir vos dépôts et sélectionner ceux auxquels l'agent peut accéder.
3. **Stockage** — Les dépôts connectés sont stockés en tant que \`connectedRepos: string[]\` sur le \`AgentDoc\` (ex. \`["owner/repo-name"]\`).

### Architecture

\`\`\`text
GitHub OAuth (login) → capture accessToken → stocké dans users/{uid}.githubAccessToken
                                                        ↓
Détail Agent → "Connecter un Repo" → GET /api/github/repos (admin SDK lit le token)
                                                        ↓
                                API GitHub → lister les repos de l'utilisateur → afficher dans le dialog
                                                        ↓
                                L'utilisateur sélectionne → mise à jour agent.connectedRepos[]
\`\`\`

### Route API

\`GET /api/github/repos\` — Liste les dépôts GitHub de l'utilisateur authentifié.

**En-têtes :**
\`\`\`
Authorization: Bearer <firebase-id-token>
\`\`\`

**Réponse :**
\`\`\`json
{
  "repos": [
    {
      "fullName": "owner/repo-name",
      "name": "repo-name",
      "owner": "owner",
      "description": "Une description",
      "private": false,
      "language": "TypeScript",
      "updatedAt": "2025-01-15T...",
      "defaultBranch": "main"
    }
  ]
}
\`\`\`

### Stratégie d'Intégration

- **GitHub** — Intégration native de premier ordre (OAuth intégré, sélecteur de dépôts, connexion au niveau de l'agent)
- **Autres services** (Slack, Jira, AWS, Notion...) — Connectez-les via des **connecteurs MCP**. L'infrastructure MCP de Kopern supporte tout serveur MCP externe, la rendant infiniment extensible sans construire d'intégrations personnalisées pour chaque service.

---

## Tarification

Kopern propose trois niveaux de tarification accessibles depuis la page publique \`/pricing\`.

### Niveaux

| | Starter (Gratuit) | Pro (79$/mois) | Enterprise (499$/mois) |
|---|---|---|---|
| Agents | 2 | 25 | Illimité |
| Tokens/mois | 10K | 1M | 10M |
| Endpoints MCP | 1 | 10 | Illimité |
| Exécutions de notation/mois | 5 | 100 | Illimité |
| Modèles | Sonnet uniquement | Tous | Tous + fine-tunés |
| Support | Communauté | Email prioritaire | Dédié + SLA |
| SSO | — | — | Oui |
| Journaux d'audit | — | — | Oui |
| Historique des versions | — | Oui | Oui |
| Traitement par lots | — | Oui | Oui |

La tarification annuelle économise 17% (790$/an pour Pro, 4 990$/an pour Enterprise).

### Galerie d'Exemples

La page \`/examples\` présente 15 configurations d'agents prêtes pour la production. Chacune inclut un prompt système, des compétences, des outils, une intégration MCP et une suite de notation. Les exemples sont entièrement traduits en français et en anglais.

Le bouton **« Utiliser cet Agent »** crée un vrai agent (avec toutes les compétences et outils) à partir du template d'exemple. Les utilisateurs non authentifiés sont redirigés vers la page de connexion.

---

## Flux de travail

### Flux de développement recommandé

\`\`\`text
1. Créer l'Agent
   └── Définir le nom, le domaine, le modèle, le prompt système

2. Ajouter des Compétences
   └── Modulariser les instructions (ton, format, connaissances métier)

3. Ajouter des Outils personnalisés (optionnel)
   └── Donner des capacités à l'agent (appels API, calculs)

4. Tester dans le Playground
   └── Itérer sur le prompt et les compétences jusqu'à obtenir le comportement correct

5. Créer une Suite de Notation
   └── Définir des cas de test avec des critères

6. Exécuter la Notation
   └── Valider de manière déterministe, vérifier le score

7. Itérer (étapes 2-6)
   └── Améliorer jusqu'à ce que le score de notation atteigne le seuil

8. Publier la Version
   └── Capturer un instantané de la configuration actuelle

9. Déployer comme Serveur MCP
   └── Créer le point d'accès API, distribuer la clé

10. Surveiller l'Utilisation
    └── Suivre les tokens, les requêtes, les erreurs
\`\`\`

### Bonnes pratiques

- **Commencez par le prompt système** — Obtenez d'abord le comportement de base correct
- **Utilisez les compétences pour les motifs réutilisables** — Ne répétez pas les instructions d'un agent à l'autre
- **Rédigez des cas de notation pour les cas limites** — Testez les modes d'échec, pas seulement les cas nominaux
- **Utilisez le Juge LLM avec parcimonie** — Préférez les critères déterministes quand c'est possible
- **Définissez des limites de débit appropriées** — Adaptez-les aux volumes de trafic attendus
- **Régénérez les clés périodiquement** — Effectuez une rotation des clés API pour la sécurité
- **Versionnez avant de publier** — Ayez toujours un point de retour en arrière

---

## Exemples

### Exemple 1 : Agent de Support Client

**Prompt système :**
\`\`\`text
You are a customer support agent for an e-commerce platform.
You help customers with order tracking, returns, and product questions.
Always be polite, empathetic, and solution-oriented.
If you don't know the answer, escalate to a human agent.
\`\`\`

**Compétences :**
- \`tone-guide\` — Ton professionnel et empathique
- \`return-policy\` — Détails de la politique de retour de l'entreprise
- \`escalation-rules\` — Quand escalader vers un humain

**Cas de notation :**
\`\`\`text
Input: "I want to return my order, it arrived damaged"
Expected: Apologize, ask for order number, explain return process
Criteria:
  - output_match: contains "sorry" or "apologize" (weight: 0.3)
  - output_match: asks for order number (weight: 0.3)
  - safety_check: no harmful content (weight: 0.2)
  - llm_judge: helpful and empathetic (weight: 0.2)
\`\`\`

### Exemple 2 : Agent de Revue de Code

**Prompt système :**
\`\`\`text
You are an expert code reviewer. When given code:
1. Identify security vulnerabilities
2. Check for performance issues
3. Suggest improvements
4. Rate overall quality (1-10)

Always output structured JSON with your analysis.
\`\`\`

**Outils :**
- \`analyze_complexity\` — Calculer la complexité cyclomatique
- \`check_dependencies\` — Vérifier les versions des dépendances

**Cas de notation :**
\`\`\`text
Input: "Review this function: function login(user, pass) { db.query('SELECT * FROM users WHERE name='+user) }"
Criteria:
  - output_match: mentions "SQL injection" (weight: 0.4)
  - schema_validation: output is valid JSON with "vulnerabilities" array (weight: 0.3)
  - tool_usage: calls analyze_complexity (weight: 0.1)
  - safety_check: no harmful code in output (weight: 0.2)
\`\`\`

### Exemple 3 : Intégration MCP

**Client Node.js :**
\`\`\`javascript
const response = await fetch("https://your-domain.com/api/mcp", {
  method: "POST",
  headers: {
    "Authorization": "Bearer kpn_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "completion/create",
    params: { message: "Analyze this pull request..." },
    id: 1,
  }),
});

const { result } = await response.json();
console.log(result.content);
console.log(\\\`Tokens used: \\\${result.usage.inputTokens + result.usage.outputTokens}\\\`);
\`\`\`

**Client Python :**
\`\`\`python
import requests

response = requests.post(
    "https://your-domain.com/api/mcp",
    headers={
        "Authorization": "Bearer kpn_your_api_key",
        "Content-Type": "application/json",
    },
    json={
        "jsonrpc": "2.0",
        "method": "completion/create",
        "params": {"message": "Summarize this document..."},
        "id": 1,
    },
)

result = response.json()["result"]
print(result["content"])
\`\`\`

---

## Personnalisation

### Thèmes

Kopern utilise des **couleurs OKLch** avec des variables CSS. Basculez entre le mode clair et sombre depuis l'en-tête ou la page d'accueil. Le thème est persisté dans le \`localStorage\`.

### Ajouter des composants UI

Kopern utilise shadcn/ui. Pour ajouter de nouveaux composants :

\`\`\`bash
npx shadcn@latest add [component-name]
\`\`\`

Disponibles mais pas encore installés : \`switch\`, \`checkbox\`, \`radio-group\`, \`progress\`, \`slider\`, \`alert\`, \`avatar\`, \`popover\`, \`command\`, \`table\`.

### Structure du projet

\`\`\`text
src/
├── actions/         # Mutations Firestore côté client
├── app/
│   ├── [locale]/    # Toutes les routes localisées
│   │   ├── (auth)/  # Page de connexion
│   │   ├── (dashboard)/  # Protégé : agents, docs, paramètres...
│   │   ├── (public)/     # Public : exemples
│   │   ├── pricing/      # Page tarifs publique
│   │   └── page.tsx      # Page d'accueil
│   └── api/         # Routes API côté serveur
│       ├── agents/  # Chat SSE, notation
│       ├── github/  # Proxy repos GitHub
│       ├── mcp/     # Endpoint JSON-RPC + gestion des clés
│       └── health/
├── components/      # Composants React
│   ├── ui/          # Primitives shadcn/ui
│   ├── agents/      # AgentCard, AgentForm, GitHubConnector
│   ├── docs/        # docs-content, docs-content-fr, TableOfContents
│   ├── grading/     # Interface de notation
│   ├── mcp/         # Composants serveurs MCP
│   ├── motion/      # Wrappers d'animation
│   └── layout/      # Sidebar, Header, Breadcrumbs, LocaleSwitcher
├── data/            # Exemples d'use-cases + traductions françaises
├── hooks/           # useAuth, useFirestore, useSSE, useLocalizedRouter, useLocalizedUseCases
├── i18n/            # config, getDictionary, dictionaries/{en,fr}.json
├── lib/             # Bibliothèques principales
│   ├── firebase/    # Schéma Firestore, auth (+scope GitHub), SDK admin
│   ├── grading/     # Moteur de notation + critères
│   ├── llm/         # Client streaming multi-fournisseur
│   └── mcp/         # Auth par clé API + comptage de tokens
└── providers/       # AuthProvider, ThemeProvider, LocaleProvider
\`\`\`
`;
