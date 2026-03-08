import { adminDb } from "@/lib/firebase/admin";

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

export default async function fetchRepoContextForGrading(
  userId: string,
  repos: string[]
): Promise<string | null> {
  try {
    const userSnap = await adminDb.doc(`users/${userId}`).get();
    const githubToken = userSnap.data()?.githubAccessToken;
    if (!githubToken) return null;

    const sections: string[] = [];

    for (const repo of repos.slice(0, 3)) {
      const treeRes = await fetch(
        `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      if (!treeRes.ok) continue;

      const treeData = await treeRes.json();
      const files = (treeData.tree || [])
        .filter((item: { path: string; type: string }) =>
          item.type === "blob" && !IGNORE_PATTERNS.some((p) => p.test(item.path))
        )
        .map((item: { path: string }) => item.path)
        .slice(0, 300);

      let repoSection = `<connected-repo name="${repo}">\n`;
      repoSection += `<file-tree>\n${files.join("\n")}\n</file-tree>\n`;
      repoSection += `</connected-repo>`;
      sections.push(repoSection);
    }

    if (sections.length === 0) return null;

    return `<github-context>\n${sections.join("\n\n")}\n</github-context>`;
  } catch {
    return null;
  }
}
