import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("userId");
  const agentId = searchParams.get("agentId");

  if (!userId || !agentId) {
    return NextResponse.json(
      { error: "Missing userId or agentId" },
      { status: 400 }
    );
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Slack integration not configured" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://kopern.vercel.app";
  const redirectUri = `${baseUrl}/api/slack/oauth`;

  const state = Buffer.from(
    JSON.stringify({ userId, agentId })
  ).toString("base64");

  const scopes = [
    "chat:write",
    "app_mentions:read",
    "channels:history",
    "im:history",
    "im:read",
    "im:write",
    "reactions:write",
  ].join(",");

  const oauthUrl = new URL("https://slack.com/oauth/v2/authorize");
  oauthUrl.searchParams.set("client_id", clientId);
  oauthUrl.searchParams.set("scope", scopes);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("state", state);

  return NextResponse.redirect(oauthUrl.toString());
}
