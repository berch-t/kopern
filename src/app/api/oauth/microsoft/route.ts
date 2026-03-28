// Microsoft OAuth: authorize + callback for Outlook Mail + Calendar
// GET /api/oauth/microsoft?userId=xxx&scopes=mail,calendar → redirect to Microsoft consent
// GET /api/oauth/microsoft?code=xxx&state=xxx → callback, store tokens

import { NextRequest, NextResponse } from "next/server";
import { storeOAuthTokens } from "@/lib/services/oauth-tokens";

const MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

const SCOPE_MAP: Record<string, string[]> = {
  mail: [
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/Mail.Send",
  ],
  calendar: [
    "https://graph.microsoft.com/Calendars.Read",
    "https://graph.microsoft.com/Calendars.ReadWrite",
  ],
};

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  return `${base}/api/oauth/microsoft`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    // --- Step 1: Redirect to Microsoft consent ---
    const userId = searchParams.get("userId");
    const scopeKeys = (searchParams.get("scopes") || "mail,calendar").split(",");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const scopes = scopeKeys.flatMap((k) => SCOPE_MAP[k.trim()] || []);
    scopes.push("offline_access", "openid", "email"); // Always request refresh token + email
    if (scopes.length <= 3) {
      return NextResponse.json({ error: "No valid scopes requested" }, { status: 400 });
    }

    const state = Buffer.from(JSON.stringify({ userId, scopes: scopeKeys })).toString("base64url");

    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_OAUTH_CLIENT_ID || "",
      redirect_uri: getRedirectUri(),
      response_type: "code",
      scope: scopes.join(" "),
      response_mode: "query",
      prompt: "consent",
      state,
    });

    return NextResponse.redirect(`${MS_AUTH_URL}?${params.toString()}`);
  }

  // --- Step 2: Callback — exchange code for tokens ---
  const stateParam = searchParams.get("state");
  if (!stateParam) {
    return NextResponse.json({ error: "Missing state" }, { status: 400 });
  }

  let state: { userId: string; scopes: string[] };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const allScopes = state.scopes.flatMap((k) => SCOPE_MAP[k] || []);
  allScopes.push("offline_access", "openid", "email");

  const tokenRes = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_OAUTH_CLIENT_ID || "",
      client_secret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || "",
      code,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
      scope: allScopes.join(" "),
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.json({ error: "Token exchange failed", details: err }, { status: 500 });
  }

  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token as string;
  const refreshToken = tokens.refresh_token as string;
  const expiresIn = (tokens.expires_in as number) || 3600;

  // Get user email from Microsoft Graph
  const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const me = await meRes.json();
  const email = (me.mail || me.userPrincipalName || "") as string;

  await storeOAuthTokens(state.userId, "microsoft", {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    email,
    scopes: allScopes.filter((s) => !["offline_access", "openid", "email"].includes(s)),
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/agents?oauth=microsoft&status=success`);
}
