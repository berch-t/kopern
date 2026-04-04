import { ImageResponse } from "next/og";
import { adminDb } from "@/lib/firebase/admin";

// Cannot use edge runtime with Firebase Admin SDK — use Node.js runtime
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  let score = 0;
  let totalCases = 0;
  let passedCases = 0;
  let criteriaBreakdown: { criterion: string; label: string; score: number }[] = [];
  let prompt = "";

  try {
    const doc = await adminDb.collection("graderRuns").doc(runId).get();
    if (doc.exists) {
      const data = doc.data()!;
      score = data.score || 0;
      totalCases = data.totalCases || 0;
      passedCases = data.passedCases || 0;
      criteriaBreakdown = data.criteriaBreakdown || [];
      prompt = data.systemPromptPreview || "";
    }
  } catch {
    // Fallback to defaults
  }

  const scorePercent = Math.round(score * 100);
  const scoreColor = scorePercent >= 80 ? "#34d399" : scorePercent >= 50 ? "#fbbf24" : "#f87171";

  // Build SVG radar as a data URI for Satori img embedding
  const cx = 150, cy = 150, r = 100;
  const count = Math.max(criteriaBreakdown.length, 1);
  const angles = Array.from({ length: count }, (_, i) => (Math.PI * 2 * i) / count - Math.PI / 2);
  const points = criteriaBreakdown.map((c, i) => {
    const radius = r * c.score;
    return `${cx + radius * Math.cos(angles[i])},${cy + radius * Math.sin(angles[i])}`;
  }).join(" ");

  const gridSvg = [0.25, 0.5, 0.75, 1].map((pct) => {
    const gr = Math.round(r * pct);
    return `<circle cx="${cx}" cy="${cy}" r="${gr}" fill="none" stroke="rgba(99,102,241,0.15)" stroke-width="1"/>`;
  }).join("");

  const axesSvg = angles.map((a) =>
    `<line x1="${cx}" y1="${cy}" x2="${Math.round(cx + r * Math.cos(a))}" y2="${Math.round(cy + r * Math.sin(a))}" stroke="rgba(99,102,241,0.15)" stroke-width="1"/>`
  ).join("");

  const labelsSvg = criteriaBreakdown.map((c, i) => {
    const labelR = r + 25;
    const x = Math.round(cx + labelR * Math.cos(angles[i]));
    const y = Math.round(cy + labelR * Math.sin(angles[i]));
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-size="10" font-family="sans-serif">${c.label}</text>`;
  }).join("");

  const polygonSvg = points
    ? `<polygon points="${points}" fill="rgba(99,102,241,0.25)" stroke="#6366f1" stroke-width="2"/>`
    : "";

  const radarSvgDataUri = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">${gridSvg}${axesSvg}${polygonSvg}${labelsSvg}</svg>`
  )}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          padding: "48px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <div style={{ fontSize: 24, color: "#94a3b8", marginBottom: 8 }}>Agent Grading Score</div>
          <div style={{ fontSize: 96, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {scorePercent}
          </div>
          <div style={{ fontSize: 20, color: "#64748b", marginTop: 8 }}>
            {passedCases}/{totalCases} tests passed
          </div>
          {prompt && (
            <div style={{ fontSize: 14, color: "#475569", marginTop: 24, maxWidth: 400 }}>
              {prompt.length > 120 ? prompt.slice(0, 120) + "..." : prompt}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", marginTop: 32, gap: 8 }}>
            <div style={{ fontSize: 14, color: "#6366f1", fontWeight: 600 }}>
              Graded by Kopern
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              kopern.ai/grader
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 300 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={radarSvgDataUri} width={300} height={300} alt="" />
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
