import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idToken = authHeader.slice(7);
  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const userSnap = await adminDb.doc(`users/${uid}`).get();
  const githubToken = userSnap.data()?.githubAccessToken;

  if (!githubToken) {
    return NextResponse.json({ error: "no_github_token" }, { status: 404 });
  }

  try {
    const res = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ error: "github_token_expired" }, { status: 401 });
      }
      return NextResponse.json({ error: "GitHub API error" }, { status: res.status });
    }

    const repos = await res.json();
    const mapped = repos.map((r: Record<string, unknown>) => ({
      fullName: r.full_name,
      name: r.name,
      owner: (r.owner as Record<string, unknown>)?.login,
      description: r.description,
      private: r.private,
      language: r.language,
      updatedAt: r.updated_at,
      defaultBranch: r.default_branch,
    }));

    return NextResponse.json({ repos: mapped });
  } catch {
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}
