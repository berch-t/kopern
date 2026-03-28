// Client-side actions for service connectors (Gmail/Calendar OAuth)
"use client";

import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { ServiceConnectorDoc, ServiceProvider } from "@/lib/firebase/firestore";
import { getAuth } from "firebase/auth";

export async function getServiceConnector(
  userId: string,
  provider: ServiceProvider
): Promise<(ServiceConnectorDoc & { id: string }) | null> {
  const snap = await getDoc(doc(db, "users", userId, "serviceConnectors", provider));
  if (!snap.exists()) return null;
  return { ...snap.data() as ServiceConnectorDoc, id: snap.id };
}

export async function getServiceConnectors(
  userId: string
): Promise<{ google: ServiceConnectorDoc | null; microsoft: ServiceConnectorDoc | null }> {
  const [google, microsoft] = await Promise.all([
    getServiceConnector(userId, "google"),
    getServiceConnector(userId, "microsoft"),
  ]);
  return { google, microsoft };
}

export async function disconnectService(provider: ServiceProvider): Promise<void> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch("/api/oauth/disconnect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ provider }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Disconnect failed");
  }
}

export function getOAuthUrl(provider: ServiceProvider, userId: string, scopes: string[]): string {
  const params = new URLSearchParams({
    userId,
    scopes: scopes.join(","),
  });
  return `/api/oauth/${provider}?${params.toString()}`;
}
