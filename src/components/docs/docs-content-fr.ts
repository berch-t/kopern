export const docsMarkdownFr = `
## Introduction

Kopern est une plateforme de construction, d'orchestration et d'evaluation d'agents IA. Creez des agents personnalises, validez-les avec une notation deterministe, optimisez-les dans un Labo d'Optimisation a 6 modes, orchestrez des equipes multi-agents et deployez-les partout — en serveurs MCP, widgets integrables, webhooks ou bots Slack. Le tout depuis un seul tableau de bord avec facturation Stripe et observabilite en temps reel.

### Ce que vous pouvez faire

- **Construire des agents** pour tout domaine — support, juridique, DevOps, ventes, finance, RH, etc.
- **Assistant IA** — decrivez votre agent en langage naturel, obtenez un agent entierement configure genere par l'IA
- **Connecter votre code** — les agents peuvent lire, rechercher et ecrire dans vos depots GitHub
- **Valider la qualite** — executez des suites de tests avec 6 types de criteres (notation deterministe)
- **Optimiser automatiquement** — Labo d'Optimisation a 6 modes : AutoTune, AutoFix, Stress Lab, Tournoi, Distillation, Evolution
- **Orchestrer des equipes** — execution multi-agents parallele, sequentielle ou conditionnelle avec pipelines et delegation de sous-agents
- **Deployer partout** — protocole MCP (Claude Code, Cursor), widget de chat integrable, webhooks (n8n, Zapier, Make), bot Slack
- **Automatiser des workflows** — webhooks entrants/sortants avec protection anti-boucle pour une integration transparente avec les plateformes externes
- **Tout suivre** — sessions, chronologie des conversations, utilisation de tokens, couts, facturation Stripe avec compteurs d'utilisation
- **Securise par conception** — execution sandboxee, signatures HMAC pour les webhooks, cles API hashees, application des limites de plan sur toutes les routes

---

## Demarrage rapide

### 1. Creer votre premier agent

1. Allez dans **Agents** et cliquez sur **Nouvel Agent**
2. Donnez-lui un **nom**, une **description** et selectionnez un **domaine**
3. Choisissez votre **fournisseur** et **modele** :
   - Anthropic (Claude Sonnet, Claude Opus)
   - OpenAI (GPT-4o, GPT-4.1)
   - Google (Gemini 2.0 Flash, Gemini 2.5 Pro)
   - Ollama (tout modele local)
4. Redigez un **prompt systeme** — il definit la personnalite et le comportement de l'agent
5. Enregistrez — votre agent est pret a tester !

### 2. Ajouter des competences

Les competences sont des blocs de connaissances reutilisables injectes dans le prompt systeme. Pensez-y comme des instructions modulaires.

Allez dans l'onglet **Competences** de votre agent et creez des competences pour :
- **Ton et style** — comment l'agent communique
- **Connaissances metier** — regles, procedures ou politiques specifiques
- **Format de sortie** — reponses structurees (JSON, markdown, listes)

### 3. Ajouter des outils personnalises

Les outils permettent a votre agent d'executer des actions pendant les conversations — appeler des API, interroger des bases de donnees, effectuer des calculs.

Allez dans l'onglet **Outils** de votre agent et definissez :
- **Nom** — comment l'agent appelle l'outil
- **Description** — ce que fait l'outil (l'agent lit ceci pour decider quand l'utiliser)
- **Parametres** — Schema JSON definissant les entrees attendues
- **Code d'execution** — JavaScript execute quand l'outil est appele

### 4. Tester dans le Playground

Ouvrez l'onglet **Playground** pour discuter avec votre agent en temps reel :
- Voyez les tokens apparaitre au fur et a mesure
- Observez les appels d'outils en direct avec arguments et resultats
- Suivez l'utilisation de tokens et le cout dans la barre de metriques
- Cliquez sur **Voir la session** pour consulter l'historique complet

### 5. Valider avec la notation

Creez une **Suite de Notation** pour tester automatiquement la qualite de votre agent :
1. Definissez des cas de test avec des entrees specifiques
2. Ajoutez des criteres (correspondance, validation de schema, securite, etc.)
3. Executez la suite — chaque cas est teste et note
4. Iterez jusqu'a atteindre votre seuil de qualite

### 6. Optimiser avec AutoResearch

Une fois votre suite de notation configuree, laissez AutoResearch ameliorer automatiquement votre agent :
1. Allez dans l'onglet **Optimiser**
2. Selectionnez votre suite de notation et lancez **AutoTune** pour ameliorer iterativement le prompt systeme
3. Utilisez **Stress Lab** pour trouver des vulnerabilites, **Tournoi** pour comparer les modeles, ou **Evolution** pour l'optimisation multi-dimensionnelle
4. Appliquez le meilleur resultat en un clic

### 7. Deployer en API

Creez un **Serveur MCP** pour exposer votre agent comme API :
1. Allez dans l'onglet **Serveurs MCP** de votre agent
2. Creez un nouveau serveur et copiez la cle API
3. Appelez l'endpoint JSON-RPC depuis n'importe quelle application

---

## Agents

### Options de configuration

| Parametre | Description |
|-----------|-------------|
| **Nom** | Identifiant lisible |
| **Description** | Ce que fait l'agent |
| **Domaine** | Categorie (DevOps, Juridique, Support, Ventes, Finance, RH, etc.) |
| **Fournisseur** | Anthropic, OpenAI, Google, Mistral AI ou Ollama |
| **Modele** | Modele specifique (ex: claude-sonnet-4-6, gpt-4o, gemini-2.5-pro, mistral-large-latest) |
| **Niveau de reflexion** | Controle la profondeur de raisonnement : off, minimal, low, medium, high, xhigh |
| **Prompt systeme** | Les instructions principales qui definissent le comportement |
| **Repos connectes** | Depots GitHub que l'agent peut lire et rechercher |

### Versionnage

Chaque publication d'agent sauvegarde un instantane de version. Les runs de notation sont lies a des versions specifiques pour suivre les ameliorations ou regressions.

### Integration GitHub

Connectez vos depots GitHub pour que les agents puissent :
- **Lire des fichiers** — acceder a tout fichier dans les repos connectes
- **Rechercher des fichiers** — trouver des fichiers par motif de nom
- **Comprendre le contexte** — l'arborescence et le README sont automatiquement inclus

Pour connecter un repo :
1. Connectez-vous avec GitHub (accorde le scope \`repo\`)
2. Sur la page detail de l'agent, cliquez sur **Connecter un Repo**
3. Selectionnez les depots auxquels l'agent peut acceder

---

## Competences

Les competences sont des **blocs d'instructions modulaires** injectes dans le contexte de l'agent a l'execution. Elles permettent de separer les preoccupations et de reutiliser les connaissances.

### Fonctionnement

Quand votre agent s'execute, toutes les competences actives sont encapsulees en XML et ajoutees au prompt systeme :

\`\`\`xml
<skills>
  <skill name="guide-de-ton">
    Repondez toujours de maniere professionnelle et concise.
    Utilisez des listes a puces.
  </skill>
  <skill name="regles-escalade">
    Escaladez vers un agent humain quand :
    - Le client demande un remboursement de plus de 500 euros
    - Des questions juridiques se posent
    - Le client exprime sa frustration 3 fois ou plus
  </skill>
</skills>
\`\`\`

### Bonnes pratiques

- **Gardez les competences ciblees** — une competence par sujet
- **Redigez des instructions claires** — le LLM suit les competences a la lettre
- **Testez avec la notation** — verifiez que les competences produisent le comportement attendu
- **Reutilisez entre agents** — les competences peuvent etre copiees via la galerie d'Exemples

---

## Outils

Les outils permettent a votre agent d'**executer des actions** pendant une conversation — appeler des API, interroger des bases de donnees, effectuer des calculs ou interagir avec des services externes.

### Outils integres

Quand vous connectez des depots GitHub, deux outils sont automatiquement disponibles :

| Outil | Description |
|-------|-------------|
| **read_file** | Lire le contenu de tout fichier dans un depot connecte |
| **search_files** | Rechercher des fichiers par motif de nom dans les repos |

### Outils personnalises

Creez vos propres outils avec :

- **Nom** — identifiant utilise par le LLM pour appeler l'outil
- **Description** — explique ce que fait l'outil (le LLM lit ceci pour decider quand l'utiliser)
- **Schema des parametres** — Schema JSON definissant les entrees attendues

\`\`\`json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Requete de recherche" },
    "limit": { "type": "number", "description": "Resultats max", "default": 10 }
  },
  "required": ["query"]
}
\`\`\`

- **Code d'execution** — JavaScript execute quand l'outil est appele

\`\`\`javascript
const response = await fetch(
  \\\`https://api.example.com/search?q=\\\${encodeURIComponent(params.query)}\\\`
);
const data = await response.json();
return JSON.stringify(data.results);
\`\`\`

### Flux d'appel d'outil

Quand l'agent decide d'utiliser un outil :
1. Le LLM genere un appel d'outil avec des arguments
2. Kopern execute le code de l'outil avec ces arguments
3. Le resultat est renvoye au LLM
4. Le LLM utilise le resultat pour formuler sa reponse
5. Cela peut se repeter jusqu'a 10 iterations par tour

---

## Extensions

Les extensions sont des **hooks d'evenements** qui interceptent et modifient le comportement de l'agent au runtime. Elles se declenchent sur des evenements specifiques du cycle de vie de l'agent — du demarrage de session a l'execution de tools, l'orchestration d'equipes, et bien plus.

### Creer une Extension

1. Allez dans l'onglet **Extensions** de votre agent
2. Cliquez sur **Ajouter une Extension**
3. Remplissez le **Nom** et la **Description**
4. Selectionnez un ou plusieurs **Evenements** — ils determinent quand votre code s'execute
5. Activez **Bloquant** si votre extension doit pouvoir empecher des actions
6. Ecrivez votre **Code** — du JavaScript qui s'execute quand les evenements selectionnes se declenchent

### Fonctionnement du Code

Votre code a acces a :
- \`context.eventType\` — l'evenement qui a declenche l'extension (ex: \`"tool_call_start"\`)
- \`context.data\` — les donnees specifiques a l'evenement (nom du tool, arguments, resultats, erreurs...)
- \`log(message)\` — afficher un message de debug
- \`blocked = true\` — (extensions bloquantes uniquement) empecher l'action de se poursuivre
- \`blockReason = "..."\` — expliquer pourquoi l'action a ete bloquee

### Cas d'utilisation

- **Journalisation** — suivre les interactions pour la conformite ou le debug
- **Filtrage de contenu** — bloquer ou modifier les sorties non securisees
- **Garde-fous** — appliquer des regles metier, bloquer les commandes dangereuses
- **Controle des couts** — arreter l'execution quand le cout depasse un seuil
- **Notifications** — journaliser les evenements importants (creation de PR, erreurs)

### Reference des Evenements

Les evenements sont groupes par categorie. Les **evenements bloquants** (marques d'une icone bouclier) peuvent empecher l'action quand une extension definit \`blocked = true\`.

#### Cycle de vie Session

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`session_start\` | Declenche quand une nouvelle session demarre | \`{ sessionId, purpose }\` |
| \`session_end\` | Declenche quand une session se termine | \`{ sessionId, totalTokens, totalCost }\` |
| \`session_compact\` | Declenche quand le contexte est compacte (conversations longues) | \`{ sessionId, messageCount }\` |

#### Cycle de vie Message

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`message_start\` | Declenche avant que le LLM traite un message utilisateur | \`{ role, content }\` |
| \`message_end\` | Declenche apres la reponse du LLM | \`{ role, content, tokensUsed }\` |
| \`message_stream_token\` | Declenche pour chaque token streame (haute frequence) | \`{ token }\` |

#### Cycle de vie Tool

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`tool_call_start\` | Declenche avant l'execution d'un tool | \`{ toolName, args }\` |
| \`tool_call_end\` | Declenche apres l'execution reussie d'un tool | \`{ toolName, result, isError }\` |
| \`tool_call_error\` | Declenche quand l'execution d'un tool echoue | \`{ toolName, error }\` |
| \`tool_call_blocked\` | **Bloquant** — peut empecher l'execution d'un tool | \`{ toolName, args }\` |

> **Exemple :** Bloquer les commandes shell dangereuses en verifiant \`context.data.toolName === "bash"\` et en inspectant \`context.data.args.command\` pour des patterns comme \`rm -rf\`.

#### Cycle de vie Agent

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`agent_thinking_start\` | Declenche quand le LLM commence sa phase de raisonnement | \`{}\` |
| \`agent_thinking_end\` | Declenche quand le raisonnement se termine | \`{ thinkingContent }\` |
| \`agent_response_start\` | Declenche quand le LLM commence a generer sa reponse | \`{}\` |
| \`agent_response_end\` | Declenche quand la generation de reponse se termine | \`{ responseLength }\` |

#### Cycle de vie Sub-agent

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`sub_agent_spawn\` | Declenche quand un sub-agent recoit une delegation | \`{ subAgentId, task }\` |
| \`sub_agent_result\` | Declenche quand un sub-agent retourne son resultat | \`{ subAgentId, result }\` |
| \`sub_agent_error\` | Declenche quand un sub-agent rencontre une erreur | \`{ subAgentId, error }\` |

#### Cycle de vie Pipeline

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`pipeline_start\` | Declenche quand un pipeline demarre | \`{ pipelineId, stepCount }\` |
| \`pipeline_step_start\` | Declenche avant chaque etape du pipeline | \`{ pipelineId, stepIndex, stepName }\` |
| \`pipeline_step_end\` | Declenche apres chaque etape | \`{ pipelineId, stepIndex, result }\` |
| \`pipeline_end\` | Declenche quand le pipeline entier se termine | \`{ pipelineId, totalSteps }\` |

#### Cycle de vie Equipe

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`team_execution_start\` | Declenche quand une equipe demarre l'execution | \`{ teamId, memberCount }\` |
| \`team_member_start\` | Declenche avant l'execution de chaque membre | \`{ teamId, memberId, memberName }\` |
| \`team_member_end\` | Declenche apres l'execution d'un membre | \`{ teamId, memberId, result }\` |
| \`team_execution_end\` | Declenche quand tous les membres ont termine | \`{ teamId, results }\` |

#### Interaction Utilisateur

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`user_input\` | **Bloquant** — declenche quand l'utilisateur envoie un message | \`{ content }\` |
| \`user_confirm\` | Declenche quand l'utilisateur confirme une action | \`{ action }\` |
| \`user_deny\` | Declenche quand l'utilisateur refuse une action | \`{ action }\` |

#### Systeme

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`error\` | Declenche sur toute erreur non geree | \`{ message, stack }\` |
| \`context_limit_warning\` | Declenche quand la fenetre de contexte approche la limite | \`{ usagePercent }\` |
| \`cost_limit_warning\` | **Bloquant** — declenche quand le cout approche la limite | \`{ totalCost, limit }\` |

> **Exemple :** Definir un plafond de cout en ecoutant \`cost_limit_warning\` et en mettant \`blocked = true\` quand \`context.data.totalCost > 5.0\`.

#### AutoResearch

| Evenement | Description | \`context.data\` |
|-----------|-------------|-----------------|
| \`autoresearch_run_start\` | Declenche quand un run d'optimisation AutoResearch demarre | \`{ mode, suiteId }\` |
| \`autoresearch_iteration_start\` | Declenche avant chaque iteration d'optimisation | \`{ iteration, totalIterations }\` |
| \`autoresearch_iteration_end\` | Declenche apres chaque iteration avec les resultats | \`{ iteration, score, improved }\` |
| \`autoresearch_mutation\` | Declenche quand une mutation de prompt est appliquee | \`{ mutationType, diff }\` |
| \`autoresearch_run_end\` | Declenche quand le run d'optimisation se termine | \`{ bestScore, totalIterations }\` |

### Exemples de Code

**Journaliser tous les appels de tools :**
\`\`\`javascript
log("[" + context.eventType + "] " + (context.data.toolName || ""));
\`\`\`

**Bloquer les commandes bash dangereuses (bloquant, sur \`tool_call_blocked\`) :**
\`\`\`javascript
if (context.data.toolName === "bash") {
  var cmd = String(context.data.args.command || "");
  if (/rm\\s+-rf/i.test(cmd) || /drop\\s+table/i.test(cmd)) {
    blocked = true;
    blockReason = "Commande dangereuse bloquee : " + cmd;
  }
}
\`\`\`

**Garde-fou de cout (bloquant, sur \`cost_limit_warning\`) :**
\`\`\`javascript
var maxCost = 5.0;
if (context.data.totalCost > maxCost) {
  blocked = true;
  blockReason = "Limite de cout depassee : $" + context.data.totalCost.toFixed(2);
}
\`\`\`

---

## Playground

Le Playground est votre **environnement de test en direct**. Discutez avec votre agent et voyez tout en temps reel.

### Fonctionnalites

| Fonctionnalite | Description |
|----------------|-------------|
| **Streaming** | Les tokens apparaissent au fur et a mesure de la generation |
| **Visualisation d'outils** | Voyez les appels d'outils, arguments et resultats en direct |
| **Rendu Markdown** | Les reponses sont affichees avec formatage complet |
| **Barre de metriques** | Suivez tokens in/out, cout et appels d'outils |
| **Lien session** | Cliquez pour voir l'historique complet de la conversation |
| **Continuite de session** | Plusieurs messages partagent la meme session |

### Conseils de test

1. **Commencez simple** — verifiez que le prompt systeme fonctionne
2. **Testez les cas limites** — essayez des entrees qui devraient declencher des competences ou outils
3. **Verifiez les appels d'outils** — assurez-vous que l'agent utilise les outils quand c'est approprie
4. **Iterez rapidement** — modifiez le prompt/competences, puis testez immediatement

---

## Notation

Le systeme de notation fournit une **validation automatisee** de la qualite de vos agents. Construisez des suites de tests, executez-les et suivez les scores.

### Concepts

| Terme | Description |
|-------|-------------|
| **Suite** | Collection de cas de test (ex: "Tests Support Client") |
| **Cas** | Un test avec un message d'entree et des criteres de validation |
| **Critere** | Une regle de validation specifique avec un poids |
| **Run** | Une execution de la suite complete, produisant des scores |

### 6 types de criteres

#### 1. Correspondance de sortie
Verifie si la reponse de l'agent contient (ou correspond a) un motif specifique.

**Exemple :** S'assurer que l'agent s'excuse toujours quand un client signale un probleme.

#### 2. Validation de schema
Valide que la reponse est du JSON valide correspondant a une structure specifique.

**Exemple :** S'assurer qu'un agent de revue de code produit toujours \`{ "vulnerabilities": [...], "score": number }\`.

#### 3. Utilisation des outils
Verifie que l'agent a appele des outils specifiques pendant la conversation.

**Exemple :** S'assurer qu'un agent de recherche utilise toujours \`search_files\` avant de repondre.

#### 4. Controle de securite
Detecte les motifs dangereux dans la sortie — XSS, injection SQL, injection de prompt, etc.

**Exemple :** S'assurer que l'agent ne genere jamais de code executable dans les reponses client.

#### 5. Script personnalise
Executez du JavaScript arbitraire pour evaluer la reponse de l'agent.

**Exemple :** Verifier que la longueur de la reponse est dans les limites, ou que des mots-cles specifiques apparaissent.

#### 6. Juge LLM
Utilisez un autre LLM pour evaluer la qualite de la reponse sur des criteres subjectifs.

**Exemple :** "Notez cette reponse pour l'empathie et l'utilite sur une echelle de 0 a 10."

### Calcul du score

Chaque critere a un **poids**. Le score final est une moyenne ponderee :

\`\`\`
Score = Somme(score_critere x poids) / Somme(poids)
\`\`\`

Un cas reussit si tous les criteres passent. Le score de la suite est la moyenne de tous les scores de cas.

### Workflow

1. Creez une suite de notation pour votre agent
2. Ajoutez des cas de test couvrant les cas nominaux ET les cas limites
3. Ajoutez des criteres ponderes a chaque cas
4. Executez la suite
5. Examinez les resultats — scores par cas et sorties de l'agent
6. Ameliorez votre agent (prompt, competences, outils) et relancez
7. Suivez la progression entre les versions

---

## AutoResearch (Agents auto-ameliorants)

AutoResearch est le systeme d'optimisation automatique de Kopern, inspire de l'autoresearch de Karpathy. Il utilise vos suites de notation comme fonction de fitness objective et ameliore iterativement la configuration de votre agent — prompt systeme, modele, niveau de reflexion — dans une boucle de feedback serree.

### Prerequis

Avant d'utiliser AutoResearch, vous avez besoin de :
1. **Un agent configure** avec un prompt systeme
2. **Au moins une suite de notation** avec des cas de test et des criteres
3. **Un run de notation initial** (pour le mode AutoFix)

### Modes

#### AutoTune

La boucle d'optimisation principale. AutoTune mute iterativement le prompt systeme de votre agent via des strategies guidees par LLM, evalue chaque variante contre votre suite de test, et ne conserve que les ameliorations.

1. Allez dans l'onglet **Optimiser** de votre agent
2. Selectionnez une suite de notation et definissez le nombre max d'iterations (defaut : 10)
3. Optionnellement, definissez un score cible (ex : 0.9)
4. Cliquez sur **Demarrer** — observez les iterations en temps reel
5. Une fois termine, examinez le meilleur prompt et cliquez sur **Appliquer** pour mettre a jour votre agent

**Fonctionnement :** A chaque iteration, l'optimiseur analyse les resultats precedents, genere un prompt mute, lance la notation et compare les scores. Seules les mutations qui ameliorent le score sont conservees (hill-climbing).

#### AutoFix

Reparation ciblee des cas de test echoues. AutoFix analyse vos derniers resultats de notation, diagnostique les causes profondes des echecs et patche le prompt systeme pour corriger les faiblesses specifiques.

1. Selectionnez une suite de notation qui a au moins un run termine
2. Passez a l'onglet **AutoFix**
3. Cliquez sur **Demarrer** — l'analyseur identifie les cas echoues, diagnostique les problemes et applique les corrections
4. Examinez le prompt patche et appliquez si satisfait

#### Stress Lab

Tests adversariaux qui sondent les vulnerabilites de votre agent. Stress Lab genere des cas limites — injections de prompts, entrees ambigues, conditions aux limites — et evalue la robustesse de votre agent.

1. Passez a l'onglet **Stress Lab**
2. Selectionnez votre suite de notation
3. Cliquez sur **Demarrer** — le systeme genere des cas de test adversariaux et les execute
4. Examinez le rapport de securite : nombre total de tests, taux de reussite, score de robustesse
5. Si des vulnerabilites sont detectees, cliquez sur **Appliquer le prompt renforce** pour renforcer automatiquement les defenses

#### Arene Tournoi

Test A/B sur plusieurs combinaisons de modeles et configurations. Le tournoi execute votre suite de notation contre differentes configs et les classe par qualite, cout et latence.

1. Passez a l'onglet **Tournoi**
2. Selectionnez une suite de notation
3. Cliquez sur **Demarrer** — les candidats s'affrontent en evaluation multi-rounds
4. Examinez le classement : score, cout par run et latence moyenne
5. Utilisez les resultats pour choisir le meilleur compromis qualite/cout en production

#### Moteur d'Evolution

Optimisation par algorithme genetique sur plusieurs dimensions simultanement — prompt, modele et niveau de reflexion. Une population de configurations evolue par mutation, croisement et selection au fil des generations.

1. Passez a l'onglet **Evolution**
2. Definissez le nombre max d'iterations (generations)
3. Cliquez sur **Demarrer** — observez la fitness de la population s'ameliorer
4. La meilleure configuration toutes dimensions confondues est rapportee a la fin

#### Distillation

Transfert de connaissances de modeles professeurs couteux vers des etudiants moins chers. La distillation execute votre suite de notation avec des modeles puissants, puis trouve le modele le moins cher qui maintient une qualite acceptable.

1. Passez a l'onglet **Distillation**
2. Selectionnez votre suite de notation
3. Cliquez sur **Demarrer** — le systeme teste des modeles progressivement moins chers
4. Examinez les pourcentages de retention de qualite et les economies de cout

### Historique des runs

Tous les runs AutoResearch sont persistes dans Firestore. Consultez les runs passes en bas de la page Optimiser — chacun affiche le mode, statut, score, nombre d'iterations et utilisation de tokens.

### Facturation

Les runs AutoResearch consomment des tokens (souvent plusieurs iterations × suite de notation complete). L'utilisation est suivie par agent dans la page Facturation sous **Utilisation AutoResearch**. Les limites de plan s'appliquent.

---

## Serveurs MCP (Deploiement API)

Les Serveurs MCP vous permettent d'**exposer votre agent comme endpoint API** que toute application peut appeler.

### Creer un serveur

1. Allez dans l'onglet **Serveurs MCP** de votre agent
2. Cliquez sur **Nouveau Serveur** — donnez un nom et une description
3. Copiez la cle API (affichee une seule fois — conservez-la en securite !)

### Appeler l'API

**Endpoint :** \`POST /api/mcp\`

**Authentification :** Incluez votre cle API comme token Bearer.

#### Obtenir les infos de l'agent

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1
}
\`\`\`

#### Envoyer un message

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "completion/create",
  "params": {
    "message": "Analysez ce pull request pour les problemes de securite",
    "history": [
      {"role": "user", "content": "Bonjour"},
      {"role": "assistant", "content": "Bonjour ! Comment puis-je vous aider ?"}
    ]
  },
  "id": 2
}
\`\`\`

### Exemples de code

**cURL :**
\`\`\`bash
curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer kpn_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"completion/create","params":{"message":"Bonjour"},"id":1}'
\`\`\`

**Node.js :**
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
    params: { message: "Analysez ce code..." },
    id: 1,
  }),
});
const { result } = await response.json();
console.log(result.content);
\`\`\`

**Python :**
\`\`\`python
import requests

response = requests.post(
    "https://your-domain.com/api/mcp",
    headers={"Authorization": "Bearer kpn_your_api_key"},
    json={"jsonrpc": "2.0", "method": "completion/create",
          "params": {"message": "Resumez ce document..."}, "id": 1},
)
print(response.json()["result"]["content"])
\`\`\`

### Securite des cles API

- Les cles sont prefixees par \`kpn_\` et utilisent 32 octets hexadecimaux aleatoires
- Seul le hash SHA-256 est stocke — la cle en clair est affichee une seule fois
- Chaque serveur a une limitation de debit configurable (requetes par minute)

### Suivi d'utilisation

L'utilisation de tokens est suivie par serveur et par mois. Consultez-la dans la page **Cles API** ou dans le detail de chaque serveur.

---

## Equipes d'agents

Les equipes permettent d'**orchestrer plusieurs agents** travaillant ensemble sur une tache.

### Fonctionnement

1. Creez une equipe et ajoutez des agents comme membres
2. Definissez le role et l'ordre de contribution de chaque membre
3. Executez l'equipe — chaque agent traite la tache en sequence
4. La sortie de chaque agent est transmise comme contexte au suivant
5. Suivez les metriques combinees (tokens, cout, appels d'outils)

### Cas d'utilisation

- **Pipeline de revision** — Agent redacteur ecrit, Agent reviseur critique, Agent editeur finalise
- **Equipe d'analyse** — Agent donnees collecte, Agent analyste interprete, Agent rapporteur resume
- **Escalade support** — Agent Tier 1 traite les questions courantes, Agent Tier 2 traite les cas complexes

---

## Pipelines

Les pipelines permettent de definir des **workflows multi-etapes** pour un agent. Chaque etape a un prompt specifique et la sortie alimente l'etape suivante.

### Fonctionnement

1. Creez un pipeline sur votre agent
2. Definissez les etapes avec des instructions specifiques
3. Executez — chaque etape s'execute en sequence
4. Chaque etape recoit la sortie de l'etape precedente
5. Suivez les metriques par etape et totales

### Cas d'utilisation

- **Creation de contenu** — Recherche > Plan > Brouillon > Polissage
- **Revue de code** — Analyse > Securite > Performance > Rapport
- **Traitement de donnees** — Extraction > Transformation > Validation > Resume

---

## Sessions et historique

Chaque conversation dans le Playground est suivie comme une **session**. Les sessions capturent la timeline complete incluant messages, appels d'outils et metriques.

### Consulter les sessions

1. Allez dans l'onglet **Sessions** de votre agent
2. Voyez toutes les conversations passees avec :
   - Titre de la session (depuis votre premier message)
   - Duree, nombre de tokens, cout
   - Nombre d'appels d'outils
   - Statut Actif/Termine
3. Cliquez sur une session pour voir la **timeline complete** :
   - Chaque message (utilisateur et assistant)
   - Chaque appel d'outil avec arguments et resultats
   - Horodatages et metriques
4. **Exportez** la trace complete en JSON pour le debug ou la conformite

### Metriques de session

| Metrique | Description |
|----------|-------------|
| **Tokens In** | Total de tokens en entree consommes |
| **Tokens Out** | Total de tokens en sortie generes |
| **Cout** | Cout estime base sur la tarification du fournisseur |
| **Appels d'outils** | Nombre d'invocations d'outils |
| **Messages** | Nombre total de messages |

---

## Facturation et utilisation

La page **Facturation** montre votre utilisation de tokens et vos couts pour tous les agents.

### Ce qui est suivi

- **Tokens entree/sortie** par mois avec totaux cumulatifs
- **Cout total** calcule depuis la tarification du fournisseur
- **Nombre de requetes** — total des appels API/playground
- **Ventilation par agent** — voyez quels agents consomment le plus
- **Historique d'utilisation** — graphique visuel des 6 derniers mois

### Tarification par fournisseur (par 1M tokens)

| Fournisseur | Entree | Sortie |
|-------------|--------|--------|
| Anthropic | 3,00 $ | 15,00 $ |
| OpenAI | 2,50 $ | 10,00 $ |
| Google | 1,25 $ | 5,00 $ |
| Ollama | Gratuit | Gratuit |

---

## Integrations

### GitHub (natif)

Kopern a une integration GitHub native :
- Connectez-vous avec GitHub pour accorder l'acces aux depots
- Connectez des repos specifiques a des agents specifiques
- Les agents peuvent lire des fichiers et rechercher dans l'arborescence
- La structure du repo et le README sont automatiquement inclus

### Services externes (via MCP)

Pour tout autre service (Slack, Jira, AWS, Notion, bases de donnees, etc.), utilisez les **connecteurs MCP** :
1. Deployez votre agent comme Serveur MCP
2. Appelez-le depuis tout client compatible MCP
3. Ou construisez des outils personnalises qui appellent des API externes

Cela rend Kopern infiniment extensible sans construire d'integrations personnalisees.

---

## Tutoriel d'integration MCP

Ce tutoriel montre comment connecter vos agents Kopern aux services tiers via trois approches : **outils personnalises** (le plus simple), **deploiement MCP Server** (pour les consommateurs externes), et **equipes d'agents** (pour l'orchestration multi-services).

### Approche 1 : Outils personnalises (recommande)

Le moyen le plus rapide de connecter un agent a un service externe est via les outils personnalises. L'agent appelle l'outil pendant la conversation, et le code JavaScript communique avec le service.

#### Exemple : Outil de notification Slack

**Schema des parametres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "channel": { "type": "string", "description": "Nom du canal Slack (ex: #general)" },
    "message": { "type": "string", "description": "Message a envoyer" }
  },
  "required": ["channel", "message"]
}
\`\`\`

**Code d'execution :**
\`\`\`javascript
const response = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Authorization": "Bearer xoxb-VOTRE-TOKEN-SLACK",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    channel: params.channel,
    text: params.message,
  }),
});
const data = await response.json();
return data.ok ? "Message envoye avec succes" : \\\`Erreur: \\\${data.error}\\\`;
\`\`\`

#### Exemple : Outil de requete base de donnees (Supabase)

**Schema des parametres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "table": { "type": "string", "description": "Nom de la table" },
    "query": { "type": "string", "description": "Expression de filtre (ex: status=eq.active)" },
    "limit": { "type": "number", "description": "Lignes max", "default": 10 }
  },
  "required": ["table"]
}
\`\`\`

**Code d'execution :**
\`\`\`javascript
const url = new URL(\\\`https://VOTRE-PROJET.supabase.co/rest/v1/\\\${params.table}\\\`);
if (params.query) url.searchParams.set("select", "*");
if (params.limit) url.searchParams.set("limit", String(params.limit));
const response = await fetch(url.toString(), {
  headers: {
    "apikey": "VOTRE-CLE-SUPABASE",
    "Authorization": "Bearer VOTRE-CLE-SUPABASE",
  },
});
const data = await response.json();
return JSON.stringify(data, null, 2);
\`\`\`

#### Exemple : Createur de tickets Jira

**Schema des parametres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "project": { "type": "string", "description": "Cle du projet Jira (ex: PROJ)" },
    "summary": { "type": "string", "description": "Titre du ticket" },
    "description": { "type": "string", "description": "Description du ticket" },
    "issueType": { "type": "string", "enum": ["Bug", "Task", "Story"], "default": "Task" }
  },
  "required": ["project", "summary"]
}
\`\`\`

**Code d'execution :**
\`\`\`javascript
const response = await fetch("https://VOTRE-DOMAINE.atlassian.net/rest/api/3/issue", {
  method: "POST",
  headers: {
    "Authorization": "Basic " + btoa("email@example.com:VOTRE-TOKEN-API"),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fields: {
      project: { key: params.project },
      summary: params.summary,
      description: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: params.description || "" }] }] },
      issuetype: { name: params.issueType || "Task" },
    },
  }),
});
const data = await response.json();
return data.key ? \\\`Cree: \\\${data.key}\\\` : JSON.stringify(data.errors);
\`\`\`

### Approche 2 : Serveur MCP (pour les consommateurs externes)

Quand vous voulez que **d'autres applications** appellent votre agent Kopern, deployez-le comme Serveur MCP. Utile pour :
- Pipelines CI/CD appelant un agent de revue de code
- Chatbots transferant des questions complexes a un agent specialise
- Outils internes interrogeant un agent de connaissances
- Webhooks declenchant une analyse par agent

Voir la section **Serveurs MCP (Deploiement API)** ci-dessus pour la configuration.

**Pattern webhook** — declenchez votre agent depuis tout service supportant les webhooks :

\`\`\`javascript
// Exemple : handler webhook GitHub appelant votre agent Kopern
app.post("/webhook/github", async (req, res) => {
  const event = req.body;
  if (event.action === "opened" && event.pull_request) {
    const response = await fetch("https://votre-kopern.com/api/mcp", {
      method: "POST",
      headers: {
        "Authorization": "Bearer kpn_votre_cle_api",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "completion/create",
        params: { message: \\\`Revue de cette PR: \\\${event.pull_request.title}\\n\\n\\\${event.pull_request.body}\\\` },
        id: 1,
      }),
    });
    const { result } = await response.json();
    // Poster la revue comme commentaire de PR
  }
});
\`\`\`

### Approche 3 : Equipes d'agents (orchestration multi-services)

Pour les workflows impliquant plusieurs services, creez des agents specialises et orchestrez-les en **equipe** :

1. **Agent Slack** — outil : lire les messages Slack
2. **Agent Jira** — outil : creer/mettre a jour les tickets Jira
3. **Agent Resume** — synthetise les resultats

Creez une equipe avec ces trois agents en mode sequentiel. A l'execution, chaque agent traite la tache et transmet sa sortie au suivant.

### Bonnes pratiques de securite

- **Ne codez jamais les secrets en dur** dans le code des outils — utilisez des variables d'environnement
- **Utilisez des tokens en lecture seule** quand l'agent n'a besoin que de lire
- **Ajoutez des extensions de securite** pour bloquer les appels d'outils dangereux
- **Testez les outils dans le Playground** avant de connecter aux services de production
- **Surveillez l'utilisation** via la page Facturation pour detecter les appels API inattendus

---

## Connecteurs (Deploiement externe)

Deployez vos agents au-dela du dashboard Kopern. Les connecteurs permettent a vos agents d'interagir avec les utilisateurs sur des sites web, de repondre a des evenements externes via des webhooks et de participer a des conversations Slack.

### Widget de chat integrable

Ajoutez une bulle de chat IA a n'importe quel site web avec une seule balise \`<script>\`.

#### Configuration

1. Allez dans **Agents → [Votre agent] → Connecteurs → Widget**
2. Activez le widget et configurez :
   - **Message d'accueil** — premier message affiche aux visiteurs
   - **Position** — en bas a droite ou en bas a gauche
   - **Origines autorisees** — liste blanche CORS (laissez vide pour tout autoriser)
   - **Powered by Kopern** — visible sur le plan Starter, masquable sur Pro+
3. Generez une **cle API** (meme systeme de cles que MCP)
4. Copiez le snippet d'integration et collez-le dans le HTML de votre site

#### Snippet d'integration

\`\`\`html
<script
  src="https://kopern.vercel.app/api/widget/script"
  data-key="kpn_votre_cle_api"
  async
></script>
\`\`\`

#### Fonctionnalites

- **Shadow DOM** — CSS totalement isole, aucun conflit avec votre site
- **Streaming SSE** — reponses en temps reel token par token
- **Rendu Markdown** — titres, gras, italique, blocs de code, liens, listes
- **Responsive mobile** — panneau plein ecran sur les ecrans < 640px
- **Mode sombre** — suit automatiquement les preferences systeme
- **Appel d'outils** — l'agent peut utiliser tous les outils configures

#### Points d'acces API

| Endpoint | Methode | Usage |
|----------|---------|-------|
| \`/api/widget/script\` | GET | Sert le JavaScript du widget |
| \`/api/widget/config\` | GET | Retourne la configuration du widget (branding, message d'accueil) |
| \`/api/widget/chat\` | POST | Chat en streaming SSE (meme auth que MCP) |

#### Configuration CORS

Par defaut, le widget autorise les requetes de toute origine. En production, ajoutez des origines specifiques dans la configuration du widget :

\`\`\`
https://monsite.com
https://app.monsite.com
\`\`\`

Chaque origine doit inclure le protocole (\`https://\`).

### Webhooks

Connectez vos agents a des services externes (Stripe, Jira, n8n, Zapier...) via des webhooks HTTP.

#### Webhooks entrants

Les services externes envoient des donnees a votre agent, qui traite le message et retourne une reponse JSON.

**Endpoint :** \`POST /api/webhook/{agentId}?key=kpn_xxx\`

**Requete :**
\`\`\`json
{
  "message": "Nouvelle commande #1234 pour 99,99€",
  "metadata": {
    "orderId": "1234",
    "source": "stripe"
  }
}
\`\`\`

**Reponse :**
\`\`\`json
{
  "response": "J'ai note la nouvelle commande #1234...",
  "metrics": {
    "inputTokens": 1250,
    "outputTokens": 85,
    "toolCallCount": 0
  }
}
\`\`\`

#### Verification de signature HMAC

Pour la securite, vous pouvez configurer un secret de signature sur votre webhook. L'expediteur doit inclure un en-tete \`X-Webhook-Signature\` avec la signature HMAC-SHA256 du corps de la requete.

#### Webhooks sortants

Votre agent notifie automatiquement les services externes lorsque des evenements se produisent :

| Evenement | Declencheur |
|-----------|-------------|
| \`message_sent\` | L'agent envoie une reponse |
| \`tool_call_completed\` | L'agent finit d'utiliser un outil |
| \`session_ended\` | La session de conversation se termine |
| \`error\` | Une erreur survient pendant le traitement |

**Payload sortant :**
\`\`\`json
{
  "event": "message_sent",
  "agentId": "abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "inputTokens": 1250,
    "outputTokens": 85,
    "toolCallCount": 1
  }
}
\`\`\`

#### Protection anti-boucle

**Critique :** Les webhooks entrants ne declenchent **jamais** les webhooks sortants. Cela empeche les boucles infinies lors de l'integration avec des plateformes d'automatisation comme n8n, Zapier ou Make. Sans cette protection, un webhook entrant declenchant un webhook sortant vers la meme plateforme creerait un cycle infini (cela a cause des incidents reels — 88€ de couts et un crash de base de donnees en moins d'une minute).

#### Integration avec n8n, Zapier et Make

Les webhooks Kopern sont concus pour une integration transparente avec les plateformes d'automatisation de workflows. Utilisez le noeud **HTTP Request** (ou equivalent) de votre plateforme pour connecter les agents Kopern a vos workflows existants.

##### n8n

**Declencher un agent Kopern depuis n8n (entrant) :**
1. Ajoutez un noeud **HTTP Request** dans votre workflow n8n
2. Methode : \`POST\`, URL : \`https://kopern.vercel.app/api/webhook/{agentId}?key=kpn_xxx\`
3. Corps JSON : \`{"message": "votre prompt ici", "metadata": {...}}\`
4. La reponse contient la replique de l'agent dans \`response\` et les metriques de tokens dans \`metrics\`

**Declencher un workflow n8n depuis Kopern (sortant) :**
1. Dans n8n, creez un noeud trigger **Webhook** — copiez l'URL du webhook
2. Dans Kopern, allez dans **Connecteurs → Webhooks → Ajouter un webhook sortant**
3. Collez l'URL du webhook n8n et selectionnez les evenements declencheurs (\`message_sent\`, \`tool_call_completed\`, etc.)

##### Zapier

**Declencher un agent Kopern depuis Zapier :**
1. Utilisez une action **Webhooks by Zapier → Custom Request**
2. Methode : POST, URL : \`https://kopern.vercel.app/api/webhook/{agentId}?key=kpn_xxx\`
3. Corps : \`{"message": "...", "metadata": {...}}\`

**Declencher un workflow Zapier depuis Kopern :**
1. Dans Zapier, creez un Zap avec le trigger **Webhooks by Zapier → Catch Hook** — copiez l'URL du catch hook
2. Dans Kopern, ajoutez-la comme URL de webhook sortant

##### Make (anciennement Integromat)

**Declencher un agent Kopern depuis Make :**
1. Utilisez un module **HTTP → Make a request**
2. URL : \`https://kopern.vercel.app/api/webhook/{agentId}?key=kpn_xxx\`, methode : POST
3. Type de corps : JSON, corps : \`{"message": "...", "metadata": {...}}\`

**Declencher un scenario Make depuis Kopern :**
1. Dans Make, ajoutez un module **Webhooks → Custom webhook** — copiez l'URL
2. Dans Kopern, ajoutez-la comme URL de webhook sortant

> **Attention :** Ne configurez jamais de boucle circulaire ou un webhook sortant declenche un workflow qui rappelle le webhook entrant du meme agent. La protection anti-boucle de Kopern bloque cela au niveau entrant, mais votre workflow externe doit egalement etre concu pour l'eviter.

#### Journaux de webhooks

Toutes les executions de webhooks (entrants et sortants) sont enregistrees avec la direction, le statut, le code HTTP, la duree et l'horodatage. Consultez les journaux dans **Agents → [Votre agent] → Connecteurs → Webhooks → onglet Journaux**.

### Bot Slack

Permettez aux utilisateurs d'interagir avec votre agent directement dans les channels et DMs Slack.

#### Configuration

1. **Creez une Slack App** sur [api.slack.com/apps](https://api.slack.com/apps)
2. Configurez les **OAuth Scopes** : \`chat:write\`, \`app_mentions:read\`, \`channels:history\`, \`im:history\`, \`reactions:write\`
3. Definissez l'URL **Event Subscriptions** : \`https://kopern.vercel.app/api/slack/events\`
4. Abonnez-vous aux evenements : \`app_mention\`, \`message.im\`
5. Ajoutez les variables d'environnement : \`SLACK_CLIENT_ID\`, \`SLACK_CLIENT_SECRET\`, \`SLACK_SIGNING_SECRET\`
6. Allez dans **Agents → [Votre agent] → Connecteurs → Slack → Connecter**
7. Autorisez le bot dans votre workspace Slack

#### Comment ca marche

- **@mentionnez** le bot dans n'importe quel channel → l'agent repond dans un thread
- **Message direct** au bot → l'agent repond directement
- **Les reponses en thread** conservent le contexte de conversation (l'historique complet du thread est envoye a l'agent)
- Le bot ajoute une reaction 👀 pendant la reflexion, puis ✅ quand c'est termine

#### Securite

- Tous les evenements entrants sont verifies via le signing secret de Slack (HMAC-SHA256)
- Les tokens du bot sont stockes de maniere securisee dans Firestore (cote serveur uniquement)
- Les evenements retournent 200 immediatement, le traitement se fait de maniere asynchrone (Slack exige une reponse < 3s)

### Limites par plan

| Fonctionnalite | Starter | Pro | Usage | Enterprise |
|----------------|---------|-----|-------|-----------|
| Connecteurs | 0 | 3 | Illimite | Illimite |
| Retirer « Powered by » | Non | Oui | Oui | Oui |

L'utilisation des connecteurs est comptabilisee dans les limites de tokens de votre plan.

---

## Bonnes pratiques

### Conception d'agent

- **Commencez par le prompt systeme** — obtenez le comportement de base avant d'ajouter des competences
- **Utilisez les competences pour les motifs reutilisables** — ne repetez pas les instructions
- **Gardez les outils cibles** — un outil par action, avec des descriptions claires
- **Connectez les repos pertinents** — donnez a l'agent le contexte dont il a besoin

### Assurance qualite

- **Ecrivez des cas de notation pour les cas limites** — testez les modes d'echec
- **Utilisez les criteres deterministes en priorite** — output_match et schema_validation sont fiables
- **Utilisez le Juge LLM avec parcimonie** — puissant mais non deterministe
- **Versionnez avant les changements** — ayez toujours un point de retour
- **Suivez les scores dans le temps** — surveillez les regressions entre versions

### Deploiement API

- **Definissez des limites de debit appropriees** — adaptees au trafic attendu
- **Effectuez une rotation des cles** — regenerez periodiquement pour la securite
- **Surveillez l'utilisation** — consultez regulierement la page Facturation
- **Testez avant de deployer** — utilisez le Playground et la Notation d'abord

### Securite

- Les cles API sont hashees (SHA-256) — le texte en clair n'est jamais stocke
- Les tokens GitHub sont stockes en securite dans votre document utilisateur
- Les regles Firestore appliquent un acces proprietaire uniquement
- L'execution des outils se fait dans un environnement sandbox
`;
