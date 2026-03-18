import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";

const BUG_FIXER_OWNER_ID = process.env.BUG_FIXER_OWNER_ID;
const BUG_FIXER_AGENT_ID = process.env.BUG_FIXER_AGENT_ID;

/**
 * POST /api/bug-report/trigger
 * Admin-only: re-trigger the bug fixer agent on an existing bug.
 * Does NOT create a new bug or send email.
 */
export async function POST(req: NextRequest) {
  // 1. Auth — verify Firebase ID token
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Admin check
  const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);
  if (!ADMIN_UIDS.includes(uid)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // 3. Check config
  if (!BUG_FIXER_OWNER_ID || !BUG_FIXER_AGENT_ID) {
    return NextResponse.json({ error: "Bug fixer agent not configured" }, { status: 500 });
  }

  // 4. Get bug
  const { bugId } = await req.json();
  if (!bugId) {
    return NextResponse.json({ error: "bugId required" }, { status: 400 });
  }

  const bugSnap = await adminDb.doc(`users/${BUG_FIXER_OWNER_ID}/bugs/${bugId}`).get();
  if (!bugSnap.exists) {
    return NextResponse.json({ error: "Bug not found" }, { status: 404 });
  }
  const bug = bugSnap.data()!;

  // 5. Load agent config
  const agentSnap = await adminDb.doc(`users/${BUG_FIXER_OWNER_ID}/agents/${BUG_FIXER_AGENT_ID}`).get();
  if (!agentSnap.exists) {
    return NextResponse.json({ error: "Bug fixer agent not found" }, { status: 404 });
  }
  const agent = agentSnap.data()!;

  // 6. Load skills
  const skillsSnap = await adminDb.collection(`users/${BUG_FIXER_OWNER_ID}/agents/${BUG_FIXER_AGENT_ID}/skills`).get();
  const skills = skillsSnap.docs.map((d) => {
    const s = d.data();
    return { name: s.name, content: s.content };
  });

  // 7. Build trigger message
  const triggerMessage = [
    `A bug report needs analysis (Bug ID: ${bugId}).`,
    `Severity: ${bug.severity?.toUpperCase()}`,
    `Description: ${bug.description}`,
    bug.pageUrl ? `Page: ${bug.pageUrl}` : "",
    bug.reporterEmail ? `Reporter: ${bug.reporterEmail}` : "",
    "",
    "Please:",
    "1. Update the bug status to 'analyzing' using update_bug_status",
    "2. Search the Kopern codebase to identify the root cause",
    "3. Create a fix branch, commit the fix, and create a pull request",
    "4. Update the bug with the PR URL and set status to 'awaiting_review'",
    "5. Send a warm thank-you email to the reporter if they provided their email",
  ].filter(Boolean).join("\n");

  // 8. Fire-and-forget: call chat route internally
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  fetch(`${baseUrl}/api/agents/${BUG_FIXER_AGENT_ID}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Trigger": "bug-fixer",
    },
    body: JSON.stringify({
      userId: BUG_FIXER_OWNER_ID,
      message: triggerMessage,
      history: [],
      connectedRepos: agent.connectedRepos || [],
      agentConfig: {
        systemPrompt: agent.systemPrompt || "",
        modelProvider: agent.modelProvider || "anthropic",
        modelId: agent.modelId || "claude-sonnet-4-5-20250514",
        skills,
      },
    }),
  }).catch((err) => console.error("Failed to trigger bug fixer:", err));

  return NextResponse.json({ ok: true, bugId });
}
