---
title: "Comment tester les agents IA en 2026 : le guide complet du grading"
description: "Tester un agent IA n'a rien à voir avec tester du code classique. Voici les 6 types de critères qui comptent, comment construire une suite de grading, et comment détecter la dégradation silencieuse avant les utilisateurs."
date: "2026-04-22"
author: "Thomas Berchet"
authorRole: "Founder & AI Engineer"
authorGithub: "berch-t"
authorLinkedin: "https://www.linkedin.com/in/thomas-berchet"
tags: ["agents-ia", "tests", "grading", "evaluation", "llm-juge"]
image: "https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776864054104.jpeg?alt=media&token=66c51a44-b672-466d-868b-d771ba75d518"
locale: "fr"
---

## TL;DR

Tester un agent IA n'est pas comme tester un logiciel classique. Vous ne pouvez pas écrire `expect(result).toBe(42)` sur un système probabiliste. Il faut du **grading** : une évaluation notée sur plusieurs critères, lancée en continu, avec alertes en cas de dérive.

Cet article détaille les 6 types de critères qui comptent vraiment en production, le pattern de suite de grading, et comment détecter la dégradation silencieuse. Chaque exemple utilise le [Grader public de Kopern](/fr/grader) pour que vous puissiez reproduire sans inscription.

---

## Pourquoi les tests traditionnels échouent pour les agents IA

Les tests unitaires vérifient le déterminisme : même entrée → même sortie. Les agents LLM sont non-déterministes par nature. Même avec `temperature: 0`, le même prompt peut produire différentes sorties selon la version du modèle, la charge système, ou le cache fournisseur.

Pire, les agents **réussissent de façon surprenante**. Un agent peut résoudre une tâche en appelant l'outil A au lieu du B attendu, produisant un résultat correct par un chemin inattendu. Une assertion stricte le ferait échouer ; en réalité, c'est très bien.

Il vous faut une évaluation :

1. **Floue** — tolérante aux variations valides
2. **Multi-critères** — pas juste output match, mais usage d'outils, sécurité, latence
3. **Continue** — tourne à chaque déploiement, chaque jour, pas une seule fois

---

## Les 6 types de critères qui comptent

Le moteur de grading de Kopern expose six critères. Utilisez-les en combinaison — aucun seul n'est suffisant.

### 1. Output match (contains / exact / regex)

Pour les cas avec sorties attendues déterministes :

```json
{
  "name": "Retourne le statut de commande",
  "input": "Où est la commande 12345 ?",
  "expected": "expédiée",
  "criterionType": "contains"
}
```

Pour : Q&A factuel, lookups, réponses structurées. Éviter pour : tâches créatives, réponses longues.

### 2. Validation de schéma (JSON schema)

Pour les outils qui doivent retourner des données structurées valides :

```json
{
  "criterionType": "schema",
  "criterionConfig": {
    "schema": {
      "type": "object",
      "properties": {
        "intent": { "enum": ["remboursement", "question", "plainte"] },
        "urgence": { "type": "number", "minimum": 1, "maximum": 5 }
      },
      "required": ["intent", "urgence"]
    }
  }
}
```

Pour : classifieurs, remplisseurs de formulaires, validateurs d'API.

### 3. Usage d'outils (l'agent a-t-il appelé le bon outil ?)

Vérifie si l'agent a invoqué des outils spécifiques avec des arguments spécifiques :

```json
{
  "criterionType": "toolUsage",
  "criterionConfig": {
    "requiredTools": ["lookup_order"],
    "forbiddenTools": ["send_email"]
  }
}
```

Pour : validation de workflow ("l'agent doit vérifier le stock avant de confirmer la commande"), sécurité ("l'agent ne doit PAS envoyer d'emails sans approbation").

### 4. Sécurité (politique de contenu + patterns interdits)

Vérifie les comportements interdits : fuite de secrets, allégations médicales/légales, sortie toxique :

```json
{
  "criterionType": "safety",
  "criterionConfig": {
    "forbiddenPatterns": ["api[_-]?key", "password", "select.*from"],
    "maxToxicity": 0.1
  }
}
```

Pour : agents client-facing, agents soumis à conformité, tout ce qui touche aux PII.

### 5. Script custom (sandbox JavaScript)

Pour une logique trop complexe pour des critères déclaratifs :

```javascript
// args: { response, toolCalls, expectedOutput }
const hasOrderId = /\b\d{6,}\b/.test(args.response);
const mentionedStatus = /expediee|livree|en-cours/i.test(args.response);
return hasOrderId && mentionedStatus ? 1.0 : 0.0;
```

Pour : règles métier spécifiques, validation cross-champ, tout ce qui s'exprime plus facilement en code.

### 6. LLM-juge (le plus puissant)

Un second LLM évalue la réponse contre une rubrique :

```json
{
  "criterionType": "llmJudge",
  "criterionConfig": {
    "judgeModel": "claude-sonnet-4-6",
    "rubric": "Note 0-1 basée sur : (1) précision factuelle, (2) ton approprié au service client, (3) inclut les prochaines étapes, (4) pas d'information hallucinée. Justifie le score en 1-2 phrases."
  }
}
```

Pour : réponses ouvertes, qualité créative, conformité nuancée. Ne l'utilisez pas comme seul critère — les LLM juges ont leurs propres biais.

---

## Le pattern de la suite de grading

Un cas est une anecdote. Une suite est une preuve.

```
Suite : "support-client-v1"
├── Cas 1 : Lookup de commande simple (output match + usage d'outils)
├── Cas 2 : Demande de remboursement ambiguë (LLM-juge)
├── Cas 3 : Tentative d'injection de prompt (sécurité)
├── Cas 4 : Input non-français (LLM-juge + output contains)
├── Cas 5 : Input vide / mal formé (script custom — erreur gracieuse)
├── Cas 6 : Escalade multi-tour (usage d'outils : doit appeler escalate_to_human)
├── ...
└── Cas 20 : Cas limite d'un incident réel (test de régression)
```

Visez **15–30 cas** couvrant :
- Happy path (40 %)
- Cas limites (30 %)
- Adversarial / sécurité (20 %)
- Régressions d'incidents réels (10 %)

Chaque cas obtient un score 0–1. La moyenne de la suite est le score global de votre agent. Suivez-le dans le temps.

---

## Détecter la dégradation silencieuse

**Dégradation silencieuse** = la qualité de votre agent baisse sans changement de code. Causes :

- Le fournisseur met à jour le modèle silencieusement (Anthropic, OpenAI, Google le font)
- L'index de récupération dérive (applis RAG)
- De nouveaux cas limites émergent des vrais utilisateurs
- Le prompt "décâle" à mesure que le monde change (ex : agent référençant des API obsolètes)

Détection :

1. **Grading planifié** — lancez la suite quotidiennement via cron
2. **Alerte sur chute de score** — seuil (ex : chute >5 % déclenche Slack/email/webhook)
3. **Détection d'anomalies** — basée ML, attrape les dérives qui ne franchissent pas de seuil

Kopern lance le grading planifié via Vercel Cron avec résolution 1 minute. Les alertes vont vers email, Slack ou webhook custom. [En savoir plus →](/fr/grader)

---

## AutoTune et AutoFix : boucler la boucle

Le grading dit ce qui est cassé. AutoTune et AutoFix essaient de réparer.

**AutoTune** — mute itérativement votre system prompt, grade chaque variante, converge vers des scores plus hauts. Utilise l'optimisation bayésienne + mutations guidées par LLM. Gain typique : 5–15 % d'amélioration de score en 20 itérations.

**AutoFix** — quand des cas spécifiques échouent, AutoFix analyse l'échec, patche le prompt, et ré-évalue. Tourne en 3 étapes : assure suite → assure run → analyse + patch. Correction en un clic pour les incidents de dérive.

Les deux sont disponibles sur le plan Pro de Kopern et couvrent la plupart des douleurs de prompt engineering.

---

## Erreurs communes de grading

### 1. Ne tester que les happy paths

Si votre suite est 90 % cas "normaux", elle passera même quand l'agent casse sur des inputs bizarres. Allouez 30 %+ aux cas limites et adversarials.

### 2. Overfitter à la suite

Si vous tunez les prompts jusqu'à scorer 1,0 sur la suite, vous avez overfitté. Gardez un set de 5–10 cas que l'agent ne voit jamais pendant le tuning. Ceux-là détectent l'overfitting.

### 3. Pas de revue humaine

Grading auto + LLM-juges attrapent 80 % des problèmes. Les derniers 20 % nécessitent un humain qui relit les cas flaggés chaque semaine. Ne sautez pas ça.

### 4. Pas de tests de régression

Chaque incident production doit devenir un cas de grading. Sinon vous livrerez deux fois le même bug.

### 5. Grader une fois, jamais après

Le grading n'est pas un check pré-déploiement. C'est un monitoring continu. Planifiez quotidien, alertez sur les chutes, faites-en une routine comme le monitoring uptime.

---

## Questions fréquentes

### De combien de cas de test ai-je besoin ?

15 minimum pour une couverture signifiante. 30–50 pour production-ready. 100+ pour agents à haut risque (santé, finance). Priorisez la variété (inputs, cas limites, adversarials) sur la quantité.

### Puis-je utiliser mon trafic de prod comme test set ?

Oui, avec précautions. Échantillonnez des vraies conversations, anonymisez les PII, et faites labelliser les résultats attendus par un humain. Ne lancez pas de grading sur le trafic live sans consentement utilisateur (implications RGPD/EU AI Act). Kopern permet de promouvoir des sessions production en cas de grading en un clic.

### À quelle fréquence lancer le grading ?

Avant chaque changement de prompt (régression), quotidien pour les agents prod (détection de dérive), hebdo pour agents à faible trafic. Les agents à haut risque doivent tourner toutes les heures. Le grading planifié Kopern supporte n'importe quelle expression cron.

### LLM-juge est-il fiable ?

Raisonnablement. Les modèles juges (Claude Sonnet, GPT-4o) sont d'accord avec les reviewers humains ~80 % du temps sur les cas clairs et ~60 % sur les ambigus. Utilisez les LLM-juges comme un critère parmi d'autres — pas le seul. Couplez avec des checks déterministes (output match, schéma) pour la robustesse.

---

## Commencez à tester votre agent en 30 secondes

Sautez le setup. Essayez le [Grader Kopern public](/fr/grader) — collez un system prompt, ajoutez des cas de test, obtenez un score. Pas d'inscription, résultats en moins d'une minute.

Pour du grading continu (runs planifiés, alertes, historique de scores, AutoTune, AutoFix), **[créez un compte Kopern gratuit →](/fr/login)** et uploadez votre suite via le dashboard ou MCP (`kopern_create_grading_suite`, `kopern_run_grading`).

---

*Kopern est l'AI Agent Builder, Orchestrator & Grader avec la stack de grading la plus complète du marché. [Explorez le moteur de grading](/fr/grader) ou [lisez la doc MCP](/fr/mcp).*
