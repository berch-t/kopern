"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import type { PlanTier } from "@/lib/billing/pricing";

/** Client-safe subscription state — no internal Stripe IDs */
interface ClientSubscription {
  plan: PlanTier;
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const DEFAULT_SUB: ClientSubscription = {
  plan: "starter",
  status: "active",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ClientSubscription>(DEFAULT_SUB);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(DEFAULT_SUB);
      setLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription || DEFAULT_SUB);
      }
    } catch {
      // Fall back to starter
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkout = async (plan: string, period: "monthly" | "annual", locale = "en") => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan, period, locale }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  const openPortal = async (locale = "en") => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ locale }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  return {
    subscription,
    loading,
    isStarter: subscription.plan === "starter",
    isPro: subscription.plan === "pro",
    isUsage: subscription.plan === "usage",
    isEnterprise: subscription.plan === "enterprise",
    isPaid: subscription.plan !== "starter",
    checkout,
    openPortal,
    refresh,
  };
}
