import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    const body = await req.json();
    const locale = /^[a-z]{2}$/.test(body.locale || "") ? body.locale : "en";

    const customerId = await getOrCreateStripeCustomer(
      userId,
      decoded.email || ""
    );

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE_URL}/${locale}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}
