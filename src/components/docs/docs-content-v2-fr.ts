export const docsMarkdownV2Fr = `
## Pour commencer

### Qu'est-ce que Kopern ?

Kopern est un **Constructeur, Évaluateur et Orchestrateur d'Agents IA**. La plateforme vous permet de créer des agents IA sur mesure pour votre métier, de valider leur qualité avec des suites de tests automatisés, de les connecter à vos dépôts GitHub, et de les déployer comme endpoints API — le tout depuis un tableau de bord unique.

Kopern intègre un **wizard Meta-Agent** : décrivez en langage naturel l'agent que vous souhaitez, et la plateforme génère automatiquement une spécification complète (prompt système, compétences, outils, cas de notation) que vous pouvez réviser et déployer en quelques clics.

**Ce que vous pouvez faire :**

- **Construire des agents** pour tout domaine — support client, juridique, DevOps, ventes, finance, RH, etc.
- **Connecter votre code** — les agents peuvent lire et rechercher dans vos dépôts GitHub
- **Valider la qualité** — exécutez des suites de tests avec 6 types de critères de notation
- **Déployer en API** — exposez vos agents comme endpoints JSON-RPC avec clés API sécurisées
- **Tout suivre** — facturation, sessions, conversations, runs de notation
- **Orchestrer** — combinez plusieurs agents en équipes ou pipelines multi-étapes
- **Créer par l'IA** — utilisez le wizard Meta-Agent pour générer des agents complets automatiquement

---

### Créer votre premier agent

Il existe deux chemins pour créer un agent sur Kopern :

#### Chemin rapide — Wizard Meta-Agent

Le wizard Meta-Agent est le moyen le plus simple de créer un agent complet. Il est accessible directement depuis la page d'accueil.

1. **Rendez-vous sur la page d'accueil** de Kopern
2. **Décrivez votre agent** dans le champ de saisie — par exemple : *"Un agent de support client pour une boutique e-commerce qui gère les retours, les remboursements et le suivi de commandes"*
3. **Lancez la génération** — le Meta-Agent analyse votre description et génère en temps réel :
   - Un **nom** et une **description** adaptés
   - Un **prompt système** détaillé avec rôle, contraintes et format de sortie
   - Des **compétences** pertinentes (ton, connaissances métier, règles d'escalade)
   - Des **outils personnalisés** adaptés au cas d'usage
   - Des **cas de notation** pour valider la qualité
4. **Révisez la spécification** — parcourez chaque section générée et ajustez selon vos besoins
5. **Sauvegardez et déployez** — l'agent est créé avec toute sa configuration, prêt à être testé dans le Playground

#### Chemin manuel — Dashboard

Pour un contrôle total sur chaque paramètre :

1. Allez dans **Dashboard → Agents** et cliquez sur **Nouvel Agent**
2. Remplissez les champs de configuration :
   - **Nom** — identifiant lisible de votre agent
   - **Description** — ce que fait l'agent en une phrase
   - **Domaine** — catégorie (DevOps, Juridique, Support, Ventes, Finance, RH, etc.)
   - **Fournisseur de modèle** — Anthropic, OpenAI, Google, Mistral AI ou Ollama
   - **Modèle** — le modèle spécifique (ex : claude-sonnet-4-6, gpt-4o, gemini-2.5-pro, mistral-large-latest)
   - **Niveau de réflexion** — contrôle la profondeur de raisonnement du modèle
   - **Prompt système** — les instructions principales qui définissent le comportement de l'agent
3. Enregistrez — votre agent est prêt à être enrichi de compétences et d'outils

---

### Partir d'un template

La page **Exemples** propose plus de **15 templates d'agents** prêts à l'emploi couvrant les cas d'usage les plus courants : support client, revue de code, analyse juridique, assistant DevOps, rédacteur de contenu, et bien d'autres.

**Comment utiliser un template :**

1. Rendez-vous sur la page **Exemples** depuis la navigation
2. Parcourez les templates disponibles — chacun affiche une description, le domaine, et les fonctionnalités incluses
3. Cliquez sur **Utiliser cet Agent** sur le template qui vous intéresse
4. L'agent est automatiquement créé dans votre compte avec :
   - Le prompt système pré-configuré
   - Les **compétences** adaptées au domaine
   - Les **outils personnalisés** pertinents
   - Les **extensions** nécessaires
   - Des **cas de notation** pour valider la qualité
5. Personnalisez l'agent selon vos besoins spécifiques

> **Astuce :** Les templates sont un excellent point de départ. Modifiez le prompt système et les compétences pour les adapter à votre contexte métier.

---

## Prompt Système

### Écrire des prompts efficaces

Le prompt système est le cœur de votre agent. Il définit sa personnalité, ses capacités, et ses limites. Un bon prompt système comprend trois éléments clés :

1. **Définition de rôle** — qui est l'agent, quel est son domaine d'expertise
2. **Contraintes** — ce que l'agent doit et ne doit pas faire
3. **Format de sortie** — comment l'agent doit structurer ses réponses

#### Exemple : Agent de support client

\`\`\`
Tu es un agent de support client senior pour TechStore, une boutique en ligne d'électronique.

RÔLE ET EXPERTISE :
- Tu es spécialisé dans la résolution de problèmes liés aux commandes, retours et remboursements
- Tu as accès à la politique de retour de l'entreprise et aux FAQ produits
- Tu communiques de manière empathique, professionnelle et orientée solution

CONTRAINTES :
- Ne promets jamais un remboursement sans vérifier l'éligibilité selon la politique de retour
- Ne partage jamais d'informations internes sur les marges ou les coûts fournisseurs
- Si le client est frustré après 3 échanges, propose une escalade vers un superviseur humain
- Réponds toujours en français, sauf si le client s'adresse à toi dans une autre langue

FORMAT DE SORTIE :
- Commence toujours par reconnaître le problème du client
- Utilise des paragraphes courts et des listes à puces pour la clarté
- Termine par une action concrète ou une question de suivi
- Pour les retours, fournis systématiquement le numéro de ticket et les étapes à suivre
\`\`\`

#### Exemple : Agent de revue de code

\`\`\`
Tu es un expert en revue de code senior spécialisé en TypeScript et React.

MISSION :
- Analyser le code soumis pour identifier les problèmes de qualité, sécurité et performance
- Fournir des recommandations actionables avec des exemples de code corrigé
- Prioriser les problèmes par niveau de sévérité (critique, majeur, mineur, suggestion)

MÉTHODOLOGIE :
1. Vérifie d'abord les failles de sécurité (XSS, injection, données sensibles exposées)
2. Analyse les problèmes de performance (re-renders inutiles, fuites mémoire, requêtes N+1)
3. Vérifie la conformité TypeScript (typage strict, pas de any, gestion des erreurs)
4. Évalue la lisibilité et la maintenabilité (nommage, découpage, commentaires)

FORMAT DE SORTIE :
Fournis toujours ta revue au format suivant :

## Résumé
Score global et aperçu en 2-3 phrases.

## Problèmes critiques
Liste numérotée avec fichier, ligne, description et correction suggérée.

## Améliorations recommandées
Liste numérotée des suggestions non bloquantes.

## Points positifs
Ce qui est bien fait dans le code.
\`\`\`

---

### Niveau de réflexion

Le niveau de réflexion contrôle la profondeur de raisonnement du modèle avant de générer sa réponse. Choisissez le niveau adapté à la complexité de vos tâches :

| Niveau | Description | Quand l'utiliser |
|--------|-------------|------------------|
| **off** | Pas de réflexion préalable | Tâches simples : salutations, reformulations, réponses factuelles directes |
| **minimal** | Réflexion très brève | Questions simples avec une seule bonne réponse, classifications binaires |
| **low** | Réflexion légère | Résumés, extraction d'information, traductions courtes |
| **medium** | Réflexion modérée | Analyses, comparaisons, rédaction structurée, la plupart des cas d'usage |
| **high** | Réflexion approfondie | Raisonnement complexe, revue de code, résolution de problèmes multi-étapes |
| **xhigh** | Réflexion maximale | Tâches nécessitant un raisonnement très poussé : mathématiques avancées, architectures complexes, planification stratégique |

> **Conseil :** Commencez par **medium** pour la plupart des agents. Augmentez si les réponses manquent de profondeur, diminuez si la latence est trop élevée.

---

### Purpose Gate

Le **Purpose Gate** (portail d'intention) est un filtre qui vérifie que chaque message de l'utilisateur correspond au domaine défini de l'agent. Si un message est hors sujet, l'agent le refuse poliment au lieu de répondre.

**Configuration :**

1. Activez le Purpose Gate dans les paramètres de votre agent
2. Définissez une **description du domaine** — par exemple : *"Questions relatives au support client, aux retours produits et au suivi de commandes"*
3. L'agent filtrera automatiquement les messages hors sujet

**Exemple :**

- **Domaine défini :** Support client e-commerce
- **Message utilisateur :** *"Écris-moi un poème sur la lune"*
- **Réponse de l'agent :** *"Je suis un agent de support client spécialisé dans les questions liées aux commandes, retours et remboursements. Je ne peux pas vous aider avec cette demande. Comment puis-je vous assister avec votre commande ?"*

> **Quand l'utiliser :** Activez le Purpose Gate pour les agents en production exposés via API, afin d'éviter les détournements d'usage et les injections de prompt.

---

### Mode TillDone

Le **Mode TillDone** permet à l'agent de poursuivre son travail automatiquement jusqu'à ce qu'il considère la tâche comme terminée, sans attendre de nouvelles instructions de l'utilisateur entre les étapes.

**Cas d'usage :**

- Analyse complète d'un dépôt de code (lecture de multiples fichiers)
- Recherche exhaustive nécessitant plusieurs appels d'outils
- Génération de documents longs avec plusieurs sections
- Tâches de refactoring impliquant la lecture et la modification de plusieurs fichiers

**Fonctionnement :**

1. L'utilisateur envoie sa requête initiale
2. L'agent commence le travail et utilise les outils nécessaires
3. Au lieu de s'arrêter après la première réponse, l'agent continue automatiquement
4. L'agent s'arrête lorsqu'il estime que la tâche est complète

> **Attention :** Ce mode peut consommer significativement plus de tokens. Surveillez l'utilisation via la barre de métriques du Playground.

---

### Branding

Personnalisez l'apparence de votre agent pour refléter votre marque ou le distinguer des autres :

- **Avatar** — téléchargez une image personnalisée pour votre agent
- **Couleur d'accent** — choisissez une couleur qui s'applique aux éléments de l'interface (bulles de chat, boutons, en-têtes)
- **Message d'accueil** — définissez le premier message affiché quand un utilisateur ouvre le Playground ou interagit via l'API

**Exemple de message d'accueil :**

*"Bonjour ! Je suis l'assistant DevOps de votre équipe. Je peux vous aider à diagnostiquer des problèmes d'infrastructure, analyser vos fichiers de configuration, et proposer des optimisations. Quelle est votre question ?"*

---

## Compétences

### Que sont les compétences ?

Les compétences sont des **blocs d'instructions modulaires** écrits en markdown, injectés dans le contexte de l'agent à l'exécution. Elles permettent de séparer les préoccupations, de réutiliser les connaissances entre agents, et de maintenir un prompt système propre.

**Mécanisme d'injection :** Au moment de l'exécution, toutes les compétences actives de l'agent sont encapsulées dans des balises XML et ajoutées au prompt système :

\`\`\`xml
<skills>
  <skill name="guide-de-ton">
    Contenu de la compétence...
  </skill>
  <skill name="regles-metier">
    Contenu de la compétence...
  </skill>
</skills>
\`\`\`

Le LLM traite ces instructions comme faisant partie intégrante de son prompt système, ce qui lui permet de les appliquer naturellement dans ses réponses.

---

### Créer une compétence

1. Ouvrez votre agent et allez dans l'onglet **Compétences**
2. Cliquez sur **Nouvelle Compétence**
3. Remplissez les champs :
   - **Nom** — identifiant court et descriptif (ex : \`guide-de-ton\`, \`regles-escalade\`)
   - **Description** — explication de ce que fait la compétence (affiché uniquement dans le dashboard)
   - **Contenu** — les instructions en markdown que le LLM suivra

**Exemple de XML généré :**

\`\`\`xml
<skills>
  <skill name="guide-de-ton">
    ## Directives de communication

    - Adopte un ton professionnel mais chaleureux
    - Utilise le vouvoiement systématiquement
    - Évite le jargon technique sauf si le client l'utilise en premier
  </skill>
</skills>
\`\`\`

---

### Exemples de compétences

#### 1. Guide de ton

**Nom :** \`guide-de-ton\`

**Contenu :**

\`\`\`markdown
## Directives de communication

### Ton général
- Adopte un ton professionnel, empathique et orienté solution
- Vouvoie systématiquement le client
- Reste positif même face à des situations difficiles

### Structure des réponses
- Commence par reconnaître la situation du client
- Utilise des paragraphes courts (2-3 phrases maximum)
- Utilise des listes à puces pour les étapes et les options
- Termine toujours par une action concrète ou une question de suivi

### Formulations à privilégier
- "Je comprends votre situation..." au lieu de "Je suis désolé mais..."
- "Voici ce que nous pouvons faire..." au lieu de "Ce n'est pas possible..."
- "Permettez-moi de vérifier..." au lieu de "Je ne sais pas..."

### Formulations à éviter
- Jargon technique non expliqué
- Réponses négatives sans alternative
- Promesses que vous ne pouvez pas tenir
\`\`\`

#### 2. Format de sortie — JSON enforcer

**Nom :** \`format-json\`

**Contenu :**

\`\`\`markdown
## Contrainte de format de sortie

Tu DOIS toujours répondre au format JSON valide. Aucun texte libre n'est accepté en dehors du JSON.

### Structure obligatoire

{
  "status": "success" | "error" | "needs_clarification",
  "data": { ... },
  "message": "Explication lisible par un humain",
  "confidence": 0.0 à 1.0
}

### Règles
- Le champ "status" est toujours présent
- Le champ "data" contient les résultats structurés de l'analyse
- Le champ "message" contient un résumé en langage naturel
- Le champ "confidence" reflète ta certitude (1.0 = absolument certain)
- Si tu ne peux pas répondre, utilise status "needs_clarification" et explique dans "message"
- Ne retourne JAMAIS de texte brut en dehors de la structure JSON
\`\`\`

#### 3. Connaissances métier — Règles de conformité juridique

**Nom :** \`conformite-juridique\`

**Contenu :**

\`\`\`markdown
## Règles de conformité juridique

### RGPD (Données personnelles)
- Ne collecte ni ne stocke jamais de données personnelles sans consentement explicite
- Si un utilisateur demande la suppression de ses données, confirme le droit d'accès et de suppression
- Ne transfère jamais de données personnelles vers des pays sans accord d'adéquation

### Délais légaux
- Retours produits : 14 jours calendaires à partir de la réception (droit de rétractation)
- Garantie légale : 2 ans minimum pour les biens neufs
- Réponse aux réclamations RGPD : 30 jours maximum

### Clauses à ne jamais accepter
- Renonciation aux droits de garantie
- Limitation de responsabilité en cas de vice caché
- Clauses abusives définies par l'article L212-1 du Code de la consommation

### Escalade obligatoire
Transfère immédiatement vers le département juridique si :
- Le client mentionne une action en justice
- Le sujet concerne un litige contractuel
- Des questions de propriété intellectuelle sont soulevées
\`\`\`

#### 4. Règles d'escalade

**Nom :** \`regles-escalade\`

**Contenu :**

\`\`\`markdown
## Règles d'escalade vers un agent humain

### Escalade automatique (immédiate)
Transfère vers un superviseur humain dans les cas suivants :
- Le client mentionne une intention de poursuivre juridiquement
- Le montant en jeu dépasse 1 000 euros
- Le client demande à parler à un responsable
- Des informations de paiement sensibles sont en jeu

### Escalade après tentative
Transfère après 3 tentatives infructueuses de résolution si :
- Le client reste insatisfait malgré les solutions proposées
- Le problème technique nécessite un accès système que tu n'as pas
- La situation émotionnelle du client s'aggrave

### Format d'escalade
Quand tu escalades, fournis toujours :
1. Un résumé du problème en 2-3 phrases
2. Les solutions déjà proposées et rejetées
3. Le ton et le niveau de frustration du client (faible/moyen/élevé)
4. Toute information clé (numéro de commande, produit concerné)

### Message au client lors de l'escalade
"Je comprends l'importance de votre demande. Je vais vous transférer vers un de nos superviseurs qui pourra vous apporter une assistance plus adaptée. Merci de votre patience."
\`\`\`

---

### Bonnes pratiques

- **Une compétence par sujet** — ne mélangez pas le ton, les règles métier et le format dans une seule compétence
- **Instructions explicites** — le LLM suit les compétences à la lettre ; soyez précis et sans ambiguïté
- **Testez avec la notation** — créez des cas de test qui vérifient que chaque compétence produit le comportement attendu
- **Réutilisez entre agents** — les compétences peuvent être copiées entre agents via la galerie d'Exemples
- **Gardez un volume raisonnable** — trop de compétences longues diluent l'attention du LLM ; privilégiez la concision

---

## Outils personnalisés

### Fonctionnement de l'appel d'outil

Le système d'appel d'outil de Kopern permet à vos agents d'exécuter des actions concrètes pendant les conversations. Voici le flux complet :

1. **L'utilisateur envoie un message** à l'agent
2. **Le LLM analyse le message** et décide s'il a besoin d'un outil pour répondre
3. **Le LLM génère un appel d'outil** avec les arguments appropriés
4. **Kopern exécute le code de l'outil** dans un environnement sandboxé avec les arguments fournis
5. **Le résultat est renvoyé au LLM** comme contexte supplémentaire
6. **Le LLM formule sa réponse** en utilisant le résultat de l'outil
7. **Ce cycle peut se répéter** jusqu'à **10 itérations** par tour de conversation — l'agent peut enchaîner plusieurs appels d'outils pour accomplir une tâche complexe

> **Important :** L'agent décide de lui-même quand utiliser un outil, en se basant sur la description de l'outil et le contexte de la conversation. Une bonne description d'outil est essentielle.

---

### Créer un outil

1. Ouvrez votre agent et allez dans l'onglet **Outils**
2. Cliquez sur **Nouvel Outil**
3. Remplissez les champs :
   - **Nom** — identifiant technique que le LLM utilise pour appeler l'outil (ex : \`calculate_price\`, \`search_database\`)
   - **Label** — nom d'affichage lisible dans l'interface (ex : "Calculateur de prix", "Recherche en base")
   - **Description** — explication détaillée de ce que fait l'outil. Le LLM lit cette description pour décider quand l'utiliser — soyez précis.
   - **Schéma des paramètres** — JSON Schema définissant les entrées attendues par l'outil
   - **Code d'exécution** — JavaScript qui s'exécute quand l'outil est appelé

---

### Référence du schéma de paramètres

Le schéma des paramètres utilise le standard **JSON Schema**. Il définit les entrées que l'outil accepte. Voici les types supportés :

#### String

\`\`\`json
{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "Nom du client" },
    "email": { "type": "string", "description": "Adresse email", "format": "email" }
  },
  "required": ["name"]
}
\`\`\`

#### Number

\`\`\`json
{
  "type": "object",
  "properties": {
    "amount": { "type": "number", "description": "Montant en euros" },
    "quantity": { "type": "integer", "description": "Quantité (entier)", "minimum": 1, "maximum": 100 }
  },
  "required": ["amount"]
}
\`\`\`

#### Boolean

\`\`\`json
{
  "type": "object",
  "properties": {
    "includeDetails": { "type": "boolean", "description": "Inclure les détails complets", "default": false }
  }
}
\`\`\`

#### Array

\`\`\`json
{
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Liste de tags à rechercher"
    }
  },
  "required": ["tags"]
}
\`\`\`

#### Object

\`\`\`json
{
  "type": "object",
  "properties": {
    "filters": {
      "type": "object",
      "properties": {
        "status": { "type": "string" },
        "priority": { "type": "string" }
      },
      "description": "Filtres de recherche"
    }
  }
}
\`\`\`

#### Enum

\`\`\`json
{
  "type": "object",
  "properties": {
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"],
      "description": "Niveau de priorité"
    },
    "format": {
      "type": "string",
      "enum": ["json", "csv", "markdown"],
      "description": "Format de sortie souhaité",
      "default": "json"
    }
  },
  "required": ["priority"]
}
\`\`\`

---

### Référence du code d'exécution

Le code d'exécution est du JavaScript qui s'exécute dans un environnement sandboxé quand l'outil est appelé.

#### Variables disponibles

- **\`params\`** (ou **\`args\`**) — objet contenant les arguments passés par le LLM, conformes au schéma des paramètres
- Exemple : si le schéma définit un paramètre \`query\` de type string, vous y accédez via \`params.query\`

#### Valeur de retour

Le code **doit retourner une chaîne de caractères** (\`string\`). Cette chaîne est renvoyée au LLM comme résultat de l'appel d'outil. Pour des données structurées, utilisez \`JSON.stringify()\`.

#### Limitations de la sandbox

L'exécution se fait dans le module \`node:vm\` avec les restrictions suivantes :

- **Pas de \`fetch\`** — pas d'appels réseau
- **Pas de \`URL\`** — pas de construction d'URL
- **Pas de \`Buffer\`** — pas de manipulation de buffers binaires
- **Pas de \`fs\`** — pas d'accès au système de fichiers
- **Pas de \`require\` / \`import\`** — pas de modules externes
- **JavaScript pur uniquement** — pas de Node.js APIs

#### Globales disponibles

Les globales suivantes sont accessibles dans la sandbox :

\`JSON\`, \`Math\`, \`Date\`, \`Array\`, \`Object\`, \`String\`, \`Number\`, \`Boolean\`, \`RegExp\`, \`Error\`, \`Map\`, \`Set\`, \`Promise\`, \`parseInt\`, \`parseFloat\`, \`encodeURIComponent\`, \`decodeURIComponent\`, \`isNaN\`, \`isFinite\`

---

### Exemples d'outils

#### 1. Calculatrice

**Description :** Effectue des calculs mathématiques simples.

**Schéma des paramètres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "expression": { "type": "string", "description": "Expression mathématique à évaluer (ex : 2 + 3 * 4)" }
  },
  "required": ["expression"]
}
\`\`\`

**Code d'exécution :**
\`\`\`javascript
// Sécurité : n'autoriser que les caractères mathématiques
const safe = /^[0-9+\\-*/().\\s]+$/.test(params.expression);
if (!safe) return "Erreur : expression invalide. Utilisez uniquement des chiffres et opérateurs (+, -, *, /, parenthèses).";
try {
  const result = Function(\`"use strict"; return (\\\\\${params.expression})\`)();
  return String(result);
} catch (e) {
  return \`Erreur de calcul : \\\\\${e.message}\`;
}
\`\`\`

#### 2. Formateur JSON

**Description :** Formate, valide et embellit du JSON brut.

**Schéma des paramètres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "input": { "type": "string", "description": "Chaîne JSON brute à formater" },
    "indent": { "type": "number", "description": "Nombre d'espaces d'indentation", "default": 2 }
  },
  "required": ["input"]
}
\`\`\`

**Code d'exécution :**
\`\`\`javascript
try {
  const parsed = JSON.parse(params.input);
  const indent = params.indent || 2;
  return JSON.stringify(parsed, null, indent);
} catch (e) {
  return \`JSON invalide : \\\\\${e.message}\`;
}
\`\`\`

#### 3. Analyseur de texte

**Description :** Analyse un texte et retourne des statistiques (mots, phrases, caractères, temps de lecture).

**Schéma des paramètres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "text": { "type": "string", "description": "Texte à analyser" }
  },
  "required": ["text"]
}
\`\`\`

**Code d'exécution :**
\`\`\`javascript
const text = params.text || "";
const words = text.split(/\\s+/).filter(w => w.length > 0);
const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
const paragraphs = text.split(/\\n\\n+/).filter(p => p.trim().length > 0);
const readingTimeMinutes = Math.ceil(words.length / 200);

return JSON.stringify({
  characters: text.length,
  charactersNoSpaces: text.replace(/\\s/g, "").length,
  words: words.length,
  sentences: sentences.length,
  paragraphs: paragraphs.length,
  averageWordLength: words.length > 0 ? (words.reduce((sum, w) => sum + w.length, 0) / words.length).toFixed(1) : 0,
  readingTime: \`\\\\\${readingTimeMinutes} min\`
}, null, 2);
\`\`\`

#### 4. Calculateur de dates

**Description :** Calcule la différence entre deux dates ou ajoute des jours à une date.

**Schéma des paramètres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "operation": { "type": "string", "enum": ["difference", "add"], "description": "Opération : 'difference' entre deux dates ou 'add' jours à une date" },
    "date1": { "type": "string", "description": "Première date (format YYYY-MM-DD)" },
    "date2": { "type": "string", "description": "Seconde date (format YYYY-MM-DD) — requis pour 'difference'" },
    "days": { "type": "number", "description": "Nombre de jours à ajouter — requis pour 'add'" }
  },
  "required": ["operation", "date1"]
}
\`\`\`

**Code d'exécution :**
\`\`\`javascript
const d1 = new Date(params.date1);
if (isNaN(d1.getTime())) return "Erreur : date1 invalide. Utilisez le format YYYY-MM-DD.";

if (params.operation === "difference") {
  if (!params.date2) return "Erreur : date2 est requis pour l'opération 'difference'.";
  const d2 = new Date(params.date2);
  if (isNaN(d2.getTime())) return "Erreur : date2 invalide.";
  const diffMs = Math.abs(d2 - d1);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30.44);
  return JSON.stringify({ days: diffDays, weeks: diffWeeks, months: diffMonths }, null, 2);
} else if (params.operation === "add") {
  if (params.days === undefined) return "Erreur : 'days' est requis pour l'opération 'add'.";
  const result = new Date(d1);
  result.setDate(result.getDate() + params.days);
  return result.toISOString().split("T")[0];
}
return "Erreur : opération inconnue. Utilisez 'difference' ou 'add'.";
\`\`\`

#### 5. Parseur CSV

**Description :** Parse une chaîne CSV et la convertit en JSON structuré.

**Schéma des paramètres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "csv": { "type": "string", "description": "Données CSV brutes (avec en-têtes sur la première ligne)" },
    "delimiter": { "type": "string", "description": "Séparateur de colonnes", "default": "," }
  },
  "required": ["csv"]
}
\`\`\`

**Code d'exécution :**
\`\`\`javascript
const delimiter = params.delimiter || ",";
const lines = params.csv.trim().split("\\n");
if (lines.length < 2) return "Erreur : le CSV doit contenir au moins un en-tête et une ligne de données.";

const headers = lines[0].split(delimiter).map(h => h.trim());
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(delimiter).map(v => v.trim());
  const row = {};
  headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
  rows.push(row);
}

return JSON.stringify({ headers, rowCount: rows.length, data: rows }, null, 2);
\`\`\`

---

### Outils intégrés (GitHub)

Lorsque vous connectez des dépôts GitHub à votre agent, deux outils intégrés sont automatiquement disponibles :

| Outil | Description | Paramètres |
|-------|-------------|------------|
| **read_file** | Lit le contenu d'un fichier dans un dépôt connecté | \`repo\` (string) — nom du dépôt, \`path\` (string) — chemin du fichier |
| **search_files** | Recherche des fichiers par motif de nom dans les dépôts connectés | \`pattern\` (string) — motif de recherche (ex : \`*.ts\`, \`src/**/*.tsx\`) |

Ces outils permettent à l'agent de naviguer dans votre code, lire des fichiers de configuration, comprendre l'architecture du projet, et fournir des analyses contextualisées.

---

### Surcharges d'outils

Vous pouvez personnaliser le comportement du système d'outils pour chaque agent via les **surcharges d'outils** :

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| **maxIterations** | Nombre maximum d'itérations d'appels d'outils par tour de conversation | 10 |
| **timeout** | Temps maximum d'exécution d'un outil (en millisecondes) | 5000 |

> **Conseil :** Réduisez \`maxIterations\` pour les agents en production afin de limiter les coûts. Augmentez-le pour les agents d'analyse qui doivent lire de nombreux fichiers.

---

## Extensions

Les extensions sont des **hooks d'evenements** qui interceptent et modifient le comportement de l'agent au runtime. Elles se declenchent sur des evenements specifiques du cycle de vie de l'agent — du demarrage de session a l'execution de tools, l'orchestration d'equipes, et bien plus.

Contrairement aux tools (que le LLM appelle quand il le decide), les extensions se declenchent automatiquement sur des evenements predefinis.

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

### Utiliser le Playground

Le Playground est votre environnement de test en temps réel. Voici comment l'utiliser :

1. Ouvrez votre agent depuis le Dashboard
2. Cliquez sur l'onglet **Playground**
3. Tapez votre message dans la zone de saisie en bas
4. Appuyez sur **Entrée** ou cliquez sur **Envoyer**
5. Observez la réponse apparaître en streaming (token par token)
6. Si l'agent utilise des outils, vous verrez les appels s'afficher en temps réel
7. Continuez la conversation — tous les messages partagent la même session
8. Cliquez sur **Nouvelle conversation** pour recommencer une session vierge

---

### Comprendre l'interface

| Élément | Description |
|---------|-------------|
| **Bulles de messages** | Les messages utilisateur s'affichent à droite, les réponses de l'agent à gauche |
| **Indicateurs d'outils** | Les appels d'outils s'affichent avec un badge spécial montrant le nom de l'outil, les arguments et le résultat |
| **Streaming** | Les tokens apparaissent au fur et à mesure de la génération par le LLM |
| **Barre de métriques** | En bas de l'écran : tokens en entrée, tokens en sortie, coût estimé, nombre d'appels d'outils |
| **Rendu Markdown** | Les réponses de l'agent sont rendues avec formatage complet (titres, listes, code, tableaux) |
| **Lien session** | Cliquez pour accéder à la timeline complète de la session |

---

### Stratégies de test

1. **Validation du prompt système** — commencez par des questions simples pour vérifier que le ton et le rôle sont corrects
2. **Test des compétences** — envoyez des messages qui devraient déclencher des comportements spécifiques définis dans les compétences
3. **Test des outils** — vérifiez que l'agent utilise les bons outils au bon moment, avec les bons arguments
4. **Cas limites** — testez les entrées vides, très longues, hors sujet, ou malveillantes
5. **Cohérence conversationnelle** — vérifiez que l'agent maintient le contexte sur plusieurs messages
6. **Test du Purpose Gate** — si activé, envoyez des messages hors domaine et vérifiez le refus
7. **Test de charge** — envoyez plusieurs messages rapidement pour observer le comportement sous pression

---

## Notation

### Pourquoi la notation est importante

La notation automatisée est essentielle pour garantir la qualité de vos agents en production. Sans tests automatisés, vous n'avez aucune garantie que :

- Les modifications du prompt n'ont pas dégradé des comportements existants
- L'agent respecte les contraintes de sécurité dans tous les cas
- Les compétences et outils fonctionnent correctement ensemble
- L'agent produit des réponses au format attendu

La notation vous permet de **détecter les régressions** à chaque modification et de **mesurer les améliorations** de manière objective.

---

### Créer une suite de notation

1. Ouvrez votre agent et allez dans l'onglet **Notation**
2. Cliquez sur **Nouvelle Suite**
3. Donnez un **nom** et une **description** à la suite (ex : "Tests de support client — cas courants")
4. La suite est créée, prête à recevoir des cas de test

---

### Ajouter des cas de test

Pour chaque cas de test :

1. Cliquez sur **Ajouter un cas**
2. Remplissez le **message d'entrée** — le message que l'utilisateur enverra à l'agent
3. Ajoutez un ou plusieurs **critères** de validation (voir ci-dessous)
4. Attribuez un **poids** à chaque critère (détermine son importance dans le score final)

---

### Les 6 types de critères

#### 1. Correspondance de sortie

Vérifie si la réponse de l'agent contient, correspond exactement, ou matche un pattern spécifique.

**Champs de configuration :**
- **Mode** — \`contains\` (contient), \`exact\` (correspondance exacte), \`regex\` (expression régulière)
- **Pattern(s)** — le ou les motifs à vérifier. Vous pouvez spécifier plusieurs patterns séparés par des virgules ou des retours à la ligne — tous doivent être trouvés pour que le critère passe
- **Insensible à la casse** — ignorer les majuscules/minuscules

**Exemple complet :**

\`\`\`
Mode : contains
Patterns : excuses, numéro de ticket, étapes à suivre
Insensible à la casse : oui
\`\`\`

Ce critère vérifie que la réponse de l'agent contient les mots "excuses", "numéro de ticket" et "étapes à suivre" (tous les trois).

**Quand l'utiliser :** Pour vérifier la présence de mots-clés obligatoires, de formulations spécifiques, ou de structures de réponse attendues.

---

#### 2. Validation de schéma

Vérifie que la réponse de l'agent est du JSON valide conforme à un schéma JSON Schema spécifique.

**Champs de configuration :**
- **JSON Schema** — le schéma que la réponse doit respecter

**Exemple complet :**

\`\`\`json
{
  "type": "object",
  "required": ["vulnerabilities", "score", "summary"],
  "properties": {
    "vulnerabilities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["severity", "description"],
        "properties": {
          "severity": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
          "description": { "type": "string" },
          "line": { "type": "number" }
        }
      }
    },
    "score": { "type": "number", "minimum": 0, "maximum": 10 },
    "summary": { "type": "string" }
  }
}
\`\`\`

**Quand l'utiliser :** Pour les agents qui doivent produire des réponses JSON structurées (agents d'analyse, agents de classification, agents de transformation de données).

---

#### 3. Utilisation des outils

Vérifie que l'agent a appelé les bons outils pendant la conversation.

**Champs de configuration :**
- **Outils attendus** — liste des noms d'outils qui doivent être appelés
- **Ordre strict** — si activé, les outils doivent être appelés dans l'ordre spécifié
- **Extras autorisés** — si désactivé, l'agent ne doit appeler que les outils listés (pas d'extras)

**Exemple complet :**

\`\`\`
Outils attendus : search_files, read_file
Ordre strict : oui
Extras autorisés : non
\`\`\`

Ce critère vérifie que l'agent a d'abord appelé \`search_files\`, puis \`read_file\`, et aucun autre outil.

**Quand l'utiliser :** Pour s'assurer que l'agent suit un workflow d'outils spécifique — par exemple, toujours chercher avant de lire, ou toujours valider avant de soumettre.

---

#### 4. Contrôle de sécurité

Détecte les patterns dangereux dans la réponse de l'agent : XSS, injection SQL, injection de prompt, code exécutable, données sensibles exposées.

**Champs de configuration :**
- **Patterns interdits** — expressions régulières ou mots-clés qui ne doivent jamais apparaître dans la réponse
- **Scan des appels d'outils** — si activé, vérifie aussi les arguments passés aux outils

**Exemple complet :**

\`\`\`
Patterns interdits :
<script
onclick=
javascript:
DROP TABLE
'; --
eval(
document.cookie
\`\`\`

**Quand l'utiliser :** Pour tout agent en production, en particulier ceux qui génèrent du code, du HTML, ou des requêtes vers des bases de données.

---

#### 5. Script personnalisé

Exécute du JavaScript arbitraire pour évaluer la réponse de l'agent avec une logique sur mesure.

**Champs de configuration :**
- **Code** — JavaScript qui reçoit les variables et retourne un résultat

**Variables disponibles dans le script :**
- \`response\` — la réponse textuelle de l'agent
- \`input\` — le message d'entrée du cas de test
- \`toolCalls\` — tableau des appels d'outils (nom, arguments, résultat)
- \`metrics\` — métriques de la conversation (tokens, coût)

**Valeur de retour :**
- \`{ pass: true }\` ou \`{ pass: false, reason: "explication" }\`
- Ou un score numérique entre 0 et 1 : \`{ score: 0.75 }\`

**Exemple complet :**

\`\`\`javascript
// Vérifier que la réponse fait entre 100 et 500 caractères
const len = response.length;
if (len < 100) return { pass: false, reason: \`Réponse trop courte (\\\\\${len} caractères, minimum 100)\` };
if (len > 500) return { pass: false, reason: \`Réponse trop longue (\\\\\${len} caractères, maximum 500)\` };

// Vérifier que certains mots-clés apparaissent dans le bon ordre
const keywords = ["bonjour", "problème", "solution", "cordialement"];
let lastIndex = -1;
for (const kw of keywords) {
  const idx = response.toLowerCase().indexOf(kw);
  if (idx === -1) return { pass: false, reason: \`Mot-clé manquant : "\\\\\${kw}"\` };
  if (idx <= lastIndex) return { pass: false, reason: \`Mot-clé "\\\\\${kw}" n'est pas dans le bon ordre\` };
  lastIndex = idx;
}

return { pass: true };
\`\`\`

**Quand l'utiliser :** Pour des validations complexes qui ne peuvent pas être exprimées par les autres types de critères — longueur de réponse, ordre des éléments, calculs personnalisés, validations croisées.

---

#### 6. Juge LLM

Utilise un autre LLM pour évaluer la qualité de la réponse sur des critères subjectifs comme l'empathie, la pertinence, la clarté, ou la créativité.

**Champs de configuration :**
- **Fournisseur** — le fournisseur du LLM juge (Anthropic, OpenAI, Google)
- **Modèle** — le modèle spécifique à utiliser comme juge
- **Rubrique** — instructions détaillées sur les critères d'évaluation
- **Seuil** — score minimum (0-10) pour que le critère passe

**Exemple complet :**

\`\`\`
Fournisseur : Anthropic
Modèle : claude-sonnet-4-6
Seuil : 7

Rubrique :
Évalue cette réponse d'agent de support client sur les critères suivants.
Attribue un score de 0 à 10 pour chaque critère, puis un score global.

1. Empathie (0-10) : L'agent reconnaît-il le problème du client avec compassion ?
2. Pertinence (0-10) : La réponse aborde-t-elle directement le problème posé ?
3. Actionnable (0-10) : La réponse contient-elle des étapes concrètes pour résoudre le problème ?
4. Professionnalisme (0-10) : Le ton est-il approprié et respectueux ?
5. Complétude (0-10) : Toutes les informations nécessaires sont-elles fournies ?

Score global = moyenne des 5 critères.
\`\`\`

**Quand l'utiliser :** Pour évaluer des qualités subjectives impossibles à mesurer par des critères déterministes. Utilisez-le avec parcimonie car il est non déterministe et coûte des tokens supplémentaires.

---

### Lancer une suite

1. Ouvrez la suite de notation souhaitée
2. Cliquez sur **Lancer la suite**
3. Observez l'exécution en temps réel — chaque cas est traité séquentiellement
4. Pour chaque cas, l'agent reçoit le message d'entrée, répond (avec outils si nécessaire), puis chaque critère est évalué
5. Les résultats s'affichent au fur et à mesure avec les scores par cas et par critère

---

### Dupliquer une suite

Vous pouvez dupliquer une suite existante pour créer une variante :

1. Ouvrez la suite à dupliquer
2. Cliquez sur **Dupliquer**
3. La nouvelle suite est créée avec tous les cas et critères copiés
4. Modifiez les cas selon vos besoins

---

### Modifier les cas après création

Les cas de test sont entièrement modifiables après leur création :

- Modifiez le **message d'entrée** pour tester un scénario différent
- Ajoutez, supprimez ou modifiez des **critères**
- Ajustez les **poids** des critères pour refléter les priorités
- Réorganisez l'ordre des cas

---

### Comprendre les scores

Chaque critère a un **poids** qui détermine son importance dans le score final du cas :

\`\`\`
Score du cas = Somme(score_critère x poids) / Somme(poids)
\`\`\`

- Un critère **passe** (score = 1.0) ou **échoue** (score = 0.0), sauf le script personnalisé et le juge LLM qui peuvent retourner des scores intermédiaires
- Un cas **réussit** si son score dépasse le seuil (par défaut 0.7)
- Le **score de la suite** est la moyenne de tous les scores de cas
- Le score de notation le plus récent apparaît sur la page détail de l'agent

---

### Suivi de progression

Chaque run de notation est enregistré avec :
- Le **score global** de la suite
- Les **scores par cas** et par critère
- La **version** de l'agent au moment du run
- La **date** d'exécution

Comparez les runs entre les versions pour :
- **Détecter les régressions** — un score qui baisse après une modification
- **Mesurer les améliorations** — un score qui monte après une optimisation
- **Identifier les cas fragiles** — des cas dont le score varie entre les runs

---

## Serveurs MCP (Déploiement API)

### Créer un serveur MCP

Les serveurs MCP vous permettent d'exposer votre agent comme un endpoint API que toute application peut appeler.

1. Ouvrez votre agent et allez dans l'onglet **Serveurs MCP**
2. Cliquez sur **Nouveau Serveur**
3. Donnez un **nom** et une **description** au serveur
4. Le système génère automatiquement une **clé API** (préfixée par \`kpn_\`)
5. **Copiez la clé immédiatement** — elle est affichée une seule fois et ne pourra pas être récupérée ensuite
6. Votre serveur est actif et prêt à recevoir des requêtes

---

### Référence API — JSON-RPC

**Endpoint :** \`POST /api/mcp\`

**Authentification :** Header \`Authorization: Bearer kpn_votre_cle_api\`

#### Méthode : initialize

Récupère les informations de l'agent associé au serveur.

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1
}
\`\`\`

**Réponse :**
\`\`\`json
{
  "jsonrpc": "2.0",
  "result": {
    "name": "Mon Agent Support",
    "description": "Agent de support client pour TechStore",
    "capabilities": ["tools", "streaming"]
  },
  "id": 1
}
\`\`\`

#### Méthode : completion/create

Envoie un message à l'agent et reçoit une réponse complète (avec exécution d'outils si nécessaire).

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "completion/create",
  "params": {
    "message": "Quel est le statut de ma commande #12345 ?",
    "history": [
      { "role": "user", "content": "Bonjour" },
      { "role": "assistant", "content": "Bonjour ! Comment puis-je vous aider ?" }
    ]
  },
  "id": 2
}
\`\`\`

**Réponse :**
\`\`\`json
{
  "jsonrpc": "2.0",
  "result": {
    "content": "Votre commande #12345 est en cours de livraison...",
    "toolCalls": [...],
    "usage": { "inputTokens": 150, "outputTokens": 89 }
  },
  "id": 2
}
\`\`\`

---

### Exemples de code

**cURL :**
\`\`\`bash
curl -X POST https://votre-domaine.com/api/mcp \\
  -H "Authorization: Bearer kpn_votre_cle_api" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"completion/create","params":{"message":"Bonjour"},"id":1}'
\`\`\`

**Node.js :**
\`\`\`javascript
const response = await fetch("https://votre-domaine.com/api/mcp", {
  method: "POST",
  headers: {
    "Authorization": "Bearer kpn_votre_cle_api",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "completion/create",
    params: { message: "Analysez ce code pour les failles de sécurité..." },
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
    "https://votre-domaine.com/api/mcp",
    headers={"Authorization": "Bearer kpn_votre_cle_api"},
    json={
        "jsonrpc": "2.0",
        "method": "completion/create",
        "params": {"message": "Résumez ce document..."},
        "id": 1,
    },
)
result = response.json()["result"]
print(result["content"])
\`\`\`

---

### Sécurité des clés API

- Les clés sont préfixées par \`kpn_\` et générées avec **32 octets hexadécimaux aléatoires**
- Seul le **hash SHA-256** est stocké en base — la clé en clair est affichée une seule fois à la création
- Chaque serveur a une **limitation de débit configurable** (requêtes par minute)
- Les clés peuvent être **révoquées** à tout moment depuis le dashboard
- Effectuez une **rotation régulière** de vos clés pour renforcer la sécurité

---

### Suivi d'utilisation

L'utilisation de tokens est suivie automatiquement pour chaque serveur MCP :

- **Par mois** — tokens en entrée, tokens en sortie, coût estimé
- **Par requête** — chaque appel est comptabilisé
- Consultez les statistiques dans la page **Clés API** ou dans le détail de chaque serveur

---

## Intégration GitHub

### Connecter GitHub

Pour connecter vos dépôts GitHub à Kopern :

1. **Connectez-vous avec GitHub** — cliquez sur "Se connecter avec GitHub" sur la page de connexion, ou liez votre compte GitHub depuis les paramètres. Le scope \`repo\` est demandé pour accéder à vos dépôts privés.
2. Ouvrez la page détail de n'importe quel agent
3. Cliquez sur **Connecter un Repo** dans la section "Dépôts connectés"
4. Sélectionnez les dépôts auxquels vous souhaitez que l'agent accède
5. Les dépôts sont maintenant connectés et accessibles par l'agent

---

### Fonctionnement

Quand un dépôt est connecté, Kopern fournit automatiquement :

- **L'arborescence des fichiers** — la structure complète du dépôt est injectée dans le contexte de l'agent (~1-2K tokens). L'agent peut ainsi naviguer dans le projet sans appel d'outil.
- **Le contenu du README** — le README principal du dépôt est inclus dans le contexte pour donner à l'agent une compréhension du projet.
- **Outils automatiques** — deux outils sont automatiquement ajoutés :
  - \`read_file\` — lecture du contenu d'un fichier spécifique
  - \`search_files\` — recherche de fichiers par motif dans l'arborescence

L'agent utilise ces outils de manière autonome quand il a besoin d'accéder au code source pour répondre à une question.

---

### Dépannage

**Conflit d'identifiants :** Si vous avez déjà un compte avec une adresse email liée à Google et que vous essayez de vous connecter avec GitHub (qui utilise la même adresse), un conflit d'identifiants peut survenir. Dans ce cas :
1. Connectez-vous d'abord avec Google
2. Allez dans les paramètres
3. Liez votre compte GitHub depuis la section "Comptes liés"

**Popup bloqué :** Si la fenêtre d'authentification GitHub ne s'ouvre pas, vérifiez que votre navigateur autorise les popups pour le domaine de Kopern.

---

## Équipes d'agents

### Créer une équipe

Les équipes permettent d'orchestrer plusieurs agents travaillant ensemble sur une tâche.

1. Allez dans **Dashboard → Équipes**
2. Cliquez sur **Nouvelle Équipe**
3. Donnez un **nom** et une **description** à l'équipe
4. **Ajoutez des membres** — sélectionnez les agents existants à inclure
5. Pour chaque membre, définissez :
   - **Rôle** — la fonction du membre dans l'équipe (ex : "Rédacteur", "Réviseur", "Éditeur")
   - **Ordre** — sa position dans la séquence d'exécution
6. Choisissez le **mode d'exécution** (voir ci-dessous)
7. Enregistrez l'équipe

---

### Modes d'exécution

| Mode | Description | Quand l'utiliser |
|------|-------------|------------------|
| **Séquentiel** | Chaque agent s'exécute l'un après l'autre. La sortie de chaque agent est transmise comme contexte au suivant. | Pipelines de traitement où chaque étape dépend de la précédente |
| **Parallèle** | Tous les agents s'exécutent simultanément avec le même message d'entrée. Les résultats sont agrégés. | Analyses indépendantes qui peuvent être combinées |
| **Conditionnel** | Le premier agent s'exécute, puis un routeur décide quel agent suivant exécuter en fonction de la sortie. | Workflows avec branchements logiques (ex : escalade conditionnelle) |

---

### Exemples

**Pipeline de révision de contenu (séquentiel) :**
1. **Agent Rédacteur** — écrit le premier brouillon
2. **Agent Réviseur** — critique le brouillon et suggère des améliorations
3. **Agent Éditeur** — applique les corrections et produit la version finale

**Équipe d'analyse multi-angle (parallèle) :**
1. **Agent Sécurité** — analyse les vulnérabilités
2. **Agent Performance** — identifie les goulets d'étranglement
3. **Agent Lisibilité** — évalue la qualité du code

**Support avec escalade (conditionnel) :**
1. **Agent Tier 1** — traite la demande initiale
2. Si non résolu → **Agent Tier 2** (spécialiste technique)
3. Si toujours non résolu → **Agent Escalade** (prépare un rapport pour un humain)

---

## Pipelines

### Créer un pipeline

Les pipelines définissent des workflows multi-étapes pour un seul agent.

1. Ouvrez votre agent et allez dans l'onglet **Pipelines**
2. Cliquez sur **Nouveau Pipeline**
3. Donnez un **nom** et une **description**
4. **Ajoutez des étapes** dans l'ordre souhaité :
   - **Nom de l'étape** — identifiant descriptif
   - **Instructions** — le prompt spécifique pour cette étape
   - **Mapping d'entrée** — comment utiliser la sortie de l'étape précédente
5. Enregistrez le pipeline

---

### Fonctionnement des étapes

Chaque étape d'un pipeline :

1. Reçoit les **instructions spécifiques** de l'étape
2. Reçoit la **sortie de l'étape précédente** comme contexte supplémentaire (sauf la première étape qui reçoit le message initial)
3. A accès aux **outils** de l'agent (le même ensemble pour chaque étape)
4. Peut effectuer **plusieurs itérations d'outils** (boucle agentique standard)
5. Produit une **sortie** qui sera transmise à l'étape suivante

Les métriques (tokens, coût, appels d'outils) sont suivies **par étape** et **au total**.

---

### Exemples

**Pipeline de création de contenu :**
1. **Recherche** — *"Recherche les sources pertinentes sur le sujet suivant et fais une synthèse des points clés."*
2. **Plan** — *"À partir de la recherche fournie, établis un plan détaillé avec titres et sous-titres."*
3. **Rédaction** — *"Rédige un article complet en suivant le plan fourni. Style : professionnel, 1500-2000 mots."*
4. **Polissage** — *"Relis l'article et corrige les erreurs de grammaire, améliore le style, et vérifie la cohérence."*

**Pipeline de revue de code :**
1. **Analyse syntaxique** — *"Analyse le code pour les erreurs de syntaxe, typage et conventions."*
2. **Audit sécurité** — *"Identifie les vulnérabilités de sécurité potentielles (XSS, injections, données sensibles)."*
3. **Performance** — *"Analyse les problèmes de performance (complexité, fuites mémoire, requêtes N+1)."*
4. **Rapport final** — *"Compile les analyses précédentes en un rapport de revue structuré avec score global et priorités."*

**Pipeline de traitement de données :**
1. **Extraction** — *"Extrais les données structurées du texte brut fourni."*
2. **Transformation** — *"Normalise et transforme les données extraites selon le schéma cible."*
3. **Validation** — *"Vérifie la cohérence des données : valeurs manquantes, doublons, formats invalides."*
4. **Résumé** — *"Génère un résumé statistique des données traitées avec les anomalies détectées."*

---

## Connecteurs (Déploiement externe)

Déployez vos agents au-delà du dashboard Kopern — sur des sites web, via des webhooks et dans des workspaces Slack.

### Widget de chat intégrable

Ajoutez une bulle de chat IA à n'importe quel site web avec une seule balise script :

\`\`\`html
<script
  src="https://kopern.vercel.app/api/widget/script"
  data-key="kpn_votre_cle_api"
  async
></script>
\`\`\`

**Fonctionnalités clés :**
- **Shadow DOM** — isolation CSS totale, zéro conflit avec votre site
- **Streaming SSE** — réponses en temps réel token par token avec rendu markdown
- **Responsive mobile** — panneau plein écran sous 640px
- **Mode sombre** — suit automatiquement les préférences système
- **Contrôle CORS** — liste blanche d'origines spécifiques ou tout autoriser
- **Badge Powered by Kopern** — visible sur Starter, masquable sur Pro+

**Configuration :** Agents → Connecteurs → Widget → Activer → Générer une clé API → Copier le snippet

| Endpoint | Méthode | Usage |
|----------|---------|-------|
| \`/api/widget/script\` | GET | Sert le JavaScript du widget |
| \`/api/widget/config\` | GET | Retourne la configuration du widget |
| \`/api/widget/chat\` | POST | Chat en streaming SSE |

### Webhooks (Entrants et Sortants)

#### Entrants — Des services externes déclenchent votre agent

\`\`\`bash
curl -X POST "https://kopern.vercel.app/api/webhook/{agentId}?key=kpn_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Nouvelle commande #1234", "metadata": {"source": "stripe"}}'
\`\`\`

**Réponse :**
\`\`\`json
{
  "response": "J'ai noté la nouvelle commande #1234...",
  "metrics": { "inputTokens": 1250, "outputTokens": 85, "toolCallCount": 0 }
}
\`\`\`

- Réponse JSON synchrone (pas SSE)
- Vérification de signature HMAC-SHA256 optionnelle via l'en-tête \`X-Webhook-Signature\`
- Compatible avec Stripe, Jira, n8n, Zapier, Make et tout client HTTP

#### Sortants — Votre agent notifie des services externes

Configurez des URLs cibles et des événements déclencheurs :

| Événement | Déclencheur |
|-----------|-------------|
| \`message_sent\` | L'agent envoie une réponse |
| \`tool_call_completed\` | L'agent finit d'utiliser un outil |
| \`session_ended\` | La session se termine |
| \`error\` | Une erreur survient |

Les webhooks sortants se déclenchent automatiquement (fire-and-forget) avec un payload JSON contenant le type d'événement, l'ID de l'agent, l'horodatage et les métriques.

#### Journaux de webhooks

Toutes les exécutions sont enregistrées avec la direction, le statut, le code HTTP, la durée et l'horodatage. Consultez dans Connecteurs → Webhooks → onglet Journaux.

### Bot Slack

Permettez aux utilisateurs d'interagir avec votre agent directement dans Slack.

**Configuration :**
1. Créez une Slack App sur [api.slack.com/apps](https://api.slack.com/apps)
2. Ajoutez les OAuth scopes : \`chat:write\`, \`app_mentions:read\`, \`channels:history\`, \`im:history\`, \`reactions:write\`
3. Définissez l'URL Event Subscriptions : \`https://kopern.vercel.app/api/slack/events\`
4. Abonnez-vous à : \`app_mention\`, \`message.im\`
5. Connectez depuis Kopern : Agents → Connecteurs → Slack → Connecter

**Comment ça marche :**
- \`@mention\` dans n'importe quel channel → réponse en thread
- Message direct → réponse directe
- Le contexte des threads est préservé (historique complet envoyé à l'agent)
- Réaction 👀 pendant la réflexion, ✅ quand c'est terminé

**Sécurité :** Vérification du signing secret Slack (HMAC-SHA256), traitement asynchrone (réponse < 3s), stockage des tokens côté serveur.

### Limites par plan

| Fonctionnalité | Starter | Pro | Usage | Enterprise |
|----------------|---------|-----|-------|-----------|
| Connecteurs | 0 | 3 | Illimité | Illimité |
| Retirer le branding | Non | Oui | Oui | Oui |

---

## Sessions et observabilité

### Consulter les sessions

Chaque conversation dans le Playground, chaque run de notation, et chaque exécution d'équipe ou de pipeline est enregistrée comme une **session**.

1. Allez dans l'onglet **Sessions** de votre agent
2. La liste affiche toutes les sessions passées avec :
   - **Titre** — généré à partir du premier message
   - **Date et heure** de début
   - **Durée** de la session
   - **Tokens** consommés (entrée + sortie)
   - **Coût** estimé
   - **Appels d'outils** — nombre total d'invocations
   - **Statut** — Actif ou Terminé
3. Cliquez sur une session pour voir la **timeline complète** :
   - Chaque message (utilisateur et assistant) avec horodatage
   - Chaque appel d'outil avec le nom, les arguments et le résultat
   - Les métriques détaillées par message

---

### Métriques de session

| Métrique | Description |
|----------|-------------|
| **Tokens In** | Total de tokens en entrée consommés pendant la session |
| **Tokens Out** | Total de tokens en sortie générés par le LLM |
| **Coût** | Coût estimé basé sur la tarification du fournisseur |
| **Appels d'outils** | Nombre total d'invocations d'outils |
| **Messages** | Nombre total de messages échangés |
| **Durée** | Temps écoulé entre le début et la fin de la session |

---

### Export de données

Vous pouvez exporter les données d'une session pour le debug, l'audit ou la conformité :

- **Format JSON** — export complet de la timeline incluant messages, appels d'outils, métriques et horodatages
- Utilisez ces exports pour :
  - **Debugging** — comprendre pourquoi un agent a produit une réponse inattendue
  - **Conformité** — conserver une trace des interactions pour les audits
  - **Analyse** — alimenter vos propres outils d'analyse avec les données brutes

---

## Facturation et utilisation

### Comprendre votre facture

La page **Facturation** centralise toute l'information sur votre utilisation de tokens et vos coûts.

**Ce qui est suivi :**

- **Tokens en entrée et en sortie** — par mois, avec totaux cumulatifs
- **Coût total** — calculé à partir de la tarification du fournisseur
- **Nombre de requêtes** — total des appels API, Playground, notation, équipes et pipelines
- **Ventilation par agent** — identifiez quels agents consomment le plus
- **Historique d'utilisation** — graphique visuel des 6 derniers mois

---

### Limites par plan

| Fonctionnalité | Starter | Pro | Usage | Enterprise |
|----------------|---------|-----|-------|------------|
| Agents | 3 | 10 | Illimité | Illimité |
| Tokens / mois | 100K | 1M | Selon consommation | Personnalisé |
| Serveurs MCP | 1 | 5 | Illimité | Illimité |
| Équipes | 1 | 5 | Illimité | Illimité |
| Pipelines | 3 | 15 | Illimité | Illimité |
| Suites de notation | 3 | 10 | Illimité | Illimité |
| Dépôts GitHub | 2 | 10 | Illimité | Illimité |
| Support | Communauté | Email | Prioritaire | Dédié |

---

### Mettre à niveau

Pour passer à un plan supérieur :

1. Allez dans **Dashboard → Facturation**
2. Consultez votre plan actuel et votre utilisation
3. Cliquez sur **Mettre à niveau**
4. Sélectionnez le plan souhaité
5. Complétez le processus de paiement

---

### Tarification par fournisseur

Les coûts sont calculés selon la tarification suivante (par million de tokens) :

| Fournisseur | Tokens en entrée | Tokens en sortie |
|-------------|------------------|------------------|
| Anthropic | 3,00 $ | 15,00 $ |
| OpenAI | 2,50 $ | 10,00 $ |
| Google | 1,25 $ | 5,00 $ |
| Ollama | Gratuit | Gratuit |

> **Conseil :** Utilisez Ollama (modèles locaux) pour le développement et les tests, et un fournisseur cloud pour la production.

---

## Tutoriel d'intégrations

### Outils personnalisés pour services externes

Le moyen le plus rapide d'intégrer un service externe est via les outils personnalisés. Voici trois exemples complets.

#### Slack — Outil de notification

**Schéma des paramètres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "channel": { "type": "string", "description": "Nom du canal Slack (ex : #general)" },
    "message": { "type": "string", "description": "Message à envoyer" }
  },
  "required": ["channel", "message"]
}
\`\`\`

**Code d'exécution :**
\`\`\`javascript
const response = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Authorization": "Bearer xoxb-VOTRE-TOKEN-SLACK-BOT",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    channel: params.channel,
    text: params.message,
  }),
});
const data = await response.json();
return data.ok ? "Message envoyé avec succès" : \`Erreur : \\\\\${data.error}\`;
\`\`\`

#### Supabase — Requête en base de données

**Schéma des paramètres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "table": { "type": "string", "description": "Nom de la table" },
    "query": { "type": "string", "description": "Expression de filtre (ex : status=eq.active)" },
    "limit": { "type": "number", "description": "Nombre maximum de lignes", "default": 10 }
  },
  "required": ["table"]
}
\`\`\`

**Code d'exécution :**
\`\`\`javascript
const url = new URL(\`https://VOTRE-PROJET.supabase.co/rest/v1/\\\\\${params.table}\`);
if (params.query) url.searchParams.set("select", "*");
if (params.limit) url.searchParams.set("limit", String(params.limit));
const response = await fetch(url.toString(), {
  headers: {
    "apikey": "VOTRE-CLE-ANON-SUPABASE",
    "Authorization": "Bearer VOTRE-CLE-ANON-SUPABASE",
  },
});
const data = await response.json();
return JSON.stringify(data, null, 2);
\`\`\`

#### Jira — Création de tickets

**Schéma des paramètres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "project": { "type": "string", "description": "Clé du projet Jira (ex : PROJ)" },
    "summary": { "type": "string", "description": "Titre du ticket" },
    "description": { "type": "string", "description": "Description du ticket" },
    "issueType": { "type": "string", "enum": ["Bug", "Task", "Story"], "default": "Task" }
  },
  "required": ["project", "summary"]
}
\`\`\`

**Code d'exécution :**
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
      description: {
        type: "doc",
        version: 1,
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: params.description || "" }]
        }]
      },
      issuetype: { name: params.issueType || "Task" },
    },
  }),
});
const data = await response.json();
return data.key ? \`Ticket créé : \\\\\${data.key}\` : JSON.stringify(data.errors);
\`\`\`

---

### Déploiement MCP Server — Pattern webhook

Pour déclencher votre agent depuis n'importe quel service supportant les webhooks :

\`\`\`javascript
// Exemple : handler webhook GitHub qui appelle votre agent Kopern
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
        params: {
          message: \`Revue de cette PR : \\\\\${event.pull_request.title}\\n\\n\\\\\${event.pull_request.body}\`
        },
        id: 1,
      }),
    });
    const { result } = await response.json();
    // Poster la revue comme commentaire de PR
  }
});
\`\`\`

Ce pattern fonctionne avec n'importe quel service : GitHub, GitLab, Slack, Stripe, Twilio, etc.

---

### Équipes pour orchestration multi-services

Pour les workflows impliquant plusieurs services, créez des agents spécialisés et orchestrez-les en équipe :

1. **Agent Moniteur Slack** — outil : lire les messages Slack → identifie les demandes
2. **Agent Jira** — outil : créer/mettre à jour des tickets → transforme les demandes en tickets
3. **Agent Synthèse** — synthétise les résultats et génère un rapport

Créez une équipe en mode séquentiel avec ces trois agents. À l'exécution, chaque agent traite la tâche et passe sa sortie au suivant, créant un workflow automatisé de bout en bout.

---

## Sécurité

### Sécurité des données

- **Firestore** — toutes les données sont stockées dans Firebase Firestore avec des règles de sécurité qui appliquent un accès propriétaire uniquement. Chaque utilisateur ne peut accéder qu'à ses propres agents, outils, sessions et données d'utilisation.
- **Clés API** — les clés sont préfixées par \`kpn_\` et seul le hash SHA-256 est stocké. La clé en clair n'est jamais conservée après la création.
- **Tokens GitHub** — les tokens d'accès GitHub sont stockés dans le document utilisateur Firestore, protégés par les règles de sécurité Firestore. Ils sont utilisés uniquement côté serveur pour les appels API GitHub.

---

### Sandbox d'exécution

Les outils personnalisés et les scripts de notation s'exécutent dans un environnement sandboxé utilisant le module **\`node:vm\`** de Node.js :

- **Globales restreintes** — seules les globales JavaScript standard sont accessibles (JSON, Math, Date, etc.)
- **Pas d'accès réseau** — pas de \`fetch\`, \`XMLHttpRequest\`, ou \`net\`
- **Pas d'accès fichier** — pas de \`fs\`, \`path\`, ou accès au système de fichiers
- **Pas de modules** — pas de \`require\` ou \`import\`
- **Timeout de 5 secondes** — chaque exécution est limitée à 5 secondes pour éviter les boucles infinies

---

### Bonnes pratiques

- **Ne codez jamais de secrets en dur** dans le code des outils — utilisez des variables d'environnement ou un gestionnaire de secrets
- **Utilisez des tokens en lecture seule** quand l'agent n'a besoin que de lire des données
- **Ajoutez des extensions de sécurité** (filtres de contenu, contrôle d'outils) pour les agents en production
- **Testez vos outils dans le Playground** avant de les connecter à des services de production
- **Surveillez l'utilisation** via la page Facturation pour détecter les appels API inattendus
- **Effectuez une rotation régulière** de vos clés API
- **Activez le Purpose Gate** pour les agents exposés publiquement afin d'éviter les détournements
- **Utilisez les critères de sécurité** dans la notation pour automatiser la détection de vulnérabilités

---

## FAQ

**Comment changer le modèle de mon agent ?**
Ouvrez la page de détail de votre agent, modifiez le **Fournisseur** et le **Modèle** dans les paramètres, puis enregistrez. Le changement prend effet immédiatement pour les nouvelles conversations.

**Puis-je utiliser plusieurs fournisseurs dans une même équipe ?**
Oui. Chaque agent d'une équipe peut utiliser un fournisseur et un modèle différent. Par exemple, un agent Claude pour l'analyse et un agent GPT pour la rédaction.

**Les outils personnalisés ont-ils accès à Internet ?**
Non. Les outils s'exécutent dans un environnement sandboxé sans accès réseau. Pour interagir avec des services externes, le code de l'outil simule la logique localement. Les appels réseau réels nécessitent une architecture côté serveur.

**Comment réinitialiser la conversation dans le Playground ?**
Cliquez sur **Nouvelle conversation** en haut du Playground. Une nouvelle session sera créée.

**Puis-je exporter les données d'un agent ?**
Oui. Les sessions sont exportables en JSON depuis l'onglet Sessions. Les suites de notation avec leurs résultats sont également consultables en détail.

**Comment fonctionne la facturation ?**
Chaque appel (Playground, API, notation, équipe, pipeline) consomme des tokens. Le coût est calculé selon la tarification du fournisseur et incrémenté atomiquement dans votre compteur d'utilisation mensuel.

**Le Purpose Gate bloque-t-il aussi les appels API (MCP) ?**
Oui. Le Purpose Gate est appliqué à toutes les interactions avec l'agent, que ce soit via le Playground ou via l'API MCP.

**Quelle est la différence entre une équipe et un pipeline ?**
Une **équipe** orchestre **plusieurs agents différents** travaillant ensemble. Un **pipeline** définit **plusieurs étapes pour un seul agent**. Utilisez les équipes quand vous avez besoin de perspectives ou spécialisations différentes, et les pipelines quand un même agent doit suivre un workflow structuré.

**Comment dupliquer un agent ?**
Utilisez la galerie d'**Exemples** pour partager et recréer des agents. Vous pouvez également dupliquer les suites de notation pour réutiliser vos tests sur un nouvel agent.

**Puis-je connecter des dépôts GitHub privés ?**
Oui. L'authentification GitHub demande le scope \`repo\` qui donne accès aux dépôts privés. Seuls les dépôts que vous sélectionnez explicitement seront accessibles par l'agent.

**Le Juge LLM est-il déterministe ?**
Non. Le Juge LLM utilise un autre modèle pour évaluer les réponses, ce qui introduit de la variabilité entre les runs. Pour des résultats reproductibles, privilégiez les critères déterministes (correspondance de sortie, validation de schéma, script personnalisé).

**Combien de temps les sessions sont-elles conservées ?**
Les sessions sont conservées indéfiniment dans votre compte. Vous pouvez les consulter et les exporter à tout moment.

**Puis-je utiliser Ollama avec des modèles locaux ?**
Oui. Sélectionnez **Ollama** comme fournisseur et spécifiez le nom du modèle local que vous avez installé. L'utilisation de modèles Ollama est gratuite (aucun coût de tokens).
`;
