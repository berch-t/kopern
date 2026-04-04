/** MCP Documentation — French */
export const mcpDocsMarkdownFr = `
## Vue d'ensemble

Kopern expose toute sa plateforme via le **Model Context Protocol (MCP)** — un standard ouvert pour connecter outils et agents IA. Avec 32 tools couvrant le cycle de vie complet des agents, vous pouvez construire, tester, evaluer, optimiser et deployer des agents entierement depuis votre terminal ou IDE.

**Points cles :**
- **32 tools MCP** repartis en 9 categories
- **2 types de cles** : liee a un agent (32 tools) et personnelle (30 tools)
- **3 workflows guides** via MCP Prompts
- **Annotations** pour les interfaces client
- **Zero dependances** — juste Node.js 18+

---

## Demarrage rapide

### Option 1 : Package NPM (Recommande)

\`\`\`bash
# Claude Code — une seule commande
claude mcp add kopern -- npx -y @kopern/mcp-server

# Cursor / Windsurf — ajoutez dans .mcp.json
\`\`\`

Configurez votre cle API :

\`\`\`bash
export KOPERN_API_KEY=kpn_votre_cle
\`\`\`

Le package [\`@kopern/mcp-server\`](https://npmjs.com/package/@kopern/mcp-server) est un bridge stdio-to-HTTP leger (5KB, zero deps).

### Option 2 : HTTP Direct

Ajoutez dans votre \`.mcp.json\` :

\`\`\`json
{
  "mcpServers": {
    "kopern": {
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

## Authentification

### Deux types de cles

| Type | Portee | Tools | Creation |
|------|--------|-------|----------|
| **Liee a un agent** | Un agent specifique | 32 tools (inclut \`kopern_chat\`, \`kopern_agent_info\`) | Detail agent → Onglet API Keys |
| **Personnelle** | Non liee a un agent | 30 tools plateforme | Parametres → Cle API personnelle |

**Quand utiliser quoi :**
- **Cle liee** : Chatter avec un agent specifique, ou quand toutes les operations ciblent un agent
- **Cle personnelle** : Operations plateforme — creer des agents, gerer des equipes, grading multi-agents

### Limites

- **30 requetes/minute** par cle (fenetre glissante)
- Reponse HTTP 429 avec header \`Retry-After\` en cas de depassement

---

## Reference du protocole

### Endpoint

\`\`\`
POST https://kopern.ai/api/mcp/server
Content-Type: application/json
Authorization: Bearer kpn_votre_cle
\`\`\`

### Methodes supportees

| Methode | Description |
|---------|-------------|
| \`initialize\` | Handshake — retourne version, capacites, info serveur |
| \`tools/list\` | Liste des tools (jusqu'a 32) |
| \`tools/call\` | Executer un tool |
| \`prompts/list\` | Liste des workflows guides (3 prompts) |
| \`prompts/get\` | Recuperer un template de prompt |
| \`ping\` | Keepalive |

---

## Reference des Tools

### Gestion des agents (8 tools)

| Tool | Description | Type de cle |
|------|-------------|-------------|
| \`kopern_chat\` | Envoyer un message a un agent (avec tool calling) | Cle liee uniquement |
| \`kopern_agent_info\` | Metadata de l'agent | Cle liee uniquement |
| \`kopern_create_agent\` | Creer un nouvel agent | Toute cle |
| \`kopern_get_agent\` | Configuration d'un agent | Toute cle |
| \`kopern_update_agent\` | Modifier les parametres | Toute cle |
| \`kopern_delete_agent\` | Supprimer un agent | Toute cle |
| \`kopern_list_agents\` | Lister tous les agents | Toute cle |
| \`kopern_list_templates\` | Lister les templates disponibles | Toute cle |

### Grading & Optimisation (6 tools)

| Tool | Description |
|------|-------------|
| \`kopern_grade_prompt\` | Evaluation rapide d'un prompt avec cas de test |
| \`kopern_create_grading_suite\` | Creer une suite d'evaluation persistante |
| \`kopern_run_grading\` | Executer une suite d'evaluation |
| \`kopern_get_grading_results\` | Resultats detailles d'un run |
| \`kopern_list_grading_runs\` | Historique des runs |
| \`kopern_run_autoresearch\` | Optimisation AutoTune (amelioration iterative du prompt) |

### Equipes & Pipelines (4 tools)

| Tool | Description |
|------|-------------|
| \`kopern_create_team\` | Creer une equipe multi-agents |
| \`kopern_run_team\` | Executer une equipe avec un prompt |
| \`kopern_create_pipeline\` | Creer un pipeline multi-etapes |
| \`kopern_run_pipeline\` | Executer un pipeline |

Modes d'execution :
- **sequential** : Agents en serie, chacun recoit la sortie du precedent
- **parallel** : Tous les agents en parallele sur le meme prompt
- **conditional** : Le premier agent route vers le specialiste le plus adapte

### Connecteurs (7 tools)

| Tool | Description |
|------|-------------|
| \`kopern_connect_widget\` | Widget de chat integrable |
| \`kopern_connect_telegram\` | Bot Telegram |
| \`kopern_connect_whatsapp\` | WhatsApp Business |
| \`kopern_connect_slack\` | Workspace Slack |
| \`kopern_connect_webhook\` | Webhooks entrants/sortants (n8n, Zapier, Make) |
| \`kopern_connect_email\` | Email Google/Microsoft (OAuth) |
| \`kopern_connect_calendar\` | Calendrier Google/Microsoft (OAuth) |

### Sessions & Monitoring (5 tools)

| Tool | Description |
|------|-------------|
| \`kopern_list_sessions\` | Sessions de conversation d'un agent |
| \`kopern_get_session\` | Detail d'une session (messages, evenements) |
| \`kopern_manage_memory\` | CRUD memoire agent (remember/recall/forget/list) |
| \`kopern_compliance_report\` | Rapport de conformite EU AI Act |
| \`kopern_get_usage\` | Metriques d'utilisation et couts |

### Portabilite (2 tools)

| Tool | Description |
|------|-------------|
| \`kopern_export_agent\` | Exporter un agent en JSON portable |
| \`kopern_import_agent\` | Importer un agent depuis un JSON exporte |

---

## Annotations des Tools

| Annotation | Signification | Exemples |
|-----------|---------------|----------|
| \`readOnlyHint: true\` | Execution automatique sure | \`list_agents\`, \`get_session\` |
| \`destructiveHint: true\` | Peut supprimer des donnees | \`delete_agent\` |
| \`idempotentHint: true\` | Reessai sans effet secondaire | \`update_agent\` |
| \`openWorldHint: true\` | Appels API externes | \`chat\`, \`run_grading\` |

---

## Workflows guides (MCP Prompts)

### create-agent
Construction d'un agent pas a pas : cas d'usage, prompt, skills, tools, configuration, creation.

### grade-and-improve
Cycle d'amelioration iteratif : suite d'evaluation, execution, analyse, ameliorations, re-evaluation.

### deploy-everywhere
Deploiement multi-canal : widget, Telegram, Slack, webhooks, verification.

---

## Utilisation & Facturation

Tous les tokens consommes via MCP sont suivis et factures :
- **Firestore** : Increments atomiques dans \`users/{userId}/usage/{yearMonth}\`
- **Stripe** : Evenements de facturation a l'usage
- **Par agent** : Ventilation par agent pour l'attribution des couts

Limites de plan verifiees pour : grading, autoresearch, equipes, pipelines, tokens.

---

## Registres

| Registre | Statut | Lien |
|----------|--------|------|
| **npm** | Publie (v2.0.4) | [\`@kopern/mcp-server\`](https://npmjs.com/package/@kopern/mcp-server) |
| **Smithery** | Score 80/100 | [kopern.run.tools](https://smithery.ai/server/@kopern/grader) |
| **Glama** | Approuve | [glama.ai/mcp/servers](https://glama.ai/mcp/servers) |

---

## Depannage

**"Invalid API key"** — Verifiez que votre cle commence par \`kpn_\` et n'a pas expire.

**"Rate limited (429)"** — Attendez la duree \`Retry-After\`. Espacez vos requetes.

**"Tool not found"** — Verifiez le type de cle. \`kopern_chat\` necessite une cle liee a un agent.

---

## Changelog

| Date | Changement |
|------|------------|
| 2026-04-05 | Upgrade moteur agentique — execution parallele, audit billing |
| 2026-04-04 | Generation d'images builtin, chaining URLs images en equipe |
| 2026-04-03 | Annotations tools, MCP Prompts, Smithery 80/100 |
| 2026-04-02 | MCP v2.0.0 — 32 tools, cles personnelles, Docker self-hosted |
| 2026-04-01 | MCP v1.1.0 — 19 tools |
`;
