/** French translations for use-case display fields (title, tagline, description, metrics). */
export const useCasesFr: Record<
  string,
  {
    title: string;
    domain: string;
    tagline: string;
    description: string;
    timeSaved: string;
    costReduction: string;
    riskMitigation: string;
  }
> = {
  "pr-review-guardian": {
    title: "Gardien de Revue de PR",
    domain: "DevOps / Qualit\u00e9 du Code",
    tagline: "Analyse automatique des pull requests avec v\u00e9rifications de s\u00e9curit\u00e9, performance et conventions",
    description:
      "Re\u00e7oit un diff de PR GitHub via webhook et produit une revue structur\u00e9e : vuln\u00e9rabilit\u00e9s (OWASP Top 10), violations de conventions, alertes de complexit\u00e9 cyclomatique, d\u00e9pendances obsol\u00e8tes et suggestions d'optimisation. Bloque le merge si le score est inf\u00e9rieur au seuil configurable.",
    timeSaved: "30-60 min par revue de PR r\u00e9duites \u00e0 10 secondes",
    costReduction: "~45K\u20ac/an pour une \u00e9quipe de 8 d\u00e9veloppeurs (temps de r\u00e9viseur senior)",
    riskMitigation: "D\u00e9tecte 92% des vuln\u00e9rabilit\u00e9s courantes avant la revue humaine",
  },
  "database-migration-auditor": {
    title: "Auditeur de Migrations BDD",
    domain: "Backend / DBA",
    tagline: "Analyse des fichiers de migration pour d\u00e9tecter les changements cassants, risques de verrou et g\u00e9n\u00e9ration automatique de scripts de rollback",
    description:
      "Analyse les fichiers de migration SQL/ORM, d\u00e9tecte les op\u00e9rations destructrices, \u00e9value les risques de verrouillage de tables et g\u00e9n\u00e8re automatiquement les scripts de rollback correspondants.",
    timeSaved: "2-4 heures de revue DBA par migration",
    costReduction: "Pr\u00e9vient les incidents de downtime co\u00fbtant 10K\u20ac-500K\u20ac chacun",
    riskMitigation: "100% des migrations destructrices signal\u00e9es avant ex\u00e9cution",
  },
  "cicd-pipeline-monitor": {
    title: "Moniteur de Pipeline CI/CD",
    domain: "DevOps / SRE",
    tagline: "Analyse en temps r\u00e9el des \u00e9checs de pipeline avec d\u00e9tection de cause racine et suggestions de correctifs",
    description:
      "Surveille les pipelines CI/CD en temps r\u00e9el, analyse les \u00e9checs, identifie la cause racine et propose des correctifs automatis\u00e9s.",
    timeSaved: "15-45 min par investigation d'\u00e9chec de pipeline",
    costReduction: "30K\u20ac/an en temps d\u00e9veloppeur pour une \u00e9quipe avec 5+ d\u00e9ploiements/jour",
    riskMitigation: "R\u00e9duit le temps moyen de r\u00e9cup\u00e9ration (MTTR) de 60%",
  },
  "cloud-cost-optimizer": {
    title: "Optimiseur de Co\u00fbts Cloud",
    domain: "FinOps / Infrastructure",
    tagline: "Analyse des donn\u00e9es de facturation cloud et identification des opportunit\u00e9s d'\u00e9conomies avec estimations de ROI",
    description:
      "Analyse les donn\u00e9es de facturation cloud, identifie les ressources sous-utilis\u00e9es et propose des optimisations avec estimation pr\u00e9cise du ROI.",
    timeSaved: "2-3 jours d'audit FinOps mensuel r\u00e9duits \u00e0 quelques minutes",
    costReduction: "Identifie g\u00e9n\u00e9ralement 20-40% d'\u00e9conomies (50K\u20ac-500K\u20ac/an)",
    riskMitigation: "Pr\u00e9vient les d\u00e9passements de budget avec des alertes automatis\u00e9es",
  },
  "incident-postmortem-generator": {
    title: "G\u00e9n\u00e9rateur de Post-Mortem d'Incidents",
    domain: "SRE / Op\u00e9rations",
    tagline: "G\u00e9n\u00e9ration automatique de post-mortems structur\u00e9s \u00e0 partir des logs d'incidents avec chronologie et plan d'action",
    description:
      "G\u00e9n\u00e8re automatiquement des post-mortems structur\u00e9s \u00e0 partir des logs d'incidents, avec chronologie d\u00e9taill\u00e9e, analyse de cause racine et plan d'action.",
    timeSaved: "2-4 heures par post-mortem r\u00e9duites \u00e0 5 minutes",
    costReduction: "25K\u20ac/an pour une \u00e9quipe g\u00e9rant 2+ incidents/mois",
    riskMitigation: "Garantit que 100% des incidents ont un post-mortem document\u00e9",
  },
  "slack-standup-synthesizer": {
    title: "Synth\u00e9tiseur de Standups Slack",
    domain: "Gestion d'\u00c9quipe",
    tagline: "Agr\u00e9gation des standups quotidiens depuis Slack en tableaux de bord d'\u00e9quipe avec d\u00e9tection des blocages",
    description:
      "Agr\u00e8ge les standups quotidiens depuis Slack, g\u00e9n\u00e8re des tableaux de bord d'\u00e9quipe et d\u00e9tecte automatiquement les blocages.",
    timeSaved: "20 min/jour pour les managers engineering (lecture + synth\u00e8se)",
    costReduction: "15K\u20ac/an par manager en temps productif r\u00e9cup\u00e9r\u00e9",
    riskMitigation: "Blocages d\u00e9tect\u00e9s 2x plus vite, pr\u00e9venant les retards de sprint",
  },
  "contract-clause-analyzer": {
    title: "Analyseur de Clauses Contractuelles",
    domain: "Juridique / Achats",
    tagline: "D\u00e9tection des clauses \u00e0 risque, violations RGPD et protections manquantes dans les contrats",
    description:
      "Analyse les contrats pour d\u00e9tecter les clauses \u00e0 risque, les violations RGPD et les protections manquantes, avec recommandations d\u00e9taill\u00e9es.",
    timeSaved: "1-2 heures par revue de contrat pour l'\u00e9quipe juridique",
    costReduction: "40K\u20ac/an pour les entreprises r\u00e9visant 50+ contrats/an",
    riskMitigation: "Emp\u00eache la signature de contrats avec des expositions cach\u00e9es",
  },
  "sales-lead-qualifier": {
    title: "Qualificateur de Leads Commerciaux",
    domain: "Ventes / Prospection",
    tagline: "Scoring et qualification des leads entrants avec donn\u00e9es d'enrichissement et brouillons de prospection personnalis\u00e9s",
    description:
      "Score et qualifie les leads entrants, enrichit les donn\u00e9es et g\u00e9n\u00e8re des brouillons de prospection personnalis\u00e9s.",
    timeSaved: "10-15 min par qualification de lead, 80% du temps de recherche SDR",
    costReduction: "60K\u20ac/an par SDR en temps de vente r\u00e9cup\u00e9r\u00e9",
    riskMitigation: "Augmente le taux de conversion de 25% en priorisant les leads \u00e0 forte intention",
  },
  "marketing-campaign-analyzer": {
    title: "Analyseur de Campagnes Marketing",
    domain: "Marketing / Croissance",
    tagline: "Analyse de performance multi-canal avec attribution et suggestions d'optimisation",
    description:
      "Analyse les performances des campagnes marketing sur tous les canaux avec attribution multi-touch et suggestions d'optimisation budg\u00e9taire.",
    timeSaved: "4-6 heures de reporting marketing hebdomadaire",
    costReduction: "Am\u00e9lioration du ROAS de 15-25% gr\u00e2ce aux r\u00e9allocations budg\u00e9taires bas\u00e9es sur les donn\u00e9es",
    riskMitigation: "Pr\u00e9vient le gaspillage de budget sur les canaux sous-performants",
  },
  "ml-model-drift-monitor": {
    title: "Moniteur de D\u00e9rive de Mod\u00e8les ML",
    domain: "MLOps / Data Science",
    tagline: "D\u00e9tection de la d\u00e9rive des donn\u00e9es, d\u00e9rive conceptuelle et d\u00e9gradation des performances en production",
    description:
      "D\u00e9tecte la d\u00e9rive des donn\u00e9es, la d\u00e9rive conceptuelle et la d\u00e9gradation des performances des mod\u00e8les ML en production.",
    timeSaved: "Surveillance continue vs 2 heures de v\u00e9rification manuelle hebdomadaire",
    costReduction: "Pr\u00e9vient la perte de revenus li\u00e9e aux mod\u00e8les obsol\u00e8tes (impact 100K\u20ac+)",
    riskMitigation: "D\u00e9tecte la d\u00e9gradation du mod\u00e8le avant qu'elle n'impacte les m\u00e9triques business",
  },
  "security-vulnerability-scanner": {
    title: "Scanner de Vuln\u00e9rabilit\u00e9s de S\u00e9curit\u00e9",
    domain: "S\u00e9curit\u00e9 / Conformit\u00e9",
    tagline: "Analyse continue de la s\u00e9curit\u00e9 du code avec d\u00e9tection CVE et conseils de rem\u00e9diation",
    description:
      "Analyse en continu la s\u00e9curit\u00e9 du code source, d\u00e9tecte les CVE dans les d\u00e9pendances et fournit des guides de rem\u00e9diation d\u00e9taill\u00e9s.",
    timeSaved: "8-16 heures d'audit de s\u00e9curit\u00e9 manuel par sprint",
    costReduction: "80K\u20ac/an vs fr\u00e9quence de tests de p\u00e9n\u00e9tration externes",
    riskMitigation: "R\u00e9duit la probabilit\u00e9 d'incidents de s\u00e9curit\u00e9 de 75%",
  },
  "onboarding-knowledge-agent": {
    title: "Agent de Connaissances pour l'Onboarding",
    domain: "Management Engineering / RH",
    tagline: "Acc\u00e9l\u00e9rez l'onboarding des d\u00e9veloppeurs avec des r\u00e9ponses instantan\u00e9es depuis la documentation interne",
    description:
      "Acc\u00e9l\u00e8re l'onboarding des d\u00e9veloppeurs en fournissant des r\u00e9ponses instantan\u00e9es \u00e0 partir de la documentation interne.",
    timeSaved: "2-4 semaines d'onboarding r\u00e9duites \u00e0 3-5 jours",
    costReduction: "25K\u20ac par nouveau recrutement en co\u00fbt d'onboarding r\u00e9duit",
    riskMitigation: "R\u00e9duit les interruptions des d\u00e9veloppeurs seniors de 60%",
  },
  "financial-report-analyzer": {
    title: "Analyseur de Rapports Financiers",
    domain: "Finance / Comptabilit\u00e9",
    tagline: "Extraction de KPI, d\u00e9tection d'anomalies et g\u00e9n\u00e9ration de synth\u00e8ses ex\u00e9cutives \u00e0 partir de donn\u00e9es financi\u00e8res",
    description:
      "Extrait les KPI cl\u00e9s, d\u00e9tecte les anomalies comptables et g\u00e9n\u00e8re des synth\u00e8ses ex\u00e9cutives \u00e0 partir des donn\u00e9es financi\u00e8res.",
    timeSaved: "3-5 heures par cycle de reporting financier",
    costReduction: "35K\u20ac/an en temps d'analyste FP&A",
    riskMitigation: "D\u00e9tecte les anomalies comptables 10x plus vite que la revue manuelle",
  },
  "api-schema-changelog": {
    title: "G\u00e9n\u00e9rateur de Changelog de Sch\u00e9ma API",
    domain: "Platform Engineering",
    tagline: "D\u00e9tection des changements cassants entre versions d'API et g\u00e9n\u00e9ration de guides de migration",
    description:
      "D\u00e9tecte les changements cassants entre les versions d'API et g\u00e9n\u00e8re des guides de migration d\u00e9taill\u00e9s pour les consommateurs.",
    timeSaved: "1-2 heures par release d'API pour la documentation",
    costReduction: "Pr\u00e9vient les cassures d'int\u00e9gration en aval (20K\u20ac+ par incident)",
    riskMitigation: "Z\u00e9ro changement cassant silencieux atteignant la production",
  },
  "customer-feedback-classifier": {
    title: "Classificateur de Retours Clients",
    domain: "Produit / Customer Success",
    tagline: "Classification, priorisation et routage des retours clients vers la bonne \u00e9quipe produit",
    description:
      "Classifie, priorise et route automatiquement les retours clients vers la bonne \u00e9quipe produit.",
    timeSaved: "5-10 heures/semaine de tri manuel des retours",
    costReduction: "30K\u20ac/an en temps d'\u00e9quipe Customer Success",
    riskMitigation: "D\u00e9tecte les probl\u00e8mes produit \u00e9mergents 5x plus vite, r\u00e9duisant le churn",
  },
};
