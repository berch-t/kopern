export const docsMarkdownFr = `
## Introduction

Kopern est une plateforme de construction et d'evaluation d'agents IA. Creez des agents IA adaptes a votre metier, validez leur qualite avec des tests automatises, connectez-les a vos depots GitHub et deployez-les comme endpoints API — le tout depuis un seul tableau de bord.

### Ce que vous pouvez faire

- **Construire des agents** pour tout domaine — support, juridique, DevOps, ventes, finance, RH, etc.
- **Connecter votre code** — les agents peuvent lire et rechercher dans vos depots GitHub
- **Valider la qualite** — executez des suites de tests avec 6 types de criteres
- **Deployer en API** — exposez vos agents comme endpoints JSON-RPC avec cles API securisees
- **Tout suivre** — facturation, sessions, conversations, runs de notation
- **Collaboration** — orchestrez plusieurs agents travaillant ensemble

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

### 6. Deployer en API

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
| **Fournisseur** | Anthropic, OpenAI, Google ou Ollama |
| **Modele** | Modele specifique (ex: claude-sonnet-4-6, gpt-4o, gemini-2.5-pro) |
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

Les extensions sont des **hooks d'evenements** qui interceptent et modifient le comportement de l'agent.

### Cas d'utilisation

- **Journalisation** — suivre toutes les interactions pour la conformite
- **Filtrage de contenu** — bloquer ou modifier les sorties non securisees
- **Commandes personnalisees** — ajouter des commandes comme \`/reset\` ou \`/export\`
- **Gestion d'etat** — persister des donnees entre les sessions
- **Garde-fous** — appliquer des regles metier sur les reponses

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
