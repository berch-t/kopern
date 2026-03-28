// OAuth token management: refresh, resolve, and store encrypted tokens
// Supports Google and Microsoft providers

import { adminDb } from "@/lib/firebase/admin";
import { encrypt, decrypt } from "@/lib/crypto/encrypt";
import type { ServiceProvider } from "@/lib/firebase/firestore";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
  scopes: string[];
}

/**
 * Resolve a valid access token for the given provider.
 * Automatically refreshes if expired (with 5-min buffer).
 */
export async function resolveAccessToken(
  userId: string,
  provider: ServiceProvider
): Promise<{ token: string; email: string } | null> {
  const snap = await adminDb.doc(`users/${userId}/serviceConnectors/${provider}`).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (!data.enabled) return null;

  const now = Date.now();
  const expiresAt = data.expiresAt as number;

  // If token expires in less than 5 minutes, refresh
  if (expiresAt - now < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(userId, provider, decrypt(data.refreshToken as string));
    if (!refreshed) return null;
    return { token: refreshed.accessToken, email: data.email as string };
  }

  return { token: decrypt(data.accessToken as string), email: data.email as string };
}

/**
 * Refresh an OAuth access token and update Firestore.
 */
async function refreshAccessToken(
  userId: string,
  provider: ServiceProvider,
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: number } | null> {
  try {
    const params = provider === "google"
      ? {
          url: "https://oauth2.googleapis.com/token",
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        }
      : {
          url: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_OAUTH_CLIENT_ID || "",
            client_secret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || "",
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        };

    const res = await fetch(params.url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.body,
    });
    if (!res.ok) return null;

    const json = await res.json();
    const accessToken = json.access_token as string;
    const expiresIn = (json.expires_in as number) || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;
    const newRefresh = (json.refresh_token as string) || refreshToken;

    await adminDb.doc(`users/${userId}/serviceConnectors/${provider}`).update({
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(newRefresh),
      expiresAt,
      updatedAt: new Date(),
    });

    return { accessToken, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Store OAuth tokens after initial authorization callback.
 */
export async function storeOAuthTokens(
  userId: string,
  provider: ServiceProvider,
  tokens: TokenPair
): Promise<void> {
  await adminDb.doc(`users/${userId}/serviceConnectors/${provider}`).set({
    provider,
    accessToken: encrypt(tokens.accessToken),
    refreshToken: encrypt(tokens.refreshToken),
    scopes: tokens.scopes,
    expiresAt: tokens.expiresAt,
    email: tokens.email,
    enabled: true,
    dailySendCount: 0,
    dailySendDate: new Date().toISOString().slice(0, 10),
    dailyCreateCount: 0,
    dailyCreateDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Revoke OAuth tokens and delete the connector doc.
 */
export async function revokeServiceConnector(
  userId: string,
  provider: ServiceProvider
): Promise<void> {
  const snap = await adminDb.doc(`users/${userId}/serviceConnectors/${provider}`).get();
  if (!snap.exists) return;

  const data = snap.data()!;
  const token = decrypt(data.accessToken as string);

  // Revoke at provider
  try {
    if (provider === "google") {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: "POST" });
    } else {
      // Microsoft doesn't have a simple revoke endpoint — just delete locally
    }
  } catch {
    // Best effort
  }

  await adminDb.doc(`users/${userId}/serviceConnectors/${provider}`).delete();
}

/**
 * Increment daily counter and check limit. Returns true if allowed.
 */
export async function checkAndIncrementDailyLimit(
  userId: string,
  provider: ServiceProvider,
  field: "dailySendCount" | "dailyCreateCount",
  limit: number
): Promise<boolean> {
  const ref = adminDb.doc(`users/${userId}/serviceConnectors/${provider}`);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data()!;

  const today = new Date().toISOString().slice(0, 10);
  const dateField = field === "dailySendCount" ? "dailySendDate" : "dailyCreateDate";
  const currentDate = data[dateField] as string;
  const currentCount = (data[field] as number) || 0;

  if (currentDate !== today) {
    // New day — reset
    await ref.update({ [field]: 1, [dateField]: today, updatedAt: new Date() });
    return true;
  }

  if (currentCount >= limit) return false;

  await ref.update({ [field]: currentCount + 1, updatedAt: new Date() });
  return true;
}
