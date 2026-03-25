import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  team: {
    id: string;
    name: string;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "https://kopern.ai";

  // Handle Slack OAuth denial
  if (errorParam) {
    console.error("[Slack OAuth] User denied access:", errorParam);
    return NextResponse.redirect(`${baseUrl}/en/agents`);
  }

  if (!code || !stateParam) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 }
    );
  }

  // Decode state
  let userId: string;
  let agentId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(stateParam, "base64").toString("utf-8")
    ) as { userId: string; agentId: string };
    userId = decoded.userId;
    agentId = decoded.agentId;
  } catch {
    return NextResponse.json(
      { error: "Invalid state parameter" },
      { status: 400 }
    );
  }

  // Exchange code for token
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/slack/oauth`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Slack integration not configured" },
      { status: 500 }
    );
  }

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as SlackOAuthResponse;

  if (!tokenData.ok) {
    console.error("[Slack OAuth] Token exchange failed:", tokenData.error);
    return NextResponse.json(
      { error: `Slack OAuth failed: ${tokenData.error || "unknown error"}` },
      { status: 502 }
    );
  }

  const { access_token, bot_user_id, team } = tokenData;

  // Write SlackConnectionDoc to Firestore
  const connectorRef = adminDb.doc(
    `users/${userId}/agents/${agentId}/connectors/slackConnection`
  );
  await connectorRef.set({
    teamId: team.id,
    teamName: team.name,
    botToken: access_token,
    botUserId: bot_user_id,
    channels: [],
    enabled: true,
    installedBy: userId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Write SlackTeamIndexDoc for O(1) event lookup
  const indexRef = adminDb.doc(`slackTeams/${team.id}`);
  await indexRef.set({
    userId,
    agentId,
  });

  // Redirect to agent connectors page
  return NextResponse.redirect(
    `${baseUrl}/en/agents/${agentId}/connectors`
  );
}
