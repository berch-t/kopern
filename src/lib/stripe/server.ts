import Stripe from "stripe";
import { adminDb } from "@/lib/firebase/admin";
import type { PlanTier } from "@/lib/billing/pricing";

// ---------------------------------------------------------------------------
// Stripe SDK singleton
// ---------------------------------------------------------------------------
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// ---------------------------------------------------------------------------
// Subscription doc stored in Firestore
// ---------------------------------------------------------------------------
export interface SubscriptionData {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: PlanTier;
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
  currentPeriodEnd: string | null; // ISO string
  cancelAtPeriodEnd: boolean;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  stripeCustomerId: "",
  stripeSubscriptionId: null,
  plan: "starter",
  status: "active",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

// ---------------------------------------------------------------------------
// Customer management
// ---------------------------------------------------------------------------

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const userRef = adminDb.doc(`users/${userId}`);

  // Use a transaction to prevent duplicate Stripe customers on concurrent requests
  return adminDb.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const userData = userSnap.data();

    if (userData?.subscription?.stripeCustomerId) {
      return userData.subscription.stripeCustomerId;
    }

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: { firebaseUserId: userId },
    });

    tx.set(
      userRef,
      {
        subscription: {
          ...DEFAULT_SUBSCRIPTION,
          stripeCustomerId: customer.id,
        },
      },
      { merge: true }
    );

    return customer.id;
  });
}

// ---------------------------------------------------------------------------
// Subscription state update (called from webhook)
// ---------------------------------------------------------------------------

export async function updateSubscriptionInFirestore(
  userId: string,
  data: Partial<SubscriptionData>
): Promise<void> {
  const userRef = adminDb.doc(`users/${userId}`);

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    updates[`subscription.${key}`] = value;
  }

  await userRef.update(updates);
}

// ---------------------------------------------------------------------------
// Find Firebase user by Stripe customer ID
// ---------------------------------------------------------------------------

export async function findUserByStripeCustomerId(
  customerId: string
): Promise<string | null> {
  const snapshot = await adminDb
    .collection("users")
    .where("subscription.stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].id;
}

// ---------------------------------------------------------------------------
// Get user's current plan
// ---------------------------------------------------------------------------

export async function getUserPlan(userId: string): Promise<SubscriptionData> {
  const userRef = adminDb.doc(`users/${userId}`);
  const snap = await userRef.get();
  const data = snap.data();

  if (!data?.subscription) {
    return { ...DEFAULT_SUBSCRIPTION };
  }

  return data.subscription as SubscriptionData;
}

// ---------------------------------------------------------------------------
// Report usage to Stripe via Billing Meter Events
// Meters must be configured in Stripe Dashboard with these event names:
//   - kopern_input_tokens
//   - kopern_output_tokens
//   - kopern_grading_runs
// ---------------------------------------------------------------------------

export async function reportUsageToStripe(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  gradingRuns: number
): Promise<void> {
  const sub = await getUserPlan(userId);

  // Only report for usage-based plan with an active subscription
  if (sub.plan !== "usage" || !sub.stripeCustomerId) return;

  const stripe = getStripe();
  const reports: Promise<unknown>[] = [];

  if (inputTokens > 0) {
    reports.push(
      stripe.billing.meterEvents.create({
        event_name: "kopern_input_tokens",
        payload: {
          stripe_customer_id: sub.stripeCustomerId,
          value: String(inputTokens),
        },
      })
    );
  }

  if (outputTokens > 0) {
    reports.push(
      stripe.billing.meterEvents.create({
        event_name: "kopern_output_tokens",
        payload: {
          stripe_customer_id: sub.stripeCustomerId,
          value: String(outputTokens),
        },
      })
    );
  }

  if (gradingRuns > 0) {
    reports.push(
      stripe.billing.meterEvents.create({
        event_name: "kopern_grading_runs",
        payload: {
          stripe_customer_id: sub.stripeCustomerId,
          value: String(gradingRuns),
        },
      })
    );
  }

  await Promise.allSettled(reports);
}
