# Guide Complet de Deploiement Stripe pour Kopern

## 1. Creer un Compte Stripe

1. Va sur **https://dashboard.stripe.com/register**
2. Cree ton compte avec ton email `berchet.thomas@gmail.com`
3. Complete la verification d'identite (KYC) quand demande

---

## 2. Recuperer les Cles API

1. Va sur **https://dashboard.stripe.com/apikeys**
2. Copie :
   - **Publishable key** : `pk_test_...` (pas utilise cote serveur, mais garde-le)
   - **Secret key** : `sk_test_...` → c'est `STRIPE_SECRET_KEY`
3. Ajoute dans Vercel (Settings → Environment Variables) :
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```

---

## 3. Creer les Produits

### 3.1 Produit "Kopern Pro"

1. Va sur **https://dashboard.stripe.com/products/create**
2. Remplis :
   - **Name** : `Kopern Pro`
   - **Description** : `25 agents, 1M tokens/month, 10 MCP endpoints, priority support`
   - **Metadata** : ajoute `plan` = `pro`
3. Ajoute **2 prix** :
   - **Prix mensuel** : $79.00 / month (Recurring)
     - Copie le Price ID → `STRIPE_PRICE_PRO_MONTHLY`
   - **Prix annuel** : $790.00 / year (Recurring)
     - Copie le Price ID → `STRIPE_PRICE_PRO_ANNUAL`

### 3.2 Produit "Kopern Enterprise"

1. Cree un nouveau produit
2. Remplis :
   - **Name** : `Kopern Enterprise`
   - **Description** : `Unlimited agents, 10M tokens/month, SSO, audit logs, dedicated support`
   - **Metadata** : `plan` = `enterprise`
3. Ajoute **2 prix** :
   - **Prix mensuel** : $499.00 / month → `STRIPE_PRICE_ENTERPRISE_MONTHLY`
   - **Prix annuel** : $4,990.00 / year → `STRIPE_PRICE_ENTERPRISE_ANNUAL`

---

## 4. Creer les Billing Meters (Facturation a l'Usage)

### 4.1 Meter "Input Tokens"

1. Va sur **https://dashboard.stripe.com/billing/meters**
2. Clique **Create meter**
3. Remplis :
   - **Display name** : `Input Tokens`
   - **Event name** : `kopern_input_tokens`
   - **Value key** : `value` (default)
   - **Customer mapping** : `stripe_customer_id` (default)
   - **Aggregation** : `Sum`
4. Sauvegarde

### 4.2 Meter "Output Tokens"

1. Cree un nouveau meter
2. Remplis :
   - **Display name** : `Output Tokens`
   - **Event name** : `kopern_output_tokens`
   - **Aggregation** : `Sum`

### 4.3 Meter "Grading Runs"

1. Cree un nouveau meter
2. Remplis :
   - **Display name** : `Grading Runs`
   - **Event name** : `kopern_grading_runs`
   - **Aggregation** : `Sum`

---

## 5. Creer le Produit Usage-Based

1. Cree un nouveau produit :
   - **Name** : `Kopern Usage`
   - **Description** : `Pay-per-use — unlimited agents, tokens billed by consumption`
   - **Metadata** : `plan` = `usage`

2. Ajoute **3 prix metres** lies aux meters :

   **Prix 1 — Input Tokens** :
   - Type : **Usage-based** (metered)
   - Meter : `Input Tokens` (kopern_input_tokens)
   - Prix : **$0.000004 per unit** (= $4.00 / 1M tokens)
   - Billing period : Monthly
   - Nickname : `input_tokens`
   - Copie le Price ID → `STRIPE_PRICE_USAGE_INPUT`

   **Prix 2 — Output Tokens** :
   - Type : **Usage-based** (metered)
   - Meter : `Output Tokens` (kopern_output_tokens)
   - Prix : **$0.00002 per unit** (= $20.00 / 1M tokens)
   - Billing period : Monthly
   - Nickname : `output_tokens`
   - Copie le Price ID → `STRIPE_PRICE_USAGE_OUTPUT`

   **Prix 3 — Grading Runs** :
   - Type : **Usage-based** (metered)
   - Meter : `Grading Runs` (kopern_grading_runs)
   - Prix : **$0.15 per unit** (= $0.15 / run)
   - Billing period : Monthly
   - Nickname : `grading_runs`
   - Copie le Price ID → `STRIPE_PRICE_USAGE_GRADING`

---

## 6. Configurer le Customer Portal

1. Va sur **https://dashboard.stripe.com/settings/billing/portal**
2. Active les options :
   - **Invoice history** : ON
   - **Customer information** : email, payment method
   - **Subscription cancellation** : ON — mode "At end of billing period"
   - **Subscription updating** : ON — autorise les upgrades/downgrades
   - **Payment method** : ON — autoriser la modification
3. Ajoute les produits autorises pour switching :
   - Kopern Pro (monthly + annual)
   - Kopern Enterprise (monthly + annual)
   - Kopern Usage
4. Sauvegarde

---

## 7. Configurer le Webhook

1. Va sur **https://dashboard.stripe.com/webhooks**
2. Clique **Add endpoint**
3. Remplis :
   - **Endpoint URL** : `https://kopern.vercel.app/api/stripe/webhook`
   - **Events a ecouter** (selectionne ces 9) :
     - `checkout.session.completed` — nouveau checkout reussi
     - `customer.subscription.created` — abonnement cree (via Dashboard/API)
     - `customer.subscription.updated` — changement de plan, renouvellement
     - `customer.subscription.deleted` — abonnement supprime
     - `customer.subscription.paused` — abonnement mis en pause
     - `customer.subscription.resumed` — abonnement repris
     - `invoice.paid` — facture payee (confirme paiement usage mensuel)
     - `invoice.payment_failed` — echec de paiement
     - `invoice.finalization_failed` — erreur de finalisation (probleme meter)
4. Clique **Add endpoint**
5. Sur la page du webhook, copie le **Signing secret** (`whsec_...`)
   → `STRIPE_WEBHOOK_SECRET`

---

## 8. Variables d'Environnement Vercel

Va sur **https://vercel.com** → ton projet → Settings → Environment Variables.

Ajoute **toutes** ces variables :

```
# Stripe Core
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs — Pro
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...

# Stripe Price IDs — Enterprise
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_...

# Stripe Price IDs — Usage (metered)
STRIPE_PRICE_USAGE_INPUT=price_...
STRIPE_PRICE_USAGE_OUTPUT=price_...
STRIPE_PRICE_USAGE_GRADING=price_...
```

Puis **redeploy** le projet.

---

## 9. Tester en Mode Test

1. Utilise les **cartes de test Stripe** :
   - Succes : `4242 4242 4242 4242`
   - Echec : `4000 0000 0000 0002`
   - 3D Secure : `4000 0025 0000 3155`
   - Date : n'importe quelle date future, CVC : 3 chiffres quelconques

2. **Teste le checkout** :
   - Va sur `/pricing`, clique "S'abonner" sur Pro
   - Remplis la carte test → tu dois etre redirige vers `/billing`
   - Verifie dans Firestore que `users/{uid}.subscription.plan` = `pro`

3. **Teste le portal** :
   - Va sur `/billing`, clique "Gerer l'Abonnement"
   - Tu dois voir le Stripe Customer Portal

4. **Teste le webhook** :
   - Dans le dashboard Stripe → Webhooks → ton endpoint → "Send test webhook"
   - Envoie `customer.subscription.updated`
   - Verifie les logs Vercel pour confirmer la reception

5. **Teste l'usage meter** :
   - Envoie un message a un agent sur le plan "usage"
   - Va sur **https://dashboard.stripe.com/billing/meters** → verifie que les events arrivent

---

## 10. Passer en Production (Live)

1. Complete la verification Stripe (identite, compte bancaire)
2. Va sur **https://dashboard.stripe.com/apikeys** en mode **Live**
3. Copie les nouvelles cles live (`sk_live_...`)
4. **Recree** tous les produits, prix et meters en mode Live
   (les objets Test et Live sont separes)
5. **Recree** le webhook avec l'URL de production
6. Remplace **toutes** les env vars Vercel par les versions Live
7. Redeploy

---

## 11. Firestore Index (Requis)

Pour la query `findUserByStripeCustomerId`, cree un index composite :

1. Va sur **https://console.firebase.google.com** → Firestore → Indexes
2. Ajoute un index :
   - Collection : `users`
   - Field : `subscription.stripeCustomerId` — Ascending
   - Query scope : Collection

Ou attends que Firestore te donne le lien direct dans les logs d'erreur au premier appel.

---

## Architecture Recap

```
Utilisateur → Pricing Page → Stripe Checkout → Stripe
                                                  ↓
                                            Webhook POST
                                                  ↓
                                    /api/stripe/webhook
                                                  ↓
                                    Firestore users/{uid}.subscription
                                                  ↓
                                    useSubscription() → UI

Agent Chat → trackUsageServer() → Firestore usage/{YYYY-MM}
                                → reportUsageToStripe() → Stripe Billing Meters
                                                            ↓
                                                    Facture mensuelle auto
```

## Commission Kopern

| Element | Cout Provider | Prix Kopern | Commission |
|---------|--------------|-------------|------------|
| Input tokens (1M) | ~$3.00 | $4.00 | ~$1.00 (25%) |
| Output tokens (1M) | ~$15.00 | $20.00 | ~$5.00 (25%) |
| Grading run | ~$0.12 | $0.15 | ~$0.03 (20%) |

La commission de 20% est affichee sur la page Tarifs.
