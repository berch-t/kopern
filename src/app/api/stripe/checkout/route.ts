import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe/server";
import { getPriceId, getUsageMeteredPriceIds } from "@/lib/stripe/config";
import type { PlanTier } from "@/lib/billing/pricing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.ai";

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    const body = await req.json();
    const { plan, period } = body as {
      plan: string;
      period: string;
      locale?: string;
    };

    // Runtime validation — TypeScript casts are compile-time only
    const VALID_PLANS = ["pro", "usage", "enterprise"] as const;
    const VALID_PERIODS = ["monthly", "annual"] as const;

    if (!plan || !VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!period || !VALID_PERIODS.includes(period as typeof VALID_PERIODS[number])) {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    // Sanitize locale to prevent URL injection
    const locale = /^[a-z]{2}$/.test(body.locale || "") ? body.locale : "en";

    const validPlan = plan as PlanTier;
    const validPeriod = period as "monthly" | "annual";

    // Validate Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables." },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(
      userId,
      decoded.email || "",
      decoded.name || undefined
    );

    const successUrl = `${SITE_URL}/${locale || "en"}/billing?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${SITE_URL}/${locale || "en"}/pricing`;

    // Usage plan: metered billing with Stripe Billing Meters
    if (validPlan === "usage") {
      const meteredPrices = getUsageMeteredPriceIds().filter(Boolean);
      if (meteredPrices.length === 0) {
        return NextResponse.json(
          { error: "Usage pricing not configured. Set STRIPE_PRICE_USAGE_* env vars." },
          { status: 503 }
        );
      }
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: meteredPrices.map((priceId) => ({ price: priceId })),
        subscription_data: {
          metadata: { plan: "usage", firebaseUserId: userId },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { firebaseUserId: userId, plan: "usage" },
      });

      return NextResponse.json({ url: session.url });
    }

    // Pro / Enterprise: fixed-price subscription
    const priceId = getPriceId(validPlan, validPeriod);
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured. Set STRIPE_PRICE_* env vars." },
        { status: 503 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { plan: validPlan, firebaseUserId: userId },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { firebaseUserId: userId, plan: validPlan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
