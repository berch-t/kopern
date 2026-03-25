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
  "agent-team-code-review": {
    title: "\u00c9quipe d'Agents : Revue de Code Full-Stack",
    domain: "Multi-Agent / DevOps",
    tagline: "Trois agents sp\u00e9cialistes r\u00e9visent le code en parall\u00e8le, puis un coordinateur synth\u00e9tise un rapport unifi\u00e9",
    description:
      "Une \u00e9quipe de 3 agents sp\u00e9cialis\u00e9s (s\u00e9curit\u00e9, performance, conventions) r\u00e9vise le code en parall\u00e8le. Chaque agent se concentre sur son domaine d'expertise et produit des conclusions ind\u00e9pendantes. Un agent coordinateur synth\u00e9tise ensuite toutes les conclusions en un rapport unifi\u00e9, d\u00e9dupliqu\u00e9, avec des actions prioritaires et une recommandation de merge.",
    timeSaved: "45-90 min par PR complexe r\u00e9duites \u00e0 20 secondes d'analyse parall\u00e8le",
    costReduction: "~80K\u20ac/an pour une \u00e9quipe de 10 d\u00e9veloppeurs (remplace 3 passes de r\u00e9viseur senior)",
    riskMitigation: "Couverture 3x plus profonde \u2014 s\u00e9curit\u00e9, performance et conventions d\u00e9tect\u00e9es simultan\u00e9ment",
  },
  "pipeline-content-creator": {
    title: "Pipeline de Contenu : Recherche \u2192 R\u00e9daction \u2192 SEO",
    domain: "Pipeline / Contenu",
    tagline: "Un pipeline en 3 \u00e9tapes o\u00f9 les agents recherchent, r\u00e9digent et optimisent le contenu s\u00e9quentiellement",
    description:
      "Un pipeline s\u00e9quentiel en 3 \u00e9tapes : l'Agent 1 recherche un sujet en parcourant plusieurs sources et en extrayant les faits cl\u00e9s. L'Agent 2 transforme la recherche en contenu structur\u00e9 et soign\u00e9 correspondant \u00e0 la voix de marque. L'Agent 3 optimise le contenu pour le SEO \u2014 balises meta, densit\u00e9 de mots-cl\u00e9s, liens internes, score de lisibilit\u00e9. La sortie de chaque \u00e9tape alimente la suivante.",
    timeSaved: "4-6 heures par article r\u00e9duites \u00e0 15 minutes de relecture",
    costReduction: "~60K\u20ac/an en remplacement des co\u00fbts de r\u00e9dacteur freelance + sp\u00e9cialiste SEO",
    riskMitigation: "Voix de marque coh\u00e9rente et conformit\u00e9 SEO sur 100% du contenu publi\u00e9",
  },
  "meta-agent-builder": {
    title: "M\u00e9ta-Agent : Architecte d'Agents IA",
    domain: "M\u00e9ta-Agent / Plateforme",
    tagline: "D\u00e9crivez votre besoin en langage naturel et obtenez un agent enti\u00e8rement configur\u00e9",
    description:
      "Un agent IA qui construit d'autres agents. D\u00e9crivez votre cas d'usage en langage naturel et il g\u00e9n\u00e8re la configuration compl\u00e8te : prompt syst\u00e8me, skills (avec contenu), outils (avec param\u00e8tres JSON Schema), suite de grading et instructions d'int\u00e9gration MCP. Valide la spec pour la coh\u00e9rence interne et sugg\u00e8re des am\u00e9liorations bas\u00e9es sur les bonnes pratiques de conception d'agents.",
    timeSaved: "2-4 heures de configuration d'agent r\u00e9duites \u00e0 5 minutes de conversation",
    costReduction: "Permet aux utilisateurs non-techniques de construire des agents (0\u20ac de formation)",
    riskMitigation: "Les configs g\u00e9n\u00e9r\u00e9es suivent des patterns \u00e9prouv\u00e9s, r\u00e9duisant les erreurs de configuration de 85%",
  },
  "multi-agent-incident-response": {
    title: "Escouade de R\u00e9ponse aux Incidents",
    domain: "Multi-Agent / SRE",
    tagline: "Un agent routeur trie les alertes vers le bon sp\u00e9cialiste, qui diagnostique et corrige pendant qu'un agent communication informe les parties prenantes",
    description:
      "Ex\u00e9cution conditionnelle d'\u00e9quipe pour la r\u00e9ponse aux incidents. Un agent routeur lit les alertes entrantes et classifie le type d'incident (base de donn\u00e9es, r\u00e9seau, application, s\u00e9curit\u00e9). L'agent sp\u00e9cialiste appropri\u00e9 diagnostique le probl\u00e8me \u00e0 l'aide de runbooks et de m\u00e9triques, puis propose un correctif. Un agent communication r\u00e9dige les mises \u00e0 jour de la page de statut et les notifications aux parties prenantes tout au long du processus.",
    timeSaved: "15-30 min de triage initial + 30-60 min de communication de statut par incident",
    costReduction: "~120K\u20ac/an pour une rotation d'astreinte de 5 personnes (MTTR r\u00e9duit, moins de toil)",
    riskMitigation: "R\u00e9duit le MTTR de 65% gr\u00e2ce au triage automatis\u00e9 et au diagnostic + communication parall\u00e8les",
  },
  "orchestrated-data-pipeline": {
    title: "Pipeline de Donn\u00e9es Observable",
    domain: "Pipeline / Observabilit\u00e9",
    tagline: "Un pipeline ETL enti\u00e8rement trac\u00e9 avec suivi des co\u00fbts en tokens, gestion des erreurs et validation qualit\u00e9 \u00e0 chaque \u00e9tape",
    description:
      "Un pipeline avec observabilit\u00e9 compl\u00e8te sur 4 \u00e9tapes : Extraction (r\u00e9cup\u00e9ration des donn\u00e9es sources), Transformation (nettoyage, normalisation, enrichissement), Validation (contr\u00f4les qualit\u00e9 des donn\u00e9es), et Chargement (\u00e9criture vers la destination). Chaque \u00e9tape \u00e9met des \u00e9v\u00e9nements de session structur\u00e9s avec timing, co\u00fbts en tokens et suivi des erreurs. Les r\u00e8gles de qualit\u00e9 int\u00e9gr\u00e9es d\u00e9tectent les violations de sch\u00e9ma, les taux de nulls et les anomalies de distribution avant le chargement.",
    timeSaved: "3-8 heures de d\u00e9bogage ETL manuel r\u00e9duites \u00e0 une identification instantan\u00e9e de la cause racine",
    costReduction: "~50K\u20ac/an en temps d'ing\u00e9nierie data + pr\u00e9vient 200K\u20ac+ de co\u00fbts li\u00e9s aux donn\u00e9es corrompues en aval",
    riskMitigation: "99,5% de qualit\u00e9 des donn\u00e9es avec validation pr\u00e9-chargement \u2014 z\u00e9ro corruption silencieuse",
  },
  // data.gouv.fr MCP Templates
  "analyste-donnees-publiques": {
    title: "Analyste Donn\u00e9es Publiques — France",
    domain: "data.gouv.fr / Open Data",
    tagline: "Explorez, interrogez et analysez n'importe quel dataset de data.gouv.fr via le serveur MCP officiel",
    description:
      "Un agent analyste g\u00e9n\u00e9raliste connect\u00e9 au serveur MCP data.gouv.fr (9 outils). Il peut rechercher dans le catalogue fran\u00e7ais d'open data (90 000+ datasets), interroger des donn\u00e9es tabulaires sans t\u00e9l\u00e9chargement, d\u00e9couvrir les API gouvernementales et produire des analyses structur\u00e9es. Id\u00e9al pour les journalistes, chercheurs, analystes de politiques publiques et d\u00e9veloppeurs civic tech.",
    timeSaved: "2-6 heures de navigation manuelle sur data.gouv.fr r\u00e9duites \u00e0 une conversation",
    costReduction: "\u00c9limine le besoin d'ing\u00e9nieurs data pour l'analyse exploratoire (~30K\u20ac/an)",
    riskMitigation: "Interroge les donn\u00e9es en direct — pas de CSV p\u00e9rim\u00e9s ni d'\u00e9cart de version",
  },
  "assistant-juridique-france": {
    title: "Assistant Juridique — France",
    domain: "data.gouv.fr / Open Data",
    tagline: "Recherchez les lois, r\u00e8glements et conventions collectives fran\u00e7aises via les datasets juridiques de data.gouv.fr",
    description:
      "Un agent de recherche juridique qui exploite data.gouv.fr pour rechercher dans LEGI (codes et lois consolid\u00e9s), JORF (Journal Officiel — d\u00e9crets, circulaires), KALI (conventions collectives nationales) et CASS (d\u00e9cisions de la Cour de cassation). Il peut croiser les textes juridiques, expliquer les articles en langage clair et identifier la jurisprudence pertinente. Pas un substitut au conseil juridique — un acc\u00e9l\u00e9rateur de recherche.",
    timeSaved: "1-3 heures de recherche manuelle sur L\u00e9gifrance r\u00e9duites \u00e0 quelques minutes",
    costReduction: "~20K\u20ac/an en temps de recherche de collaborateur junior pour un petit cabinet",
    riskMitigation: "Croisement de plusieurs sources pour r\u00e9duire le risque d'oublier une r\u00e9glementation pertinente",
  },
  "assistant-immobilier-dvf": {
    title: "Analyste Immobilier — DVF France",
    domain: "data.gouv.fr / Open Data",
    tagline: "Analysez les transactions immobili\u00e8res (DVF), le cadastre et les bases b\u00e2timents depuis data.gouv.fr",
    description:
      "Un agent sp\u00e9cialis\u00e9 dans l'analyse immobili\u00e8re utilisant DVF (Demandes de Valeurs Fonci\u00e8res — toutes les transactions immobili\u00e8res en France), les donn\u00e9es cadastrales et la BDNB. Il peut calculer le prix/m\u00b2 par commune, identifier les tendances du march\u00e9, comparer les quartiers et croiser avec les donn\u00e9es de performance \u00e9nerg\u00e9tique. Essentiel pour agents immobiliers, investisseurs, notaires et promoteurs.",
    timeSaved: "4-8 heures d'analyse de tableurs DVF r\u00e9duites \u00e0 une conversation",
    costReduction: "Remplace les abonnements sp\u00e9cialis\u00e9s en donn\u00e9es immobili\u00e8res (5K\u20ac-15K\u20ac/an)",
    riskMitigation: "Donn\u00e9es de transactions officielles DGFiP — aucun biais d'estimation ni erreur d'\u00e9chantillonnage",
  },
  "veille-fiscale-comptable": {
    title: "Veille Fiscale & Comptable — France",
    domain: "data.gouv.fr / Open Data",
    tagline: "Interrogez les donn\u00e9es fiscales, taux d'imposition locaux et statistiques DGFiP depuis data.gouv.fr",
    description:
      "Un agent de veille fiscale exploitant les datasets ouverts DGFiP sur data.gouv.fr. Il peut rechercher les taux d'imposition locaux (taxe fonci\u00e8re, CFE, CVAE) par commune, comparer la pression fiscale entre territoires, analyser les statistiques de recettes fiscales et croiser avec les donn\u00e9es \u00e9conomiques INSEE. Con\u00e7u pour comptables, conseillers fiscaux, DAF et analystes de finances municipales.",
    timeSaved: "2-4 heures de recherche manuelle DGFiP par analyse",
    costReduction: "Remplace les outils sp\u00e9cialis\u00e9s de donn\u00e9es fiscales (3K\u20ac-8K\u20ac/an de licences)",
    riskMitigation: "Donn\u00e9es officielles DGFiP — source faisant autorit\u00e9 pour les taux d'imposition et statistiques fiscales",
  },
  "assistant-urbanisme-construction": {
    title: "Assistant Urbanisme & Construction — France",
    domain: "data.gouv.fr / Open Data",
    tagline: "Explorez les donn\u00e9es PLU, bases b\u00e2timents et permis de construire depuis data.gouv.fr",
    description:
      "Un agent d'intelligence urbanistique et construction exploitant data.gouv.fr pour les donn\u00e9es PLU (Plan Local d'Urbanisme), la BDNB (base b\u00e2timents nationale via API), les permis de construire (Sit@del) et le cadastre. Il aide architectes, promoteurs, urbanistes et collectivit\u00e9s \u00e0 comprendre les r\u00e8gles de zonage, les caract\u00e9ristiques du parc b\u00e2ti et les tendances de construction. Croisement avec les donn\u00e9es DPE de l'ADEME.",
    timeSaved: "3-6 heures de croisement de sources urbanistiques multiples",
    costReduction: "\u00c9vite les erreurs co\u00fbteuses de conformit\u00e9 zonage (10K\u20ac-100K\u20ac par projet)",
    riskMitigation: "Croisement des sources officielles pour valider la compatibilit\u00e9 zonage avant acquisition fonci\u00e8re",
  },
};
