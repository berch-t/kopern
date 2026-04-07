import { ImageResponse } from "next/og";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  let score = 0;
  let model = "Unknown";
  let provider = "";
  let testCount = 0;
  let avgLatencyMs = 0;
  let criteriaBreakdown: { criterion: string; label: string; score: number }[] = [];

  try {
    const doc = await adminDb.collection("monitorRuns").doc(runId).get();
    if (doc.exists) {
      const data = doc.data()!;
      score = data.score || 0;
      model = data.model || "Unknown";
      provider = data.provider || "";
      testCount = data.testCount || 0;
      avgLatencyMs = data.avgLatencyMs || 0;
      criteriaBreakdown = data.criteriaBreakdown || [];
    }
  } catch {
    // Fallback to defaults
  }

  const scorePercent = Math.round(score * 100);
  const scoreColor = scorePercent >= 80 ? "#34d399" : scorePercent >= 50 ? "#fbbf24" : "#f87171";

  // Build SVG radar (6 axes for monitor)
  const cx = 150, cy = 150, r = 100;
  const count = Math.max(criteriaBreakdown.length, 1);
  const angles = Array.from({ length: count }, (_, i) => (Math.PI * 2 * i) / count - Math.PI / 2);
  const points = criteriaBreakdown.map((c, i) => {
    const radius = r * c.score;
    return `${cx + radius * Math.cos(angles[i])},${cy + radius * Math.sin(angles[i])}`;
  }).join(" ");

  const gridSvg = [0.25, 0.5, 0.75, 1].map((pct) => {
    const gr = Math.round(r * pct);
    return `<circle cx="${cx}" cy="${cy}" r="${gr}" fill="none" stroke="rgba(168,85,247,0.15)" stroke-width="1"/>`;
  }).join("");

  const axesSvg = angles.map((a) =>
    `<line x1="${cx}" y1="${cy}" x2="${Math.round(cx + r * Math.cos(a))}" y2="${Math.round(cy + r * Math.sin(a))}" stroke="rgba(168,85,247,0.15)" stroke-width="1"/>`
  ).join("");

  const labelsSvg = criteriaBreakdown.map((c, i) => {
    const labelR = r + 25;
    const x = Math.round(cx + labelR * Math.cos(angles[i]));
    const y = Math.round(cy + labelR * Math.sin(angles[i]));
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-size="10" font-family="sans-serif">${c.label}</text>`;
  }).join("");

  const polygonSvg = points
    ? `<polygon points="${points}" fill="rgba(168,85,247,0.25)" stroke="#a855f7" stroke-width="2"/>`
    : "";

  const radarSvgDataUri = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">${gridSvg}${axesSvg}${polygonSvg}${labelsSvg}</svg>`
  )}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #2e1065 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          padding: "48px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <div style={{ fontSize: 24, color: "#94a3b8", marginBottom: 8 }}>LLM Health Score</div>
          <div style={{ fontSize: 96, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {scorePercent}
          </div>
          <div style={{ fontSize: 22, color: "#c084fc", marginTop: 12, fontWeight: 600 }}>
            {model}
          </div>
          <div style={{ fontSize: 16, color: "#64748b", marginTop: 4 }}>
            {provider} — {testCount} tests — {avgLatencyMs}ms avg
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 32, gap: 8 }}>
            <div style={{ fontSize: 14, color: "#a855f7", fontWeight: 600 }}>
              Diagnosed by Kopern
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              kopern.ai/monitor
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
