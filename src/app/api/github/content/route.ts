import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";

/** Encode each path segment for GitHub API URLs (handles [locale], (public), etc.) */
function encodeGitHubPath(path: string): string {
  return path.split("/").map((seg) => encodeURIComponent(seg)).join("/");
}

async function getGithubToken(req: NextRequest): Promise<{ token: string; uid: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");
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

  const userSnap = await adminDb.doc(`users/${uid}`).get();
  const githubToken = userSnap.data()?.githubAccessToken;

  if (!githubToken) {
    return NextResponse.json({ error: "no_github_token" }, { status: 404 });
  }

  return { token: githubToken, uid };
}

// GET /api/github/content?repo=owner/name&branch=main
// Returns the repo tree (file structure) — truncated to key files
export async function GET(req: NextRequest) {
  const result = await getGithubToken(req);
  if (result instanceof NextResponse) return result;
  const { token, uid } = result;

  // Enforce GitHub integration plan limit
  const ghCheck = await checkPlanLimits(uid, "github");
  if (!ghCheck.allowed) {
    return NextResponse.json({ error: ghCheck.reason, plan: ghCheck.plan }, { status: 403 });
  }

  const repo = req.nextUrl.searchParams.get("repo");
  const branch = req.nextUrl.searchParams.get("branch") || "main";

  if (!repo) {
    return NextResponse.json({ error: "repo parameter required" }, { status: 400 });
  }

  try {
    // Fetch recursive tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!treeRes.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${treeRes.status}` },
        { status: treeRes.status }
      );
    }

    const treeData = await treeRes.json();

    // Filter to relevant files only (skip node_modules, dist, etc.)
    const IGNORE_PATTERNS = [
      /^node_modules\//,
      /^\.git\//,
      /^dist\//,
      /^build\//,
      /^\.next\//,
      /^coverage\//,
      /^__pycache__\//,
      /\.lock$/,
      /\.map$/,
      /\.min\.(js|css)$/,
    ];

    const tree = (treeData.tree || [])
      .filter((item: { path: string; type: string }) => {
        if (item.type !== "blob") return false;
        return !IGNORE_PATTERNS.some((p) => p.test(item.path));
      })
      .map((item: { path: string; size: number }) => ({
        path: item.path,
        size: item.size,
      }))
      .slice(0, 500); // Safety limit

    // Also fetch README if it exists
    let readme: string | null = null;
    const readmeEntry = (treeData.tree || []).find(
      (item: { path: string }) =>
        /^readme\.md$/i.test(item.path)
    );
    if (readmeEntry) {
      try {
        const readmeRes = await fetch(
          `https://api.github.com/repos/${repo}/contents/${encodeGitHubPath(readmeEntry.path)}?ref=${branch}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.raw+json",
            },
          }
        );
        if (readmeRes.ok) {
          readme = await readmeRes.text();
          // Truncate long READMEs
          if (readme.length > 3000) {
            readme = readme.slice(0, 3000) + "\n\n[... truncated]";
          }
        }
      } catch {
        // Ignore README fetch errors
      }
    }

    return NextResponse.json({ repo, branch, tree, readme, truncated: treeData.truncated || false });
  } catch {
    return NextResponse.json({ error: "Failed to fetch repo tree" }, { status: 500 });
  }
}

// POST /api/github/content — fetch file content
// Body: { repo: "owner/name", path: "src/index.ts", branch?: "main" }
export async function POST(req: NextRequest) {
  const result = await getGithubToken(req);
  if (result instanceof NextResponse) return result;
  const { token, uid } = result;

  const ghCheck = await checkPlanLimits(uid, "github");
  if (!ghCheck.allowed) {
    return NextResponse.json({ error: ghCheck.reason, plan: ghCheck.plan }, { status: 403 });
  }

  const { repo, path, branch = "main" } = await req.json();

  if (!repo || !path) {
    return NextResponse.json({ error: "repo and path required" }, { status: 400 });
  }

  try {
    const fileRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${encodeGitHubPath(path)}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.raw+json",
        },
      }
    );

    if (!fileRes.ok) {
      return NextResponse.json(
        { error: `File not found or inaccessible: ${fileRes.status}` },
        { status: fileRes.status }
      );
    }

    let content = await fileRes.text();

    // Truncate very large files
    if (content.length > 100000) {
      content = content.slice(0, 100000) + "\n\n[... truncated at 100KB]";
    }

    return NextResponse.json({ repo, path, branch, content });
  } catch {
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
