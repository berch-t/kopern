# Kopern Code Interpreter — Guide de deploiement GCP Cloud Run

> Projet GCP : `kopern` (ID: kopern, Numero: 779840452346)
> Region : `europe-west1`

Chaque etape est documentee en **deux versions** : Console Web GCP et CLI `gcloud`. Choisis celle qui te convient.

---

## Etape 1 — Activer les APIs necessaires

### Console Web
1. Aller sur https://console.cloud.google.com/apis/library?project=kopern
2. Rechercher et activer chacune de ces APIs (cliquer → **Activer**) :
   - **Cloud Run Admin API** (`run.googleapis.com`)
   - **Artifact Registry API** (`artifactregistry.googleapis.com`)
   - **Cloud Build API** (`cloudbuild.googleapis.com`)
   - **IAM API** (`iam.googleapis.com`)

### CLI
```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com iam.googleapis.com --project kopern
```

---

## Etape 2 — Creer le repo Artifact Registry

### Console Web
1. Aller sur https://console.cloud.google.com/artifacts?project=kopern
2. Cliquer **Creer un depot** (Create Repository)
3. Remplir :
   - **Nom** : `kopern-docker`
   - **Format** : `Docker`
   - **Mode** : Standard
   - **Region** : `europe-west1`
   - **Description** : `Kopern Docker images`
4. Cliquer **Creer**

### CLI
```bash
gcloud artifacts repositories create kopern-docker --repository-format=docker --location=europe-west1 --description="Kopern Docker images"
```

---

## Etape 3 — Test local (optionnel mais recommande)

Necessite Docker installe localement.

```bash
cd kopern/code-interpreter

# Build
docker build -t kopern-code-interpreter .

# Run
docker run -p 8080:8080 -e CODE_INTERPRETER_SECRET=test123 kopern-code-interpreter

# Test health (dans un autre terminal)
curl http://localhost:8080/health

# Test Python
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test123" \
  -d '{"language": "python", "code": "import numpy as np\nprint(f\"Mean: {np.mean([1,2,3,4,5])}\")", "timeout": 30}'
# Attendu: stdout contient "Mean: 3.0"

# Test Node.js
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test123" \
  -d '{"language": "nodejs", "code": "console.log(`Sum: ${[1,2,3,4,5].reduce((a,b)=>a+b)}`)", "timeout": 30}'
# Attendu: stdout contient "Sum: 15"

# Test Bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test123" \
  -d '{"language": "bash", "code": "echo Hello from Bash && date", "timeout": 30}'

# Test timeout (doit retourner timed_out: true)
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test123" \
  -d '{"language": "python", "code": "import time; time.sleep(999)", "timeout": 3}'

# Stopper
docker stop $(docker ps -q --filter ancestor=kopern-code-interpreter)
```

---

## Etape 4 — Build l'image via Cloud Build

Cloud Build construit l'image Docker dans le cloud (pas besoin de Docker local).

### Console Web
1. Aller sur https://console.cloud.google.com/cloud-build/builds?project=kopern
2. Cliquer **Creer un declencheur** (Create Trigger) — ou utiliser le build manuel :
3. **Build manuel** :
   - Ouvrir **Cloud Shell** (icone `>_` en haut a droite de la console)
   - Executer :
     ```bash
     cd ~ && git clone https://github.com/berch-t/kopern.git
     cd kopern/code-interpreter
     gcloud builds submit --tag europe-west1-docker.pkg.dev/kopern/kopern-docker/code-interpreter:latest
     ```
   - Attendre le build (~3-5 min)
4. Verifier l'image :
   - Aller sur https://console.cloud.google.com/artifacts/docker/kopern/europe-west1/kopern-docker?project=kopern
   - L'image `code-interpreter` avec le tag `latest` doit apparaitre

### CLI (local)
```bash
cd kopern/code-interpreter
gcloud builds submit --tag europe-west1-docker.pkg.dev/kopern/kopern-docker/code-interpreter:latest --project kopern
```

---

## Etape 5 — Generer un secret

Le secret sert a authentifier les appels de Kopern vers le Code Interpreter. Personne d'autre ne doit pouvoir appeler le service.

### Option A : en ligne
Aller sur https://generate-random.org/api-key-generator et generer une cle de 64 caracteres hexadecimaux.

### Option B : Cloud Shell ou terminal local
```bash
openssl rand -hex 32
```

**Copier la sortie** — tu en auras besoin aux etapes 6 et 7.

---

## Etape 6 — Deployer sur Cloud Run

### Console Web
1. Aller sur https://console.cloud.google.com/run?project=kopern
2. Cliquer **Creer un service** (Create Service)
3. **Configuration du conteneur** :
   - **Image du conteneur** : cliquer "Selectionner" → Artifact Registry → `kopern` → `kopern-docker` → `code-interpreter` → tag `latest` → **Selectionner**
   - **Nom du service** : `code-interpreter`
   - **Region** : `europe-west1 (Belgium)`
4. **Autoscaling** :
   - Nombre minimal d'instances : `0`
   - Nombre maximal d'instances : `10`
5. **Authentification** :
   - Selectionner **Exiger une authentification** (Require authentication)
   - C'est crucial — le service ne doit PAS etre public
6. **Conteneur, volumes, reseau, securite** (cliquer pour derouler) :
   - Onglet **Conteneur** :
     - **Port du conteneur** : `8080`
     - **Memoire** : `1 Gio`
     - **CPU** : `1`
     - **Delai d'expiration de la requete** : `300` secondes
     - **Nombre maximal de requetes simultanées** : `1` (important pour l'isolation)
   - Onglet **Variables et secrets** :
     - Cliquer **Ajouter une variable**
     - **Nom** : `CODE_INTERPRETER_SECRET`
     - **Valeur** : coller le secret genere a l'etape 5
7. Cliquer **Creer** (Create)
8. Attendre le deploiement (~1-2 min)
9. **Recuperer l'URL** : elle s'affiche en haut de la page du service, sous forme :
   `https://code-interpreter-XXXXXXXXXX-ew.a.run.app`
   **Copier cette URL** — tu en auras besoin a l'etape 7.

### CLI
```bash
gcloud run deploy code-interpreter \
  --image europe-west1-docker.pkg.dev/kopern/kopern-docker/code-interpreter:latest \
  --region europe-west1 \
  --platform managed \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300s \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 10 \
  --no-allow-unauthenticated \
  --set-env-vars "CODE_INTERPRETER_SECRET=VOTRE_SECRET_ICI" \
  --project kopern
```

### Tester le service (Cloud Shell)
```bash
# Recuperer l'URL
URL=$(gcloud run services describe code-interpreter --region europe-west1 --project kopern --format 'value(status.url)')

# Obtenir un token d'identite pour l'appel authentifie
TOKEN=$(gcloud auth print-identity-token)

# Test health
curl -H "Authorization: Bearer $TOKEN" "$URL/health"

# Test Python
curl -X POST "$URL/execute" \
  -H "Authorization: Bearer VOTRE_SECRET_ICI" \
  -H "Content-Type: application/json" \
  -d '{"language": "python", "code": "print(sum(range(101)))", "timeout": 10}'
# Attendu: stdout contient "5050"
```

---

## Etape 7 — Configurer Kopern (Vercel)

### Console Vercel
1. Aller sur https://vercel.com/dashboard → projet **kopern**
2. Cliquer **Settings** → **Environment Variables**
3. Ajouter 2 variables (scope: **Production** + **Preview**) :

| Nom | Valeur | Exemple |
|-----|--------|---------|
| `CODE_INTERPRETER_URL` | L'URL Cloud Run de l'etape 6 | `https://code-interpreter-abc123-ew.a.run.app` |
| `CODE_INTERPRETER_SECRET` | Le secret genere a l'etape 5 | `a1b2c3d4e5f6...` (64 chars hex) |

4. Cliquer **Save** pour chaque variable
5. **Redeploy** le projet pour que les variables soient prises en compte :
   - Aller dans **Deployments** → dernier deploy → menu `...` → **Redeploy**

### Vercel CLI
```bash
vercel env add CODE_INTERPRETER_URL production
vercel env add CODE_INTERPRETER_SECRET production
```

---

## Etape 8 — Tester de bout en bout

1. Aller sur https://kopern.ai (ou ton URL de preview Vercel)
2. **Agents** → choisir un agent ou en creer un
3. Aller dans **Edit** → section **Built-in Tools**
4. Cocher **Code Interpreter**
5. Sauvegarder
6. Ouvrir le **Playground**
7. Envoyer : `Calcule la moyenne de [1, 2, 3, 4, 5] en Python`
8. L'agent doit appeler `code_interpreter` et retourner `Mean: 3.0`
9. Envoyer : `Genere un graphique de sin(x) avec matplotlib et sauvegarde-le`
10. L'agent doit executer du Python matplotlib (output file genere)

---

## Etape 9 — Configurer GitHub Actions (CI/CD auto)

Le but : quand tu pushes un changement dans `code-interpreter/`, l'image est automatiquement rebuilde et redeployee.

### 9.1 — Creer le Workload Identity Pool (Console Web)

**Pourquoi** : permet a GitHub Actions de s'authentifier a GCP sans stocker de cle de service (plus securise).

1. Aller sur https://console.cloud.google.com/iam-admin/workload-identity-pools?project=kopern
2. Cliquer **Creer un pool** (Create Pool)
3. Remplir :
   - **Nom** : `github-pool`
   - **Description** : `GitHub Actions authentication`
4. Cliquer **Continuer**
5. **Ajouter un fournisseur** (Add Provider) :
   - **Type** : `OpenID Connect (OIDC)`
   - **Nom du fournisseur** : `github-provider`
   - **Issuer (URL de l'emetteur)** : `https://token.actions.githubusercontent.com`
   - **Audiences** : laisser par defaut (Default audience)
6. **Attribute mapping** (Mappage des attributs) :
   - `google.subject` → `assertion.sub`
   - Cliquer **Ajouter un mappage** : `attribute.repository` → `assertion.repository`
   - Cliquer **Ajouter un mappage** : `attribute.actor` → `assertion.actor`
7. Cliquer **Enregistrer**

### 9.2 — Creer le Service Account (Console Web)

1. Aller sur https://console.cloud.google.com/iam-admin/serviceaccounts?project=kopern
2. Cliquer **Creer un compte de service** (Create Service Account)
3. Remplir :
   - **Nom** : `github-deployer`
   - **Description** : `GitHub Actions CI/CD for code-interpreter`
4. Cliquer **Creer et continuer**
5. **Accorder des roles** (ajouter les 3) :
   - `Cloud Run Admin` (roles/run.admin)
   - `Artifact Registry Writer` (roles/artifactregistry.writer)
   - `Service Account User` (roles/iam.serviceAccountUser)
6. Cliquer **Continuer** → **OK**

### 9.3 — Autoriser GitHub a utiliser le Service Account (Console Web)

1. Dans la liste des comptes de service, cliquer sur `github-deployer@kopern.iam.gserviceaccount.com`
2. Onglet **Autorisations** (Permissions)
3. Cliquer **Accorder l'acces** (Grant Access)
4. **Nouveau compte principal** : entrer exactement :
   ```
   principalSet://iam.googleapis.com/projects/779840452346/locations/global/workloadIdentityPools/github-pool/attribute.repository/berch-t/kopern
   ```
   (remplacer `berch-t/kopern` par ton `org/repo` GitHub si different)
5. **Role** : `Workload Identity User` (roles/iam.workloadIdentityUser)
6. Cliquer **Enregistrer**

### 9.4 — Configurer les GitHub Secrets

1. Aller sur https://github.com/berch-t/kopern/settings/secrets/actions
2. Cliquer **New repository secret** pour chacun :

| Secret | Valeur |
|--------|--------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/779840452346/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-deployer@kopern.iam.gserviceaccount.com` |
| `CODE_INTERPRETER_SECRET` | Le meme secret qu'aux etapes 5-7 |

### 9.5 — Verifier

1. Modifier un fichier dans `code-interpreter/` (ex: ajouter un commentaire dans `server.py`)
2. Commit + push sur la branche `main`
3. Aller sur https://github.com/berch-t/kopern/actions
4. La workflow **Deploy Code Interpreter to Cloud Run** doit se declencher
5. Verifier que le build + deploy passe en vert
6. L'URL Cloud Run reste la meme (le service est mis a jour in-place)

---

## Monitoring

### Console Web
1. **Logs** : https://console.cloud.google.com/run/detail/europe-west1/code-interpreter/logs?project=kopern
   - Filtre par severite (Error, Warning, Info)
   - Recherche par texte (ex: "timeout", "error")
2. **Metriques** : https://console.cloud.google.com/run/detail/europe-west1/code-interpreter/metrics?project=kopern
   - Request count, latency (p50/p95/p99), error rate
   - Container instance count (verifier auto-scale)
   - Memory/CPU utilization
3. **Alertes de cout** :
   - Aller sur https://console.cloud.google.com/billing/budgets?project=kopern
   - Cliquer **Creer un budget**
   - **Nom** : `Code Interpreter`
   - **Montant** : `50 EUR`
   - **Seuils d'alerte** : 50%, 80%, 100%
   - **Notifications** : email

### CLI
```bash
# Logs en temps reel
gcloud run services logs read code-interpreter --region europe-west1 --project kopern --limit 50

# Metriques
gcloud run services describe code-interpreter --region europe-west1 --project kopern
```

---

## Desinstallation

### Console Web
1. **Supprimer le service Cloud Run** :
   - https://console.cloud.google.com/run?project=kopern
   - Cocher `code-interpreter` → cliquer **Supprimer**
2. **Supprimer l'image** (optionnel) :
   - https://console.cloud.google.com/artifacts/docker/kopern/europe-west1/kopern-docker?project=kopern
   - Cliquer sur `code-interpreter` → **Supprimer le package**
3. **Supprimer le repo Artifact Registry** (si plus rien dedans) :
   - https://console.cloud.google.com/artifacts?project=kopern
   - Cocher `kopern-docker` → **Supprimer**
4. **Supprimer les variables Vercel** :
   - https://vercel.com/dashboard → Settings → Environment Variables
   - Supprimer `CODE_INTERPRETER_URL` et `CODE_INTERPRETER_SECRET`

### CLI
```bash
gcloud run services delete code-interpreter --region europe-west1 --project kopern
gcloud artifacts docker images delete europe-west1-docker.pkg.dev/kopern/kopern-docker/code-interpreter --delete-tags
```

---

## Troubleshooting

| Probleme | Cause | Solution |
|----------|-------|---------|
| 401 Unauthorized | Secret ne correspond pas | Verifier `CODE_INTERPRETER_SECRET` dans Cloud Run (Variables) ET dans Vercel (env vars) — doivent etre identiques |
| 403 Forbidden | Service non-public + pas d'auth | Normal si appele sans Bearer token. Seul Kopern (via le secret) peut appeler |
| Timeout sur les grosses executions | Timeout Cloud Run trop court | Aller dans Cloud Run → Editer → Container → augmenter le delai d'expiration (max 3600s) |
| Cold start lent (>3s) | Auto-scale depuis 0 | Cloud Run → Editer → Autoscaling → Minimum instances = `1` (coute ~$10/mois) |
| Image trop grosse | Python + Node + packages | Normal — l'image fait ~600-800MB. Ne pas s'inquieter |
| Permission denied dans le code execute | Code tourne comme `executor` (non-root) | Normal et voulu — c'est une mesure de securite |
| `code_interpreter` non disponible dans l'agent | Builtin pas active | Agent → Edit → Built-in Tools → cocher **Code Interpreter** |
| `Code interpreter is not configured` | Env vars manquantes | Verifier `CODE_INTERPRETER_URL` et `CODE_INTERPRETER_SECRET` dans Vercel → Redeploy |
| GitHub Action ne se declenche pas | Mauvais path filter | Le changement doit etre dans `code-interpreter/**` et sur la branche `main` |
| GitHub Action echoue sur auth GCP | Workload Identity mal configure | Verifier le pool, le provider, le service account, et le binding dans IAM |

---

## Resume des URLs

| Quoi | URL |
|------|-----|
| Projet GCP | https://console.cloud.google.com/home/dashboard?project=kopern |
| APIs | https://console.cloud.google.com/apis/library?project=kopern |
| Artifact Registry | https://console.cloud.google.com/artifacts?project=kopern |
| Cloud Build | https://console.cloud.google.com/cloud-build/builds?project=kopern |
| Cloud Run | https://console.cloud.google.com/run?project=kopern |
| IAM Service Accounts | https://console.cloud.google.com/iam-admin/serviceaccounts?project=kopern |
| Workload Identity Pools | https://console.cloud.google.com/iam-admin/workload-identity-pools?project=kopern |
| Billing Budgets | https://console.cloud.google.com/billing/budgets?project=kopern |
| Vercel Dashboard | https://vercel.com/dashboard |
| GitHub Actions | https://github.com/berch-t/kopern/actions |
| GitHub Secrets | https://github.com/berch-t/kopern/settings/secrets/actions |
