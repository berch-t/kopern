import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

/**
 * GET /api/gdpr/export — GDPR Art. 15 Data Access
 * Returns all user data in JSON format.
 * Auth: Firebase ID token in Authorization header.
 */
export async function GET(request: Request) {
  try {
    // Verify auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    // Collect all user data
    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      userId,
    };

    // 1. User profile
    const userSnap = await adminDb.doc(`users/${userId}`).get();
    if (userSnap.exists) {
      const userData = userSnap.data()!;
      // Redact sensitive fields
      exportData.profile = {
        displayName: userData.displayName,
        email: userData.email,
        defaultProvider: userData.defaultProvider,
        defaultModel: userData.defaultModel,
        apiKeysProviders: userData.apiKeys ? Object.keys(userData.apiKeys) : [],
        subscription: userData.subscription,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      };
    }

    // 2. Consent preferences
    const consentSnap = await adminDb.doc(`users/${userId}/consent/preferences`).get();
    if (consentSnap.exists) {
      exportData.consent = consentSnap.data();
    }

    // 3. Agents (names + config, no full prompts for brevity)
    const agentsSnap = await adminDb.collection(`users/${userId}/agents`).get();
    exportData.agents = agentsSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      description: d.data().description,
      domain: d.data().domain,
      modelProvider: d.data().modelProvider,
      modelId: d.data().modelId,
      createdAt: d.data().createdAt,
    }));

    // 4. Usage data (last 12 months)
    const usageSnap = await adminDb.collection(`users/${userId}/usage`).get();
    exportData.usage = usageSnap.docs.map((d) => ({
      yearMonth: d.id,
      ...d.data(),
    }));

    // 5. Agent teams
    const teamsSnap = await adminDb.collection(`users/${userId}/agentTeams`).get();
    exportData.teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 6. Bugs reported
    const bugsSnap = await adminDb.collection(`users/${userId}/bugs`).get();
    exportData.bugs = bugsSnap.docs.map((d) => ({
      id: d.id,
      severity: d.data().severity,
      description: d.data().description,
      status: d.data().status,
      createdAt: d.data().createdAt,
    }));

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="kopern-data-export-${userId.slice(0, 8)}.json"`,
      },
    });
  } catch (err) {
    console.error("GDPR export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
