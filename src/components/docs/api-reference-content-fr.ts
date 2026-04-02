export const apiReferenceMarkdownFr = `
## Introduction

L'API Kopern vous permet d'interagir avec vos agents IA de maniere programmatique. Envoyez des messages, recevez des reponses en streaming, declenchez des webhooks et gerez vos cles API — le tout via une interface HTTP RESTful.

### URL de Base

\`\`\`
https://kopern.ai
\`\`\`

Tous les endpoints sont relatifs a cette URL. Pour les deployments auto-heberges, remplacez par votre propre domaine.

### Concepts Cles

| Concept | Description |
|---------|-------------|
| **Agent** | Un agent IA construit sur Kopern (prompt systeme, skills, tools, modele) |
| **Cle API** | Une cle prefixee \`kpn_\` qui authentifie les requetes et est liee a un agent specifique |
| **Serveur MCP** | Un connecteur qui expose votre agent comme serveur d'outils (protocole MCP) |
| **Session** | Une conversation trackee — chaque appel API cree une session pour la facturation et l'observabilite |
| **Tool Calling** | Les agents peuvent executer des tools personnalises (JS sandbox) et des tools integres (GitHub, etc.) pendant une conversation |

---

## Authentification

Tous les endpoints necessitent une authentification via cles API. Les cles sont creees dans le dashboard Kopern sous **Agent > Serveurs MCP** ou **Agent > Connecteurs**.

### Format de Cle API

Les cles utilisent le prefixe \`kpn_\` suivi d'une chaine aleatoire :

\`\`\`
kpn_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
\`\`\`

### Transmettre Votre Cle

Deux methodes d'authentification :

**Bearer Token (recommande)**

\`\`\`bash
curl https://kopern.ai/api/webhook/AGENT_ID \\
  -H "Authorization: Bearer kpn_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Bonjour"}'
\`\`\`

**Parametre de Requete**

\`\`\`bash
curl "https://kopern.ai/api/webhook/AGENT_ID?key=kpn_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Bonjour"}'
\`\`\`

### Liaison de Cle

Chaque cle API est liee a un agent specifique. Utiliser une cle avec un autre agent retourne **403 Forbidden**.

### Gestion des Cles

| Operation | Methode | Endpoint |
|-----------|---------|----------|
| Creer une cle | \`POST\` | \`/api/mcp/keys\` |
| Rotation de cle | \`PUT\` | \`/api/mcp/keys\` |
| Supprimer une cle | \`DELETE\` | \`/api/mcp/keys\` |

Les cles sont hashees en SHA-256 avant stockage. La cle en clair est retournee **une seule fois** lors de la creation ou rotation — conservez-la en securite.

---

## Erreurs

Tous les endpoints retournent les erreurs dans un format JSON coherent. L'endpoint compatible OpenAI utilise le format d'erreur OpenAI ; tous les autres endpoints utilisent le format Kopern.

### Format d'Erreur Kopern

\`\`\`json
{
  "error": "Message d'erreur lisible"
}
\`\`\`

### Format d'Erreur Compatible OpenAI

\`\`\`json
{
  "error": {
    "message": "Message d'erreur lisible",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
\`\`\`

### Codes de Statut HTTP

| Code | Signification |
|------|---------------|
| **200** | Succes |
| **204** | Succes (pas de contenu — preflight CORS) |
| **400** | Requete Invalide — JSON invalide ou champs requis manquants |
| **401** | Non Autorise — cle API manquante, invalide ou expiree |
| **403** | Interdit — cle/agent incompatibles, limite de plan depassee, ou fonctionnalite desactivee |
| **404** | Non Trouve — agent, webhook ou serveur inexistant |
| **429** | Trop de Requetes — limite de debit depassee (verifiez le header \`Retry-After\`) |
| **500** | Erreur Serveur — echec interne lors de l'execution de l'agent |

### Erreurs de Validation

Quand la validation du corps de requete echoue, la reponse inclut des details par champ :

\`\`\`json
{
  "error": "Invalid request body",
  "details": [
    "message: String must contain at least 1 character(s)",
    "history.0.role: Invalid enum value"
  ]
}
\`\`\`

---

## Limites de Debit

Tous les endpoints sont soumis a des limites de debit avec des fenetres glissantes. Les limites sont par identifiant (cle API, ID agent ou ID utilisateur selon l'endpoint).

### Limites par Endpoint

| Endpoint | Limite | Fenetre | Identifiant |
|----------|--------|---------|-------------|
| Chat (dashboard) | 30 req | 1 min | userId |
| Widget chat | 20 req | 1 min | Cle API |
| Webhook entrant | 60 req | 1 min | agentId |
| Serveur MCP | 30 req | 1 min | agentId |
| Compatible OpenAI | 30 req | 1 min | agentId |
| Slack / Telegram / WhatsApp | 15 req | 1 min | team/bot/phone |
| Gestion des cles | 60 req | 1 min | defaut |

### Headers de Limite de Debit

En cas de depassement, les reponses incluent :

\`\`\`
HTTP/1.1 429 Too Many Requests
Retry-After: 23
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711382400000
\`\`\`

| Header | Description |
|--------|-------------|
| \`Retry-After\` | Secondes avant que la prochaine requete soit autorisee |
| \`X-RateLimit-Limit\` | Nombre maximum de requetes par fenetre |
| \`X-RateLimit-Remaining\` | Requetes restantes dans la fenetre courante |
| \`X-RateLimit-Reset\` | Timestamp Unix (ms) de reinitialisation de la fenetre |

---

## Limites de Plan

L'acces API est conditionne par votre plan d'abonnement Kopern. Chaque requete verifie :

1. **Budget de tokens** — limite mensuelle d'utilisation de tokens
2. **Limite de connecteurs** — nombre de connecteurs actifs (cles API)

Quand une limite est depassee, l'API retourne **403** avec la raison specifique. Mettez a niveau votre plan dans le dashboard pour augmenter les limites.

---

## Endpoint Compatible OpenAI

Remplacement direct de l'API \`/v1/chat/completions\` d'OpenAI. Utilisez n'importe quel SDK OpenAI ou outil (Cursor, Continue, LiteLLM, etc.) pointe vers votre agent Kopern.

### Creer une Completion de Chat

\`\`\`
POST /api/agents/{agent_id}/v1/chat/completions
\`\`\`

**Authentification :** Bearer token ou parametre \`?key=\`.

### Corps de la Requete

| Parametre | Type | Requis | Description |
|-----------|------|--------|-------------|
| \`messages\` | array | Oui | Tableau d'objets message avec \`role\` et \`content\` |
| \`stream\` | boolean | Non | Si \`true\`, les reponses sont streamees en SSE (defaut : \`false\`) |
| \`model\` | string | Non | Ignore — le modele configure de l'agent est toujours utilise |
| \`temperature\` | number | Non | Ignore — utilisez la configuration de l'agent |

### Objet Message

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| \`role\` | string | Oui | \`"user"\`, \`"assistant"\`, ou \`"system"\` (les messages systeme sont ignores — le prompt systeme de l'agent est utilise) |
| \`content\` | string | Oui | Le contenu du message |

### Reponse Non-Streaming

\`\`\`json
{
  "id": "chatcmpl-m1a2b3c4d5",
  "object": "chat.completion",
  "created": 1711382400,
  "model": "claude-sonnet-4-20250514",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Bonjour ! Comment puis-je vous aider ?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 12,
    "total_tokens": 54
  }
}
\`\`\`

### Reponse Streaming

Quand \`stream: true\`, la reponse est un flux Server-Sent Events :

\`\`\`
data: {"id":"chatcmpl-m1a2b3","object":"chat.completion.chunk","created":1711382400,"model":"claude-sonnet-4-20250514","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-m1a2b3","object":"chat.completion.chunk","created":1711382400,"model":"claude-sonnet-4-20250514","choices":[{"index":0,"delta":{"content":"Bonjour"},"finish_reason":null}]}

data: {"id":"chatcmpl-m1a2b3","object":"chat.completion.chunk","created":1711382400,"model":"claude-sonnet-4-20250514","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
\`\`\`

### Exemple : cURL (Non-Streaming)

\`\`\`bash
curl https://kopern.ai/api/agents/VOTRE_AGENT_ID/v1/chat/completions \\
  -H "Authorization: Bearer kpn_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "user", "content": "Qu est-ce que Kopern ?"}
    ]
  }'
\`\`\`

### Exemple : Python (SDK OpenAI)

\`\`\`python
from openai import OpenAI

client = OpenAI(
    api_key="kpn_votre_cle",
    base_url="https://kopern.ai/api/agents/VOTRE_AGENT_ID/v1"
)

response = client.chat.completions.create(
    model="kopern",  # ignore — le modele de l'agent est utilise
    messages=[
        {"role": "user", "content": "Analysez ces donnees..."}
    ]
)

print(response.choices[0].message.content)
\`\`\`

### Exemple : Python (Streaming)

\`\`\`python
from openai import OpenAI

client = OpenAI(
    api_key="kpn_votre_cle",
    base_url="https://kopern.ai/api/agents/VOTRE_AGENT_ID/v1"
)

stream = client.chat.completions.create(
    model="kopern",
    messages=[{"role": "user", "content": "Ecrivez un poeme"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
\`\`\`

### Exemple : Cursor / Continue IDE

Ajoutez ceci a la configuration de votre IDE :

\`\`\`json
{
  "models": [
    {
      "title": "Mon Agent Kopern",
      "provider": "openai",
      "model": "kopern",
      "apiBase": "https://kopern.ai/api/agents/VOTRE_AGENT_ID/v1",
      "apiKey": "kpn_votre_cle"
    }
  ]
}
\`\`\`

### Exemple : Node.js

\`\`\`javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "kpn_votre_cle",
  baseURL: "https://kopern.ai/api/agents/VOTRE_AGENT_ID/v1",
});

const completion = await client.chat.completions.create({
  model: "kopern",
  messages: [{ role: "user", content: "Bonjour !" }],
});

console.log(completion.choices[0].message.content);
\`\`\`

---

## Webhook Entrant

Envoyez un message a votre agent et recevez une reponse JSON synchrone. Ideal pour les integrations avec n8n, Zapier, Make, ou tout client HTTP.

### Envoyer un Message

\`\`\`
POST /api/webhook/{agent_id}
\`\`\`

**Authentification :** Bearer token ou parametre \`?key=\`.

### Corps de la Requete

| Parametre | Type | Requis | Description |
|-----------|------|--------|-------------|
| \`message\` | string | Oui | Le message a envoyer (1-10 000 caracteres) |
| \`metadata\` | object | Non | Metadonnees cle-valeur injectees dans le contexte de l'agent |
| \`sessionId\` | string | Non | Reutiliser une session existante pour les conversations multi-tours |
| \`webhookId\` | string | Non | Si fourni, la signature HMAC est verifiee avec le secret de ce webhook |

### Verification de Signature HMAC

Pour les webhooks configures avec un secret, incluez la signature dans le header \`X-Webhook-Signature\` :

\`\`\`bash
SIGNATURE=$(echo -n '{"message":"Bonjour"}' | openssl dgst -sha256 -hmac "votre_secret" | cut -d' ' -f2)

curl https://kopern.ai/api/webhook/AGENT_ID?key=kpn_votre_cle \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Signature: $SIGNATURE" \\
  -d '{"message": "Bonjour", "webhookId": "votre_webhook_id"}'
\`\`\`

### Reponse

\`\`\`json
{
  "response": "La reponse textuelle complete de l'agent",
  "ai_generated": true,
  "metrics": {
    "inputTokens": 156,
    "outputTokens": 423,
    "toolCallCount": 2
  }
}
\`\`\`

### Exemple : cURL

\`\`\`bash
curl -X POST https://kopern.ai/api/webhook/VOTRE_AGENT_ID \\
  -H "Authorization: Bearer kpn_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Resume le dernier rapport de ventes",
    "metadata": {
      "source": "crm",
      "priorite": "haute"
    }
  }'
\`\`\`

### Exemple : Python

\`\`\`python
import requests

response = requests.post(
    "https://kopern.ai/api/webhook/VOTRE_AGENT_ID",
    headers={
        "Authorization": "Bearer kpn_votre_cle",
        "Content-Type": "application/json",
    },
    json={
        "message": "Quel est le statut de la commande #12345 ?",
        "metadata": {"orderId": "12345"},
    },
)

data = response.json()
print(data["response"])
print(f"Tokens utilises: {data['metrics']['inputTokens'] + data['metrics']['outputTokens']}")
\`\`\`

### Exemple : n8n (Noeud HTTP Request)

1. Ajoutez un noeud **HTTP Request**
2. Definissez la **Methode** sur \`POST\`
3. Definissez l'**URL** sur \`https://kopern.ai/api/webhook/VOTRE_AGENT_ID?key=kpn_votre_cle\`
4. Definissez le **Type de Corps** sur \`JSON\`
5. Definissez le **Corps** sur :
\`\`\`json
{
  "message": "{{ $json.input_text }}"
}
\`\`\`
6. La reponse est disponible dans \`{{ $json.response }}\`

### Exemple : Zapier (Custom Request)

1. Ajoutez une action **Webhooks by Zapier** > **Custom Request**
2. Definissez la **Methode** sur \`POST\`
3. Definissez l'**URL** sur \`https://kopern.ai/api/webhook/VOTRE_AGENT_ID\`
4. Definissez les **Headers** : \`Authorization: Bearer kpn_votre_cle\` et \`Content-Type: application/json\`
5. Definissez les **Donnees** sur : \`{"message": "Votre contenu dynamique ici"}\`

### Exemple : Make (Module HTTP)

1. Ajoutez un module **HTTP > Make a request**
2. Definissez l'**URL** sur \`https://kopern.ai/api/webhook/VOTRE_AGENT_ID?key=kpn_votre_cle\`
3. Definissez la **Methode** sur \`POST\`
4. Definissez le **Type de corps** sur \`Raw\`, **Type de contenu** sur \`JSON\`
5. Definissez le **Contenu de la requete** sur : \`{"message": "Votre message"}\`

---

## Widget Chat

Endpoint SSE streaming pour le widget de chat embarquable. Peut aussi etre utilise directement pour des interfaces de chat personnalisees.

### Envoyer un Message (Streaming)

\`\`\`
POST /api/widget/chat
\`\`\`

**Authentification :** Bearer token ou parametre \`?key=\`.

### Corps de la Requete

| Parametre | Type | Requis | Description |
|-----------|------|--------|-------------|
| \`message\` | string | Oui | Le message a envoyer (1-10 000 caracteres) |
| \`history\` | array | Non | Historique de conversation (max 50 messages) |
| \`sessionId\` | string | Non | Reutiliser une session existante |

### Element d'Historique

| Champ | Type | Requis |
|-------|------|--------|
| \`role\` | \`"user"\` ou \`"assistant"\` | Oui |
| \`content\` | string | Oui |

### Flux d'Evenements SSE

La reponse est un flux Server-Sent Events avec des evenements types :

| Evenement | Donnees | Description |
|-----------|---------|-------------|
| \`status\` | \`{"status": "thinking"}\` | L'agent reflechit |
| \`token\` | \`{"text": "Bonjour"}\` | Un token de texte de l'agent |
| \`tool_start\` | \`{"name": "search_files"}\` | Un appel de tool a commence |
| \`tool_end\` | \`{"name": "search_files", "isError": false}\` | Un appel de tool est termine |
| \`done\` | \`{"metrics": {...}}\` | Reponse terminee |
| \`error\` | \`{"message": "..."}\` | Une erreur est survenue |

### Metriques de l'Evenement Done

\`\`\`json
{
  "metrics": {
    "inputTokens": 156,
    "outputTokens": 423,
    "estimatedCost": 0.0023
  }
}
\`\`\`

### CORS

L'endpoint widget supporte CORS. Les origines autorisees sont configurees dans les parametres du widget. Si aucune origine n'est configuree, toutes les origines sont acceptees.

---

## Configuration du Widget

Recuperer la configuration du widget pour afficher la bulle de chat.

### Obtenir la Configuration

\`\`\`
GET /api/widget/config?key=kpn_votre_cle
\`\`\`

**Authentification :** parametre \`?key=\` uniquement.

### Reponse

\`\`\`json
{
  "welcomeMessage": "Bonjour ! Comment puis-je vous aider ?",
  "position": "bottom-right",
  "showPoweredBy": true,
  "agentName": "Agent Support"
}
\`\`\`

| Champ | Type | Description |
|-------|------|-------------|
| \`welcomeMessage\` | string | Le message d'accueil affiche a l'ouverture du widget |
| \`position\` | string | \`"bottom-right"\` ou \`"bottom-left"\` |
| \`showPoweredBy\` | boolean | Si "Powered by Kopern" est affiche |
| \`agentName\` | string | Le nom d'affichage de l'agent |

---

## Script du Widget

Servir le JavaScript du widget embarquable pour les sites externes.

### Obtenir le Script

\`\`\`
GET /api/widget/script?key=kpn_votre_cle
\`\`\`

Retourne le JavaScript du widget (~15Ko). Integrez-le sur votre site :

\`\`\`html
<script
  src="https://kopern.ai/api/widget/script?key=kpn_votre_cle"
  data-key="kpn_votre_cle"
  async>
</script>
\`\`\`

Le widget s'affiche dans un Shadow DOM pour l'isolation CSS, supporte le markdown et est responsive mobile (plein ecran en dessous de 640px).

---

## Serveur MCP (HTTP Streamable)

Implementation complete du protocole MCP (spec 2024-11-05) pour Claude Code, Cursor, Windsurf, ou tout client MCP.

### Endpoint

\`\`\`
POST /api/mcp/server
\`\`\`

**Authentification :** Bearer token ou parametre \`?key=\`.

### Protocole

L'endpoint implemente le transport HTTP Streamable de MCP. Les requetes et reponses utilisent JSON-RPC 2.0.

### Methodes Supportees

| Methode | Description |
|---------|-------------|
| \`initialize\` | Handshake — retourne la version du protocole et les capacites |
| \`tools/list\` | Lister les outils disponibles (32 outils — agent CRUD, grading, optimisation, equipes, connecteurs, monitoring, portabilite) |
| \`tools/call\` | Executer un outil |
| \`ping\` | Verification de connexion |

### Configuration Client MCP

Ajoutez ceci a votre \`.mcp.json\` (Claude Code, Cursor, etc.) :

\`\`\`json
{
  "mcpServers": {
    "mon-agent-kopern": {
      "type": "http",
      "url": "https://kopern.ai/api/mcp/server",
      "headers": {
        "Authorization": "Bearer kpn_votre_cle"
      }
    }
  }
}
\`\`\`

---

## Gestion des Cles API

Creer, tourner et supprimer des cles API par programmation. Ces endpoints necessitent une authentification **Firebase Auth** (pas une cle API) — ils sont destines aux integrations dashboard.

### Creer une Cle API

\`\`\`
POST /api/mcp/keys
\`\`\`

**Authentification :** Token ID Firebase (Bearer).

### Corps de la Requete

| Parametre | Type | Requis | Description |
|-----------|------|--------|-------------|
| \`agentId\` | string | Oui | L'agent auquel lier la cle |
| \`name\` | string | Oui | Nom lisible pour la cle |
| \`description\` | string | Non | Description optionnelle |
| \`rateLimitPerMinute\` | number | Non | Limite de debit personnalisee (defaut : 60) |

### Reponse

\`\`\`json
{
  "serverId": "abc123def456",
  "apiKey": "kpn_a1b2c3d4e5f6...",
  "apiKeyPrefix": "kpn_a1b2"
}
\`\`\`

> **Important :** La \`apiKey\` complete est retournee **une seule fois**. Conservez-la en securite.

### Rotation de Cle

\`\`\`
PUT /api/mcp/keys
\`\`\`

L'ancienne cle est desactivee immediatement avec une piste d'audit (\`rotatedTo\`, \`rotatedAt\`).

### Supprimer une Cle

\`\`\`
DELETE /api/mcp/keys?agentId=AGENT_ID&serverId=SERVER_ID
\`\`\`

---

## Bot Slack

Connectez votre agent Kopern a Slack. Le bot repond aux mentions et DMs dans votre workspace.

### Flux d'Installation

1. **Generer l'URL d'installation :** \`GET /api/slack/install?agentId=AGENT_ID\` — retourne l'URL OAuth Slack
2. **L'utilisateur autorise :** Slack redirige vers \`/api/slack/oauth\` avec un code d'autorisation
3. **Token stocke :** Kopern echange le code contre un bot token, le stocke de maniere securisee
4. **Bot actif :** L'agent repond maintenant aux \`@mentions\` et DMs

### Fonctionnement

1. Slack envoie un evenement a \`/api/slack/events\`
2. Kopern verifie le header \`X-Slack-Signature\`
3. Recherche l'equipe Slack dans l'index \`slackTeams/{teamId}\` pour un routage O(1)
4. Charge l'agent lie et execute \`runAgentWithTools()\`
5. Publie la reponse dans le meme thread Slack
6. Ajoute une reaction checkmark sur le message original

### Formatage

Kopern convertit automatiquement le markdown en format \`mrkdwn\` Slack :
- \`**gras**\` → \`*gras*\`
- \`*italique*\` → \`_italique_\`
- Tableaux → paires cle-valeur
- Blocs de code preserves tels quels

---

## Bot Telegram

Connectez votre agent Kopern a Telegram.

### Configuration

1. Creez un bot avec \`@BotFather\` sur Telegram et obtenez le token du bot
2. Dans le dashboard Kopern, allez a **Agent > Connecteurs > Telegram**
3. Collez le token du bot — Kopern appelle \`setWebhook\` automatiquement

---

## WhatsApp

Connectez votre agent Kopern a WhatsApp via l'API Cloud de Meta.

### Configuration

1. Configurez un compte Meta Business et la plateforme WhatsApp Business
2. Obtenez votre **Phone Number ID** et **Access Token**
3. Dans le dashboard Kopern, allez a **Agent > Connecteurs > WhatsApp**
4. Entrez vos identifiants — Kopern configure le webhook automatiquement

---

## Verification de Sante

Verification de disponibilite simple pour le monitoring.

### Verifier la Sante

\`\`\`
GET /api/health
\`\`\`

**Authentification :** Aucune requise.

### Reponse

\`\`\`json
{
  "status": "ok",
  "timestamp": "2026-03-25T14:30:00.000Z"
}
\`\`\`

---

## Webhooks Sortants

Kopern peut envoyer des notifications webhook vers des URLs externes lorsque des evenements se produisent pendant l'execution de l'agent. Les webhooks sortants sont configures dans le dashboard.

### Types d'Evenements

| Evenement | Declencheur |
|-----------|-------------|
| \`message_sent\` | L'agent envoie une reponse |
| \`tool_call_completed\` | Un tool termine son execution |
| \`session_ended\` | Une session de conversation se termine |
| \`error\` | Une erreur survient pendant l'execution |

### Format du Payload

\`\`\`json
{
  "event": "message_sent",
  "agentId": "abc123",
  "timestamp": "2026-03-25T14:30:00.000Z",
  "data": {
    "response": "Le texte de reponse de l'agent",
    "metrics": {
      "inputTokens": 156,
      "outputTokens": 423
    }
  }
}
\`\`\`

### Signature HMAC

Si un secret est configure, les webhooks sortants incluent un header \`X-Webhook-Signature\` avec une signature HMAC-SHA256 du corps du payload.

### Exemple de Verification (Node.js)

\`\`\`javascript
import crypto from "crypto";

function verifySignature(body, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
\`\`\`

### Protection Anti-Boucle

Les webhooks sortants ne sont **jamais declenches** depuis :
- Les appels webhook entrants
- Le widget chat
- Les messages Slack, Telegram ou WhatsApp
- Les appels serveur MCP
- Les appels endpoint compatible OpenAI

Ceci empeche les boucles infinies ou un webhook sortant declencherait un appel entrant qui declencherait un autre webhook sortant.

---

## Exemples SDK

### Python — Conversation Complete

\`\`\`python
import requests

BASE = "https://kopern.ai"
AGENT_ID = "votre_agent_id"
API_KEY = "kpn_votre_cle"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# Tour 1
r1 = requests.post(
    f"{BASE}/api/webhook/{AGENT_ID}",
    headers=HEADERS,
    json={"message": "Je m'appelle Alice"},
)
print(r1.json()["response"])

# Tour 2 (le webhook est stateless — chaque appel est independant)
r2 = requests.post(
    f"{BASE}/api/webhook/{AGENT_ID}",
    headers=HEADERS,
    json={"message": "Quels outils avez-vous ?"},
)
print(r2.json()["response"])
\`\`\`

### Node.js — Streaming avec SDK OpenAI

\`\`\`javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "kpn_votre_cle",
  baseURL: "https://kopern.ai/api/agents/VOTRE_AGENT_ID/v1",
});

async function chat(userMessage) {
  const stream = await client.chat.completions.create({
    model: "kopern",
    messages: [{ role: "user", content: userMessage }],
    stream: true,
  });

  let fullResponse = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    process.stdout.write(content);
    fullResponse += content;
  }
  console.log();
  return fullResponse;
}

await chat("Expliquez l'architecture de ce projet");
\`\`\`

### Go — Integration Webhook

\`\`\`go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func main() {
    payload := map[string]interface{}{
        "message": "Analysez les derniers logs de deploiement",
        "metadata": map[string]string{
            "environment": "production",
        },
    }

    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest(
        "POST",
        "https://kopern.ai/api/webhook/VOTRE_AGENT_ID",
        bytes.NewReader(body),
    )
    req.Header.Set("Authorization", "Bearer kpn_votre_cle")
    req.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}
\`\`\`

---

## Journal des Modifications

| Date | Changement |
|------|------------|
| 2026-03-25 | Ajout de l'endpoint compatible OpenAI (\`/v1/chat/completions\`) |
| 2026-03-20 | Ajout des connecteurs Telegram et WhatsApp |
| 2026-03-15 | Ajout du connecteur Slack |
| 2026-03-12 | Ajout des webhooks entrants/sortants avec HMAC |
| 2026-03-10 | Ajout du widget embarquable (chat, config, script) |
| 2026-04-02 | MCP v2.0.0 — 32 outils couvrant le cycle complet agent, cles user-level, self-hosted Docker |
| 2026-04-01 | MCP v1.1.0 — 19 outils (agent CRUD, grading, equipes, connecteurs) |
| 2026-03-01 | Ajout du serveur MCP HTTP Streamable |
| 2026-02-15 | API initiale avec endpoint MCP legacy |
`;
