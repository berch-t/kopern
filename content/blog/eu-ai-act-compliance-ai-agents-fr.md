---
title: "Conformité EU AI Act pour agents IA : la checklist du 2 août 2026"
description: "L'application complète de l'EU AI Act démarre le 2 août 2026. Sanctions : 35 M€ ou 7 % du CA. Voici la checklist technique concrète pour agents IA, et comment Kopern couvre l'Article 14 nativement."
date: "2026-04-22"
author: "Thomas Berchet"
authorRole: "Founder & AI Engineer"
authorGithub: "berch-t"
authorLinkedin: "https://www.linkedin.com/in/thomas-berchet"
tags: ["eu-ai-act", "conformite", "agents-ia", "reglementation", "gouvernance"]
image: "https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776864516931.jpeg?alt=media&token=2b8efaf9-b093-47cb-b0b4-428e1d856135"
locale: "fr"
---

## TL;DR

**L'EU AI Act devient pleinement applicable le 2 août 2026.** Sanctions pour non-conformité : 35 M€ ou 7 % du chiffre d'affaires mondial, le plus élevé des deux. Tout agent IA servant des utilisateurs UE doit fournir documentation technique, supervision humaine, journaux d'audit et mécanismes d'arrêt.

Cet article transforme le texte légal en checklist technique concrète. La plupart peut être automatisée — voici ce que Kopern embarque pour faire de la conformité un toggle plutôt qu'un projet.

---

## À qui ça s'applique vraiment ?

Si vous déployez des agents IA qui :

- Servent des utilisateurs UE (même depuis des sociétés non-UE — extraterritorialité façon RGPD)
- Exécutent des fonctions à haut risque : scoring crédit, tri CV, infrastructure critique, reporting réglementaire, santé, évaluation éducative

Vous êtes dans le périmètre. Les agents à faible risque (productivité interne, outils créatifs) ont des obligations allégées (transparence, documentation) mais restent concernés.

**Check pratique** : si les décisions de votre agent affectent les droits, opportunités ou sécurité d'une personne, considérez que c'est à haut risque.

---

## Les six obligations techniques

### 1. Documentation technique (Article 11)

Tout système IA à haut risque doit documenter :

- Finalité, capacités et limites
- Sources des données d'entraînement (ou provenance du modèle de fondation pour les agents)
- Logique de décision (system prompt, liste d'outils, mode d'orchestration)
- Métriques de performance et modes de défaillance connus
- Évolutions dans le temps (versioning)

Kopern versionne automatiquement les agents (chaque changement de system prompt incrémente la version) et fournit un [générateur de rapport de conformité](/fr/dashboard) qui exporte la documentation Article 11 en JSON/PDF.

### 2. Supervision humaine (Article 14)

**C'est là que la plupart des équipes vont échouer.** L'Article 14 exige :

- Les humains peuvent interpréter et annuler les sorties du système
- Les humains peuvent arrêter ou corriger le système
- Le système ne crée pas de sur-dépendance (biais d'automatisation)

Concrètement : votre agent doit avoir un "bouton pause", des gates d'approbation sur les actions risquées, et une visibilité temps réel sur ce qu'il fait.

La **Tool Approval Policy** de Kopern couvre ça :

- `auto` — pas d'approbation (actions à faible risque seulement)
- `confirm_destructive` — approbation avant outils destructifs (envoi email, suppression, post public)
- `confirm_all` — approbation à chaque appel d'outil (agents à haut risque)

L'approbation peut être **interactive** (SSE dans widget/playground) ou **conversationnelle** (Telegram / WhatsApp / Slack — l'utilisateur dit "oui" pour approuver).

### 3. Journaux d'audit (Article 12)

Chaque inférence doit être journalisée avec :

- Horodatage
- Entrée
- Sortie
- Appels d'outils effectués
- Chemin de décision
- Identifiant utilisateur / session
- Rétention : minimum 6 mois pour systèmes à haut risque

Kopern stocke chaque conversation comme une **session** Firestore avec flux d'événements complet : messages, appels d'outils, décisions d'approbation, erreurs, usage tokens. Les sessions sont requêtables, exportables en CSV/JSON, filtrables par source.

### 4. Système de gestion des risques (Article 9)

Évaluation continue des risques :

- Risques connus
- Mesures d'atténuation
- Risques résiduels
- Monitoring de nouveaux risques post-déploiement

Le **Stress Lab** de Kopern lance des tests adversariaux (injection de prompt, jailbreak, hallucination, confusion d'outils, cas limites) et durcit automatiquement les prompts sur les vulnérabilités critiques/hautes. Combiné au [grading planifié](/fr/grader), vous avez un monitoring continu du risque.

### 5. Précision et robustesse (Article 15)

Les agents doivent performer de façon cohérente. Il faut :

- Métriques de précision de référence
- Détection de dérive
- Tests de régression sur changements

Le moteur de grading + AutoTune + AutoFix de Kopern couvre ça. Planifiez des runs quotidiens avec alertes sur baisse de score (email, Slack, webhook) pour détecter la dégradation immédiatement.

### 6. Transparence envers les utilisateurs (Article 13)

Les utilisateurs interagissant avec une IA doivent être informés. Si votre agent parle à des clients, ils doivent savoir que c'est une IA, pas un humain.

Les widgets Kopern embarquent un badge "Assistant IA" configurable. Les bots Slack et Telegram s'identifient dans leur profil. Les webhooks incluent l'en-tête `x-kopern-agent-id`.

---

![Kopern compliance timeline](https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776864582514.jpeg?alt=media&token=2ee9ae3d-56df-4893-b69e-5f2b17640834)

## La structure des sanctions

Pénalités de non-conformité (le **plus élevé** des deux) :

| Violation | Sanction |
|---|---|
| Pratiques IA interdites (Art. 5) | 35 M€ ou 7 % du CA mondial |
| Non-conformité IA à haut risque | 15 M€ ou 3 % du CA mondial |
| Informations incorrectes/trompeuses aux autorités | 7,5 M€ ou 1 % du CA mondial |

Pour une startup Série A à 50 M$ ARR, c'est 1,5–3,5 M$ pour un seul défaut de documentation. Pour un Fortune 500, c'est neuf chiffres.

---

## Le calendrier de conformité

| Date | Ce qui s'applique |
|---|---|
| 1 août 2024 | Entrée en vigueur de l'AI Act |
| 2 fév 2025 | Systèmes IA interdits bannis (scoring social, manipulation émotionnelle) |
| 2 août 2025 | Obligations sur les modèles GPAI actives |
| **2 août 2026** | **Application complète des règles IA haut risque** |
| 2 août 2027 | Extensions sectorielles spécifiques |

**Vous êtes à moins de 4 mois de l'application complète.** Si vous n'avez pas commencé, vous êtes déjà en retard.

---

## Comment Kopern couvre les exigences techniques

| Obligation | Fonctionnalité Kopern |
|---|---|
| Art. 9 Gestion des risques | Stress Lab + Grading planifié + AutoFix |
| Art. 11 Documentation technique | Versioning d'agent + Générateur de rapport |
| Art. 12 Journaux d'audit | Sessions Firestore avec flux d'événements |
| Art. 13 Transparence | Badge IA widget + Identification bot profile |
| Art. 14 Supervision humaine | Tool approval policy (3 modes) + Approbation conversationnelle |
| Art. 15 Précision | Moteur de grading + AutoTune + Alertes dérive |

Il vous reste à mettre en place les mesures organisationnelles (politiques, formation, registre de risque, responsable IA dans les grandes orgs) — l'Act exige contrôles techniques ET gouvernance. Mais la moitié technique est automatisée.

---

## L'alternative DIY

Si vous construisez vous-même sur LangChain ou CrewAI, vous devez :

- Construire le pipeline de logs d'audit
- Implémenter les gates d'approbation par outil
- Rédiger la documentation de conformité
- Faire tourner l'infra de tests adversariaux
- Mettre en place le grading planifié avec alertes

Environ 4–8 semaines d'ingénierie pour une couverture correcte. Plus la maintenance. Plus la prep d'audit externe.

Alternativement vous utilisez [Kopern](/fr/login) (le tier gratuit couvre les fonctionnalités de conformité) et vous vous concentrez sur votre vrai business.

---

## Questions fréquentes

### Ai-je besoin de conformité EU AI Act si je suis une société US ?

Oui, si un utilisateur UE peut accéder à votre service. L'Act a une portée extraterritoriale (comme le RGPD). Même si vos serveurs sont aux US, servir un utilisateur UE déclenche les obligations. Bloquez le trafic UE ou conformez-vous — il n'y a pas de troisième option.

### Mon agent IA à faible risque est-il exempté ?

Majoritairement, mais pas totalement. L'IA à faible risque a toujours des obligations de transparence (les utilisateurs doivent savoir qu'ils parlent à une IA) et des exigences de documentation. Attention au scope creep — un agent "support client" qui se met à gérer des approbations de remboursement bascule en haut risque.

### Qu'est-ce qui compte comme "supervision humaine" ?

Un humain doit pouvoir : (1) comprendre ce que l'agent décide et pourquoi, (2) l'annuler ou l'arrêter, (3) intervenir dans un délai raisonnable. Pour la plupart des agents, ça signifie des gates d'approbation d'outils sur les actions risquées + des logs de conversation complets accessibles aux opérateurs. Kopern couvre les deux nativement.

### Combien de temps dois-je conserver les logs d'agents IA ?

L'Article 12 exige "au moins la durée nécessaire à leur finalité" avec une attente minimale autour de 6 mois pour les systèmes à haut risque. La plupart des équipes conservent 12–24 mois pour être prêtes aux audits. Le stockage Firestore de Kopern est illimité par défaut ; vous configurez la rétention dans votre politique de gouvernance.

---

## Déployez des agents conformes dès le jour 1

La conformité EU AI Act n'est pas une course contre la montre si vous démarrez avec la bonne plateforme. Kopern gère les exigences techniques ; vous gérez la logique métier.

**[Créez votre compte Kopern gratuit →](/fr/login)** — tool approval policies, logs d'audit session, générateur de rapport de conformité inclus dans tous les plans.

Agents déjà en production ? [Exportez-les vers Kopern via MCP](/fr/mcp) avec `kopern_import_agent` et obtenez la couverture de conformité rétroactivement.

---

*Kopern est l'AI Agent Builder, Orchestrator & Grader pour les déploiements conformes EU AI Act. [Voir les fonctionnalités](/fr) ou [lire la doc MCP](/fr/mcp). Cet article est un guide technique, pas un conseil juridique — consultez votre avocat pour votre situation spécifique.*
