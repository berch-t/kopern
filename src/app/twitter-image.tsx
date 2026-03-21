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
        {/* Decorative ring */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "900px",
            height: "900px",
            borderRadius: "50%",
            border: "1px solid rgba(124, 58, 237, 0.15)",
            display: "flex",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 800,
              color: "white",
            }}
          >
            K
          </div>
          <span
            style={{
              fontSize: "44px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-1px",
            }}
          >
            Kopern
          </span>
        </div>

        <div
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#e2e8f0",
            marginBottom: "12px",
            display: "flex",
          }}
        >
          AI Agent Builder, Orchestrator & Grader
        </div>

        <div
          style={{
            fontSize: "16px",
            color: "#94a3b8",
            maxWidth: "600px",
            textAlign: "center",
            lineHeight: 1.5,
            display: "flex",
          }}
        >
          Tool calling, grading pipelines, multi-agent teams, MCP, webhooks, Slack, embeddable widget.
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "28px",
          }}
        >
          {["Claude", "GPT", "Gemini", "MCP", "Grading"].map((label) => (
            <div
              key={label}
              style={{
                padding: "6px 16px",
                borderRadius: "100px",
                border: "1px solid rgba(124, 58, 237, 0.4)",
                background: "rgba(124, 58, 237, 0.1)",
                color: "#c4b5fd",
                fontSize: "13px",
                fontWeight: 500,
                display: "flex",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
