import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, findUserByStripeCustomerId, updateSubscriptionInFirestore } from "@/lib/stripe/server";
import type { PlanTier } from "@/lib/billing/pricing";

type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.firebaseUserId;
        const plan = (session.metadata?.plan || "starter") as PlanTier;

        if (!userId) {
          console.warn("No firebaseUserId in checkout session metadata");
          break;
        }

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await updateSubscriptionInFirestore(userId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            plan,
            status: subscription.status as SubscriptionStatus,
            currentPeriodEnd: new Date(
              subscription.items.data[0].current_period_end * 1000
            ).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
        }
        break;
      }

      case "customer.subscription.created": {
        // Covers subscriptions created via Dashboard or API (not through Checkout)
        const createdSub = event.data.object as Stripe.Subscription;
        const createdCustomerId = createdSub.customer as string;
        const createdPlan = (createdSub.metadata?.plan || "starter") as PlanTier;

        // Try metadata first, then look up by customer ID
        const createdUserId =
          createdSub.metadata?.firebaseUserId ||
          (await findUserByStripeCustomerId(createdCustomerId));
        if (!createdUserId) break;

        await updateSubscriptionInFirestore(createdUserId, {
          stripeCustomerId: createdCustomerId,
          stripeSubscriptionId: createdSub.id,
          plan: createdPlan,
          status: createdSub.status as SubscriptionStatus,
          currentPeriodEnd: new Date(
            createdSub.items.data[0].current_period_end * 1000
          ).toISOString(),
          cancelAtPeriodEnd: createdSub.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await findUserByStripeCustomerId(customerId);
        if (!userId) break;

        const plan = (subscription.metadata?.plan || "starter") as PlanTier;

        await updateSubscriptionInFirestore(userId, {
          plan,
          status: subscription.status as SubscriptionStatus,
          currentPeriodEnd: new Date(
            subscription.items.data[0].current_period_end * 1000
          ).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await findUserByStripeCustomerId(customerId);
        if (!userId) break;

        await updateSubscriptionInFirestore(userId, {
          stripeSubscriptionId: null,
          plan: "starter",
          status: "canceled",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
        break;
      }

      case "invoice.paid": {
        // Confirms successful payment (important for usage-based monthly invoices)
        const paidInvoice = event.data.object as Stripe.Invoice;
        const paidCustomerId = paidInvoice.customer as string;
        const paidUserId = await findUserByStripeCustomerId(paidCustomerId);
        if (!paidUserId) break;

        // If the sub was past_due, it's now recovered
        await updateSubscriptionInFirestore(paidUserId, {
          status: "active",
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await findUserByStripeCustomerId(customerId);
        if (!userId) break;

        await updateSubscriptionInFirestore(userId, {
          status: "past_due",
        });
        break;
      }

      case "invoice.finalization_failed": {
        // Meter or billing error — log for investigation
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.error(
          `Invoice finalization failed for customer ${failedInvoice.customer}:`,
          failedInvoice.id
        );
        break;
      }

      case "customer.subscription.paused": {
        const pausedSub = event.data.object as Stripe.Subscription;
        const pausedCustomerId = pausedSub.customer as string;
        const pausedUserId = await findUserByStripeCustomerId(pausedCustomerId);
        if (!pausedUserId) break;

        await updateSubscriptionInFirestore(pausedUserId, {
          status: "canceled", // Treat paused as canceled for plan enforcement
        });
        break;
      }

      case "customer.subscription.resumed": {
        const resumedSub = event.data.object as Stripe.Subscription;
        const resumedCustomerId = resumedSub.customer as string;
        const resumedUserId = await findUserByStripeCustomerId(resumedCustomerId);
        if (!resumedUserId) break;

        await updateSubscriptionInFirestore(resumedUserId, {
          status: resumedSub.status as SubscriptionStatus,
          currentPeriodEnd: new Date(
            resumedSub.items.data[0].current_period_end * 1000
          ).toISOString(),
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
