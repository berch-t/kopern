// Connector Tutorials — Complete step-by-step guides for Widget, Webhooks, and Slack Bot

export const connectorTutorials = {
  en: {
    slack: `## Connect Your Agent to Slack

Deploy your Kopern agent directly into your Slack workspace. Team members can mention it in channels or send it direct messages.

---

### Prerequisites

- A Kopern agent already created and tested in the Playground
- Admin access to a Slack workspace (or permission to install apps)
- A Kopern plan that includes connectors (Pro or higher)

---

### Step 1 — Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**
2. Choose **From scratch**
3. Enter a name (e.g. "Kopern Agent" or your agent's name)
4. Select the workspace where you want to install the bot
5. Click **Create App**

---

### Step 2 — Configure OAuth Scopes

In your Slack App settings:

1. Navigate to **OAuth & Permissions** in the left sidebar
2. Scroll to **Scopes** > **Bot Token Scopes**
3. Add the following scopes:

| Scope | Purpose |
|-------|---------|
| \`chat:write\` | Send messages as the bot |
| \`app_mentions:read\` | Detect @mentions in channels |
| \`channels:history\` | Read public channel messages |
| \`channels:read\` | List available channels |
| \`groups:history\` | Read private channel messages |
| \`groups:read\` | List private channels |
| \`im:history\` | Read direct messages |
| \`im:read\` | Access DM conversations |
| \`im:write\` | Send direct messages |
| \`reactions:write\` | Add emoji reactions to messages |

---

### Step 3 — Configure Event Subscriptions

1. Navigate to **Event Subscriptions** in the left sidebar
2. Toggle **Enable Events** to ON
3. In **Request URL**, enter:

\`\`\`
https://kopern.vercel.app/api/slack/events
\`\`\`

> Slack will send a verification challenge — it should pass automatically.

4. Under **Subscribe to bot events**, add:

| Event | Purpose |
|-------|---------|
| \`app_mention\` | Triggers when someone @mentions the bot |
| \`message.im\` | Triggers on direct messages to the bot |

5. Click **Save Changes**

---

### Step 4 — Get Your App Credentials

1. Navigate to **Basic Information** in the left sidebar
2. Under **App Credentials**, note down:
   - **Client ID**
   - **Client Secret**
   - **Signing Secret**

> These credentials are configured on the Kopern server side. If you're self-hosting, add them as environment variables:

\`\`\`bash
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret
\`\`\`

---

### Step 5 — Connect from Kopern Dashboard

1. Open your agent in the Kopern dashboard
2. Go to the **Connectors** tab
3. Click **Connect to Slack** on the Slack Bot card
4. Click the **Connect to Slack** button — this redirects to Slack's OAuth flow
5. Select your workspace and click **Allow**
6. You'll be redirected back to Kopern — the connection status will show **Connected**

---

### Step 6 — Invite the Bot to a Channel

In your Slack workspace:

1. Open the channel where you want the bot active
2. Type \`/invite @YourBotName\` (replace with your bot's name)
3. The bot is now ready to respond

---

### Usage

**Mention in a channel:**
\`\`\`
@YourBot What's the status of project X?
\`\`\`

**Direct message:**
Simply open a DM with the bot and type your question.

**Thread replies:**
Reply in a thread — the bot maintains conversation context across thread messages.

---

### Built-in Capabilities

When connected to Slack, your agent automatically gets access to:

| Tool | Description |
|------|-------------|
| \`slack_read_messages\` | Read messages from any channel the bot is in |
| \`slack_list_channels\` | List all accessible channels |

These tools are **built-in** — no custom tool configuration needed. They use the bot's OAuth token to access the Slack API securely.

---

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot doesn't respond | Check that the bot is invited to the channel (\`/invite @bot\`) |
| "Channel not found" error | Verify the bot has \`channels:history\` scope |
| Bot can't read messages | Make sure the bot is a **member** of the channel |
| "Permission denied" error | Reinstall the app with the correct scopes |
| Delayed responses | The bot processes messages asynchronously — allow a few seconds |
| Bot responds to itself | This is handled automatically (bot messages are skipped) |

---

### Security Notes

- The bot token is stored securely in Firestore (server-side only)
- All requests from Slack are verified via HMAC-SHA256 signature
- Replay attacks are blocked (5-minute timestamp window)
- The bot only responds to direct mentions and DMs — it won't read all messages passively
`,

    widget: `## Embed the Chat Widget on Your Website

Add an AI chat widget to any website with a single \`<script>\` tag. Your visitors can chat with your Kopern agent without leaving your site.

---

### Prerequisites

- A Kopern agent already created and tested in the Playground
- A website where you can add HTML/JavaScript
- A Kopern plan that includes connectors (Pro or higher)

---

### Step 1 — Enable the Widget

1. Open your agent in the Kopern dashboard
2. Go to the **Connectors** tab
3. Click **Configure Widget** on the Chat Widget card
4. Toggle the **Enable** switch to ON

---

### Step 2 — Generate an API Key

1. In the Widget configuration panel, click **Generate API Key**
2. **Copy and save the key immediately** — it won't be shown again
3. The key starts with \`kpn_\` (e.g. \`kpn_a1b2c3d4...\`)

> This is the same API key format used for MCP connections.

---

### Step 3 — Configure the Widget

Customize the widget appearance:

| Setting | Description |
|---------|-------------|
| **Welcome message** | First message shown when the chat opens |
| **Position** | Bottom-right or bottom-left corner |
| **Powered by Kopern** | Badge shown on Starter plan, removable on Pro+ |
| **Allowed origins** | CORS whitelist — restrict which domains can use the widget |

> **Security tip:** Always set allowed origins in production to prevent unauthorized usage of your API key.

---

### Step 4 — Add the Embed Snippet

Copy the embed snippet from the configuration panel and paste it before the closing \`</body>\` tag of your website:

\`\`\`html
<script
  src="https://kopern.vercel.app/api/widget/script"
  data-key="kpn_YOUR_API_KEY_HERE"
  data-agent="YOUR_AGENT_ID"
  async
></script>
\`\`\`

That's it! A chat bubble will appear on your website.

---

### Step 5 — Test the Widget

1. Open your website in a browser
2. Click the chat bubble in the bottom corner
3. Type a message — the agent should respond with streaming text
4. Test on mobile — the widget goes full-screen on screens < 640px

---

### Advanced Configuration

#### Restrict to Specific Domains

In the **Allowed origins** field, add your domains (one per line):

\`\`\`
https://mysite.com
https://www.mysite.com
https://app.mysite.com
\`\`\`

> Leave empty during development to allow all origins.

#### Custom Styling

The widget uses **Shadow DOM** for complete CSS isolation — it won't conflict with your site's styles, and your styles won't affect it.

---

### How It Works

\`\`\`
Your website                    Kopern
──────────                      ──────
<script data-key="kpn_xxx">
  ↓
Chat bubble (Shadow DOM)  →  POST /api/widget/chat (SSE)
  ↓                              ↓
User types message        →  runAgentWithTools()
  ↓                              ↓
Streaming response        ←  Token-by-token via SSE
\`\`\`

- **Shadow DOM** ensures complete CSS isolation
- **SSE (Server-Sent Events)** enables real-time streaming responses
- **Markdown rendering** supports bold, italic, code blocks, lists, and links
- **Tool calls** are shown as "Processing..." indicators during execution

---

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget doesn't appear | Check browser console for CORS errors |
| CORS error | Add your domain to **Allowed origins** |
| "Invalid API key" | Verify the \`data-key\` attribute matches your generated key |
| Widget style conflicts | The widget uses Shadow DOM — conflicts shouldn't occur |
| Slow responses | Response time depends on the LLM provider and model selected |
| Widget on mobile | Automatically switches to full-screen mode on screens < 640px |

---

### Security Notes

- API key is validated server-side on every request
- CORS headers are set dynamically from your allowed origins list
- The widget cannot access your page's DOM (Shadow DOM isolation)
- Usage is tracked and billed to the agent owner's account
- Rate limiting is enforced by plan limits
`,

    webhooks: `## Connect Your Agent via Webhooks

Use webhooks to integrate your Kopern agent with any external service — automation platforms (n8n, Make, Zapier), CRMs, monitoring tools, or custom applications.

---

### Prerequisites

- A Kopern agent already created and tested in the Playground
- An API key (generated from the Widget or MCP settings)
- A Kopern plan that includes connectors (Pro or higher)

---

### Concepts

| Type | Direction | Description |
|------|-----------|-------------|
| **Inbound** | External → Agent | An external service sends a message to your agent and gets a JSON response |
| **Outbound** | Agent → External | Your agent sends events (message sent, tool call, etc.) to an external URL |

---

## Inbound Webhooks

### Endpoint

\`\`\`
POST https://kopern.vercel.app/api/webhook/{agentId}?key=kpn_YOUR_API_KEY
\`\`\`

### Request Format

\`\`\`json
{
  "message": "Your message to the agent",
  "systemPrompt": "(optional) Override the agent's system prompt",
  "sessionId": "(optional) Continue a previous conversation"
}
\`\`\`

### Response Format

\`\`\`json
{
  "response": "The agent's full response text",
  "metrics": {
    "inputTokens": 150,
    "outputTokens": 320,
    "toolCallCount": 1,
    "toolIterations": 1
  }
}
\`\`\`

> **Note:** Inbound webhooks return a synchronous JSON response (NOT streaming SSE). This ensures compatibility with all webhook consumers.

### HMAC Signature Verification (Optional)

For extra security, configure an HMAC secret on the webhook. The request will include a signature header:

\`\`\`
X-Webhook-Signature: sha256=<hex_digest>
\`\`\`

Verify it in your code:

\`\`\`javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', YOUR_HMAC_SECRET)
  .update(requestBody)
  .digest('hex');
const expected = 'sha256=' + signature;
// Compare with X-Webhook-Signature header
\`\`\`

### Quick Test with curl

\`\`\`bash
curl -X POST "https://kopern.vercel.app/api/webhook/YOUR_AGENT_ID?key=kpn_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, what can you do?"}'
\`\`\`

---

## Outbound Webhooks

Outbound webhooks fire when specific events occur in your agent.

### Available Events

| Event | Triggered when |
|-------|---------------|
| \`message_sent\` | Agent finishes responding to a message |
| \`tool_call_completed\` | Agent completes a tool call |
| \`session_ended\` | A conversation session ends |
| \`error\` | An error occurs during processing |

### Payload Format

\`\`\`json
{
  "event": "message_sent",
  "agentId": "abc123",
  "timestamp": "2026-03-22T10:30:00.000Z",
  "data": {
    "inputTokens": 150,
    "outputTokens": 320,
    "toolCallCount": 1
  }
}
\`\`\`

### Setup

1. Go to **Connectors** > **Webhooks** > **Create**
2. Select **Outbound**
3. Enter the target URL of your service
4. Select which events to trigger on
5. Optionally add an HMAC secret
6. Click **Save**

---

## Integration with n8n

### Inbound (n8n → Agent)

1. In n8n, add an **HTTP Request** node
2. Configure:
   - **Method:** POST
   - **URL:** \`https://kopern.vercel.app/api/webhook/YOUR_AGENT_ID?key=kpn_YOUR_KEY\`
   - **Body Content Type:** JSON
   - **Body:**
   \`\`\`json
   {
     "message": "{{ $json.data }}"
   }
   \`\`\`
3. The response will be in \`$json.response\`

### Outbound (Agent → n8n)

1. In n8n, add a **Webhook** trigger node
2. Set it to **POST** method
3. Copy the n8n webhook URL (e.g. \`https://your-n8n.com/webhook/abc123\`)
4. In Kopern, create an **Outbound** webhook with this URL
5. Select the events you want to trigger on
6. n8n will receive the event payload in \`$json.data\`

### Example n8n Workflow

\`\`\`
Slack Trigger → HTTP Request (Kopern) → Slack Send Message
\`\`\`

This creates a Slack bot powered by your Kopern agent, orchestrated through n8n.

---

## Integration with Make (Integromat)

### Inbound (Make → Agent)

1. Add an **HTTP** > **Make a request** module
2. Configure:
   - **URL:** \`https://kopern.vercel.app/api/webhook/YOUR_AGENT_ID?key=kpn_YOUR_KEY\`
   - **Method:** POST
   - **Body type:** Raw
   - **Content type:** JSON
   - **Request content:**
   \`\`\`json
   {"message": "{{1.text}}"}
   \`\`\`
3. Parse the response with a **JSON** > **Parse JSON** module
4. Use \`response\` from the parsed output

### Outbound (Agent → Make)

1. Create a new scenario with a **Webhooks** > **Custom webhook** trigger
2. Copy the Make webhook URL
3. In Kopern, create an **Outbound** webhook pointing to this URL
4. Run a test message in the Kopern Playground to let Make capture the data structure
5. Click **Redetermine data structure** in Make

---

## Integration with Zapier

### Inbound (Zapier → Agent)

1. Add a **Webhooks by Zapier** > **Custom Request** action
2. Configure:
   - **Method:** POST
   - **URL:** \`https://kopern.vercel.app/api/webhook/YOUR_AGENT_ID?key=kpn_YOUR_KEY\`
   - **Data:**
   \`\`\`
   {"message": "Your dynamic content here"}
   \`\`\`
   - **Headers:**
   \`\`\`
   Content-Type: application/json
   \`\`\`
3. The agent response is available in subsequent steps as \`Response > response\`

### Outbound (Agent → Zapier)

1. Create a new Zap with **Webhooks by Zapier** > **Catch Hook** trigger
2. Copy the Zapier webhook URL
3. In Kopern, create an **Outbound** webhook with this URL
4. Send a test message via the Playground
5. Click **Test trigger** in Zapier to capture the payload

---

## Anti-Loop Protection

> **Important:** Inbound webhooks do NOT fire outbound webhooks. This prevents infinite loops where an inbound webhook triggers an outbound webhook, which triggers another inbound, etc.

If you need to chain agents, use the outbound webhook of Agent A to trigger the inbound webhook of Agent B — but never loop back to Agent A.

---

### Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check your API key (\`?key=kpn_...\`) |
| 404 Not Found | Verify the agent ID in the URL |
| Empty response | The agent may have no system prompt — test in Playground first |
| Timeout | Large responses may take 30s+ — increase timeout in your automation tool |
| HMAC mismatch | Ensure the raw body is used for signature computation (not parsed JSON) |
| Outbound not firing | Check that the webhook is enabled and the event type matches |
`,
  },

  fr: {
    slack: `## Connecter votre Agent a Slack

Deployez votre agent Kopern directement dans votre workspace Slack. Les membres de l'equipe peuvent le mentionner dans les channels ou lui envoyer des messages directs.

---

### Prerequis

- Un agent Kopern deja cree et teste dans le Playground
- Un acces administrateur a un workspace Slack (ou la permission d'installer des apps)
- Un plan Kopern incluant les connecteurs (Pro ou superieur)

---

### Etape 1 — Creer une App Slack

1. Allez sur [api.slack.com/apps](https://api.slack.com/apps) et cliquez **Create New App**
2. Choisissez **From scratch**
3. Entrez un nom (ex. "Kopern Agent" ou le nom de votre agent)
4. Selectionnez le workspace ou vous voulez installer le bot
5. Cliquez **Create App**

---

### Etape 2 — Configurer les Scopes OAuth

Dans les parametres de votre App Slack :

1. Allez dans **OAuth & Permissions** dans le menu lateral
2. Descendez jusqu'a **Scopes** > **Bot Token Scopes**
3. Ajoutez les scopes suivants :

| Scope | Usage |
|-------|-------|
| \`chat:write\` | Envoyer des messages en tant que bot |
| \`app_mentions:read\` | Detecter les @mentions dans les channels |
| \`channels:history\` | Lire les messages des channels publics |
| \`channels:read\` | Lister les channels disponibles |
| \`groups:history\` | Lire les messages des channels prives |
| \`groups:read\` | Lister les channels prives |
| \`im:history\` | Lire les messages directs |
| \`im:read\` | Acceder aux conversations DM |
| \`im:write\` | Envoyer des messages directs |
| \`reactions:write\` | Ajouter des reactions emoji aux messages |

---

### Etape 3 — Configurer les Event Subscriptions

1. Allez dans **Event Subscriptions** dans le menu lateral
2. Activez **Enable Events** (ON)
3. Dans **Request URL**, entrez :

\`\`\`
https://kopern.vercel.app/api/slack/events
\`\`\`

> Slack enverra un challenge de verification — il devrait passer automatiquement.

4. Sous **Subscribe to bot events**, ajoutez :

| Evenement | Usage |
|-----------|-------|
| \`app_mention\` | Se declenche quand quelqu'un @mentionne le bot |
| \`message.im\` | Se declenche sur les messages directs au bot |

5. Cliquez **Save Changes**

---

### Etape 4 — Recuperer vos Identifiants

1. Allez dans **Basic Information** dans le menu lateral
2. Sous **App Credentials**, notez :
   - **Client ID**
   - **Client Secret**
   - **Signing Secret**

> Ces identifiants sont configures cote serveur Kopern. Si vous hebergez vous-meme, ajoutez-les comme variables d'environnement :

\`\`\`bash
SLACK_CLIENT_ID=votre_client_id
SLACK_CLIENT_SECRET=votre_client_secret
SLACK_SIGNING_SECRET=votre_signing_secret
\`\`\`

---

### Etape 5 — Connecter depuis le Dashboard Kopern

1. Ouvrez votre agent dans le dashboard Kopern
2. Allez dans l'onglet **Connecteurs**
3. Cliquez **Connecter a Slack** sur la carte Bot Slack
4. Cliquez le bouton **Connecter a Slack** — vous serez redirige vers le flux OAuth Slack
5. Selectionnez votre workspace et cliquez **Autoriser**
6. Vous serez redirige vers Kopern — le statut affichera **Connecte**

---

### Etape 6 — Inviter le Bot dans un Channel

Dans votre workspace Slack :

1. Ouvrez le channel ou vous voulez que le bot soit actif
2. Tapez \`/invite @NomDuBot\` (remplacez par le nom de votre bot)
3. Le bot est maintenant pret a repondre

---

### Utilisation

**Mention dans un channel :**
\`\`\`
@VotreBot Quel est le statut du projet X ?
\`\`\`

**Message direct :**
Ouvrez simplement un DM avec le bot et tapez votre question.

**Reponses en thread :**
Repondez dans un thread — le bot conserve le contexte de la conversation entre les messages.

---

### Capacites Integrees

Quand il est connecte a Slack, votre agent obtient automatiquement acces a :

| Outil | Description |
|-------|-------------|
| \`slack_read_messages\` | Lire les messages de n'importe quel channel ou le bot est present |
| \`slack_list_channels\` | Lister tous les channels accessibles |

Ces outils sont **integres** — aucune configuration de tool personnalise necessaire. Ils utilisent le token OAuth du bot pour acceder a l'API Slack de maniere securisee.

---

### Depannage

| Probleme | Solution |
|----------|----------|
| Le bot ne repond pas | Verifiez qu'il est invite dans le channel (\`/invite @bot\`) |
| Erreur "Channel not found" | Verifiez que le bot a le scope \`channels:history\` |
| Le bot ne peut pas lire les messages | Assurez-vous que le bot est **membre** du channel |
| Erreur "Permission denied" | Reinstallez l'app avec les bons scopes |
| Reponses lentes | Le bot traite les messages de maniere asynchrone — attendez quelques secondes |
| Le bot se repond a lui-meme | C'est gere automatiquement (les messages du bot sont ignores) |

---

### Notes de Securite

- Le token du bot est stocke de maniere securisee dans Firestore (cote serveur uniquement)
- Toutes les requetes Slack sont verifiees via signature HMAC-SHA256
- Les attaques par rejeu sont bloquees (fenetre de 5 minutes)
- Le bot ne repond qu'aux mentions directes et DMs — il ne lit pas passivement tous les messages
`,

    widget: `## Integrer le Widget Chat sur votre Site Web

Ajoutez un widget de chat IA a n'importe quel site web avec une simple balise \`<script>\`. Vos visiteurs peuvent discuter avec votre agent Kopern sans quitter votre site.

---

### Prerequis

- Un agent Kopern deja cree et teste dans le Playground
- Un site web ou vous pouvez ajouter du HTML/JavaScript
- Un plan Kopern incluant les connecteurs (Pro ou superieur)

---

### Etape 1 — Activer le Widget

1. Ouvrez votre agent dans le dashboard Kopern
2. Allez dans l'onglet **Connecteurs**
3. Cliquez **Configurer le Widget** sur la carte Widget Chat
4. Activez le switch **Enable** (ON)

---

### Etape 2 — Generer une Cle API

1. Dans le panneau de configuration du widget, cliquez **Generer une cle API**
2. **Copiez et sauvegardez la cle immediatement** — elle ne sera plus affichee
3. La cle commence par \`kpn_\` (ex. \`kpn_a1b2c3d4...\`)

> C'est le meme format de cle API que pour les connexions MCP.

---

### Etape 3 — Configurer le Widget

Personnalisez l'apparence du widget :

| Parametre | Description |
|-----------|-------------|
| **Message d'accueil** | Premier message affiche a l'ouverture du chat |
| **Position** | Coin inferieur droit ou inferieur gauche |
| **Powered by Kopern** | Badge affiche sur le plan Starter, masquable en Pro+ |
| **Origines autorisees** | Liste blanche CORS — limitez les domaines pouvant utiliser le widget |

> **Conseil securite :** Definissez toujours les origines autorisees en production pour empecher l'utilisation non autorisee de votre cle API.

---

### Etape 4 — Ajouter le Code d'Integration

Copiez le code d'integration depuis le panneau de configuration et collez-le avant la balise fermante \`</body>\` de votre site :

\`\`\`html
<script
  src="https://kopern.vercel.app/api/widget/script"
  data-key="kpn_VOTRE_CLE_API_ICI"
  data-agent="VOTRE_AGENT_ID"
  async
></script>
\`\`\`

C'est tout ! Une bulle de chat apparaitra sur votre site.

---

### Etape 5 — Tester le Widget

1. Ouvrez votre site dans un navigateur
2. Cliquez sur la bulle de chat dans le coin inferieur
3. Tapez un message — l'agent devrait repondre avec du texte en streaming
4. Testez sur mobile — le widget passe en plein ecran sur les ecrans < 640px

---

### Configuration Avancee

#### Restreindre a des Domaines Specifiques

Dans le champ **Origines autorisees**, ajoutez vos domaines (un par ligne) :

\`\`\`
https://monsite.com
https://www.monsite.com
https://app.monsite.com
\`\`\`

> Laissez vide pendant le developpement pour autoriser toutes les origines.

#### Style Personnalise

Le widget utilise le **Shadow DOM** pour une isolation CSS complete — il n'interferera pas avec les styles de votre site, et vos styles ne l'affecteront pas.

---

### Comment ca Marche

\`\`\`
Votre site web                  Kopern
────────────                    ──────
<script data-key="kpn_xxx">
  ↓
Bulle de chat (Shadow DOM) →  POST /api/widget/chat (SSE)
  ↓                                ↓
L'utilisateur tape         →  runAgentWithTools()
  ↓                                ↓
Reponse en streaming       ←  Token par token via SSE
\`\`\`

- **Shadow DOM** assure une isolation CSS complete
- **SSE (Server-Sent Events)** permet les reponses en temps reel
- **Rendu Markdown** supporte gras, italique, blocs de code, listes et liens
- **Appels d'outils** affiches comme indicateurs "Traitement en cours..." pendant l'execution

---

### Depannage

| Probleme | Solution |
|----------|----------|
| Le widget n'apparait pas | Verifiez la console du navigateur pour les erreurs CORS |
| Erreur CORS | Ajoutez votre domaine aux **Origines autorisees** |
| "Cle API invalide" | Verifiez que l'attribut \`data-key\` correspond a votre cle generee |
| Conflits de style | Le widget utilise le Shadow DOM — les conflits ne devraient pas se produire |
| Reponses lentes | Le temps de reponse depend du fournisseur LLM et du modele selectionne |
| Widget sur mobile | Passe automatiquement en mode plein ecran sur les ecrans < 640px |

---

### Notes de Securite

- La cle API est validee cote serveur a chaque requete
- Les en-tetes CORS sont definis dynamiquement a partir de votre liste d'origines autorisees
- Le widget ne peut pas acceder au DOM de votre page (isolation Shadow DOM)
- L'utilisation est suivie et facturee sur le compte du proprietaire de l'agent
- Le rate limiting est applique selon les limites du plan
`,

    webhooks: `## Connecter votre Agent via Webhooks

Utilisez les webhooks pour integrer votre agent Kopern a n'importe quel service externe — plateformes d'automatisation (n8n, Make, Zapier), CRMs, outils de monitoring ou applications personnalisees.

---

### Prerequis

- Un agent Kopern deja cree et teste dans le Playground
- Une cle API (generee depuis les parametres Widget ou MCP)
- Un plan Kopern incluant les connecteurs (Pro ou superieur)

---

### Concepts

| Type | Direction | Description |
|------|-----------|-------------|
| **Entrant** | Externe → Agent | Un service externe envoie un message a votre agent et recoit une reponse JSON |
| **Sortant** | Agent → Externe | Votre agent envoie des evenements (message envoye, appel d'outil, etc.) a une URL externe |

---

## Webhooks Entrants

### Endpoint

\`\`\`
POST https://kopern.vercel.app/api/webhook/{agentId}?key=kpn_VOTRE_CLE_API
\`\`\`

### Format de la Requete

\`\`\`json
{
  "message": "Votre message pour l'agent",
  "systemPrompt": "(optionnel) Remplacer le system prompt de l'agent",
  "sessionId": "(optionnel) Continuer une conversation precedente"
}
\`\`\`

### Format de la Reponse

\`\`\`json
{
  "response": "La reponse complete de l'agent",
  "metrics": {
    "inputTokens": 150,
    "outputTokens": 320,
    "toolCallCount": 1,
    "toolIterations": 1
  }
}
\`\`\`

> **Note :** Les webhooks entrants retournent une reponse JSON synchrone (PAS du streaming SSE). Cela garantit la compatibilite avec tous les consommateurs de webhooks.

### Verification de Signature HMAC (Optionnel)

Pour plus de securite, configurez un secret HMAC sur le webhook. La requete inclura un en-tete de signature :

\`\`\`
X-Webhook-Signature: sha256=<hex_digest>
\`\`\`

Verifiez-le dans votre code :

\`\`\`javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', VOTRE_SECRET_HMAC)
  .update(requestBody)
  .digest('hex');
const expected = 'sha256=' + signature;
// Comparer avec l'en-tete X-Webhook-Signature
\`\`\`

### Test Rapide avec curl

\`\`\`bash
curl -X POST "https://kopern.vercel.app/api/webhook/VOTRE_AGENT_ID?key=kpn_VOTRE_CLE" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Bonjour, que peux-tu faire ?"}'
\`\`\`

---

## Webhooks Sortants

Les webhooks sortants se declenchent lorsque des evenements specifiques se produisent dans votre agent.

### Evenements Disponibles

| Evenement | Declenchement |
|-----------|---------------|
| \`message_sent\` | L'agent a fini de repondre a un message |
| \`tool_call_completed\` | L'agent a termine un appel d'outil |
| \`session_ended\` | Une session de conversation se termine |
| \`error\` | Une erreur survient pendant le traitement |

### Format du Payload

\`\`\`json
{
  "event": "message_sent",
  "agentId": "abc123",
  "timestamp": "2026-03-22T10:30:00.000Z",
  "data": {
    "inputTokens": 150,
    "outputTokens": 320,
    "toolCallCount": 1
  }
}
\`\`\`

### Configuration

1. Allez dans **Connecteurs** > **Webhooks** > **Creer**
2. Selectionnez **Sortant**
3. Entrez l'URL cible de votre service
4. Selectionnez les evenements a declencher
5. Ajoutez optionnellement un secret HMAC
6. Cliquez **Enregistrer**

---

## Integration avec n8n

### Entrant (n8n → Agent)

1. Dans n8n, ajoutez un noeud **HTTP Request**
2. Configurez :
   - **Methode :** POST
   - **URL :** \`https://kopern.vercel.app/api/webhook/VOTRE_AGENT_ID?key=kpn_VOTRE_CLE\`
   - **Type de contenu :** JSON
   - **Body :**
   \`\`\`json
   {
     "message": "{{ $json.data }}"
   }
   \`\`\`
3. La reponse sera dans \`$json.response\`

### Sortant (Agent → n8n)

1. Dans n8n, ajoutez un noeud trigger **Webhook**
2. Definissez la methode sur **POST**
3. Copiez l'URL du webhook n8n (ex. \`https://votre-n8n.com/webhook/abc123\`)
4. Dans Kopern, creez un webhook **Sortant** avec cette URL
5. Selectionnez les evenements a declencher
6. n8n recevra le payload dans \`$json.data\`

### Exemple de Workflow n8n

\`\`\`
Trigger Slack → HTTP Request (Kopern) → Slack Envoyer Message
\`\`\`

Cela cree un bot Slack alimente par votre agent Kopern, orchestre via n8n.

---

## Integration avec Make (Integromat)

### Entrant (Make → Agent)

1. Ajoutez un module **HTTP** > **Make a request**
2. Configurez :
   - **URL :** \`https://kopern.vercel.app/api/webhook/VOTRE_AGENT_ID?key=kpn_VOTRE_CLE\`
   - **Methode :** POST
   - **Type de body :** Raw
   - **Type de contenu :** JSON
   - **Contenu de la requete :**
   \`\`\`json
   {"message": "{{1.text}}"}
   \`\`\`
3. Parsez la reponse avec un module **JSON** > **Parse JSON**
4. Utilisez \`response\` depuis la sortie parsee

### Sortant (Agent → Make)

1. Creez un nouveau scenario avec un trigger **Webhooks** > **Custom webhook**
2. Copiez l'URL du webhook Make
3. Dans Kopern, creez un webhook **Sortant** pointant vers cette URL
4. Lancez un message test dans le Playground Kopern pour que Make capture la structure de donnees
5. Cliquez **Redeterminer la structure de donnees** dans Make

---

## Integration avec Zapier

### Entrant (Zapier → Agent)

1. Ajoutez une action **Webhooks by Zapier** > **Custom Request**
2. Configurez :
   - **Methode :** POST
   - **URL :** \`https://kopern.vercel.app/api/webhook/VOTRE_AGENT_ID?key=kpn_VOTRE_CLE\`
   - **Data :**
   \`\`\`
   {"message": "Votre contenu dynamique ici"}
   \`\`\`
   - **Headers :**
   \`\`\`
   Content-Type: application/json
   \`\`\`
3. La reponse de l'agent est disponible dans les etapes suivantes comme \`Response > response\`

### Sortant (Agent → Zapier)

1. Creez un nouveau Zap avec un trigger **Webhooks by Zapier** > **Catch Hook**
2. Copiez l'URL du webhook Zapier
3. Dans Kopern, creez un webhook **Sortant** avec cette URL
4. Envoyez un message test via le Playground
5. Cliquez **Tester le trigger** dans Zapier pour capturer le payload

---

## Protection Anti-Boucle

> **Important :** Les webhooks entrants ne declenchent PAS les webhooks sortants. Cela empeche les boucles infinies ou un webhook entrant declenche un webhook sortant, qui declenche un autre entrant, etc.

Si vous devez chainer des agents, utilisez le webhook sortant de l'Agent A pour declencher le webhook entrant de l'Agent B — mais ne bouclez jamais vers l'Agent A.

---

### Depannage

| Probleme | Solution |
|----------|----------|
| 401 Non autorise | Verifiez votre cle API (\`?key=kpn_...\`) |
| 404 Non trouve | Verifiez l'ID de l'agent dans l'URL |
| Reponse vide | L'agent n'a peut-etre pas de system prompt — testez d'abord dans le Playground |
| Timeout | Les reponses volumineuses peuvent prendre 30s+ — augmentez le timeout dans votre outil d'automatisation |
| Erreur HMAC | Assurez-vous que le body brut est utilise pour le calcul de la signature (pas le JSON parse) |
| Le sortant ne se declenche pas | Verifiez que le webhook est active et que le type d'evenement correspond |
`,
  },
} as const;
