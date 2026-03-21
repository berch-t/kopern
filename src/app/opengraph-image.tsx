import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kopern — AI Agent Builder, Orchestrator & Grader";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1625 0%, #2d1b4e 40%, #1a1625 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative rings */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            border: "2px solid rgba(124, 58, 237, 0.2)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-150px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            border: "2px solid rgba(124, 58, 237, 0.15)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "800px",
            height: "800px",
            borderRadius: "50%",
            border: "1px solid rgba(124, 58, 237, 0.1)",
            display: "flex",
          }}
        />

        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 800,
              color: "white",
            }}
          >
            K
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-1px",
            }}
          >
            Kopern
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 600,
            color: "#e2e8f0",
            marginBottom: "16px",
            display: "flex",
          }}
        >
          AI Agent Builder, Orchestrator & Grader
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "18px",
            color: "#94a3b8",
            maxWidth: "700px",
            textAlign: "center",
            lineHeight: 1.5,
            display: "flex",
          }}
        >
          Build, test, and deploy production-grade AI agents with tool calling, grading, multi-agent teams, and external connectors.
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "32px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["Claude", "GPT", "Gemini", "MCP", "Grading", "Teams", "Webhooks", "Widget"].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: "8px 20px",
                  borderRadius: "100px",
                  border: "1px solid rgba(124, 58, 237, 0.4)",
                  background: "rgba(124, 58, 237, 0.1)",
                  color: "#c4b5fd",
                  fontSize: "14px",
                  fontWeight: 500,
                  display: "flex",
                }}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "14px",
            color: "#64748b",
            display: "flex",
          }}
        >
          kopern.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
