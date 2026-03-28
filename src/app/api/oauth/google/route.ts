// Google OAuth: authorize + callback for Gmail + Calendar access
// GET /api/oauth/google?userId=xxx&scopes=gmail,calendar → redirect to Google consent
// GET /api/oauth/google?code=xxx&state=xxx → callback, store tokens

import { NextRequest, NextResponse } from "next/server";
import { storeOAuthTokens } from "@/lib/services/oauth-tokens";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const SCOPE_MAP: Record<string, string[]> = {
  gmail: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
  ],
  calendar: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ],
};

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  return `${base}/api/oauth/google`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    // --- Step 1: Redirect to Google consent ---
    const userId = searchParams.get("userId");
    const scopeKeys = (searchParams.get("scopes") || "gmail,calendar").split(",");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const scopes = scopeKeys.flatMap((k) => SCOPE_MAP[k.trim()] || []);
    if (scopes.length === 0) {
      return NextResponse.json({ error: "No valid scopes requested" }, { status: 400 });
    }

    const state = Buffer.from(JSON.stringify({ userId, scopes: scopeKeys })).toString("base64url");

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      redirect_uri: getRedirectUri(),
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
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

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
      code,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
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

  // Get user email from Google
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userInfo = await userInfoRes.json();
  const email = (userInfo.email as string) || "";

  const allScopes = state.scopes.flatMap((k) => SCOPE_MAP[k] || []);

  await storeOAuthTokens(state.userId, "google", {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    email,
    scopes: allScopes,
  });

  // Redirect back to dashboard with success
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/agents?oauth=google&status=success`);
}
