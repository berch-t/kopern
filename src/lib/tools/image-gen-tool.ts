/**
 * Built-in tool: image_generation
 * Generates images via Google Gemini (gemini-3.1-flash-image-preview).
 * Uses the user's Google AI Studio API key from Firestore.
 * Uploads to Firebase Storage, returns a public URL + base64 for frontend display.
 */

import { adminDb, adminStorage } from "@/lib/firebase/admin";

// ---------------------------------------------------------------------------
// Tool definitions (Anthropic format)
// ---------------------------------------------------------------------------

export const IMAGE_GEN_TOOLS = [
  {
    name: "generate_image",
    description:
      "Generate an image from a text prompt using Google Gemini. Returns a base64-encoded PNG image. Use descriptive prompts for best results. Supports various styles: photos, illustrations, diagrams, infographics, charts, logos, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description:
            "Detailed description of the image to generate. Be specific about style, colors, composition, and content.",
        },
        aspect_ratio: {
          type: "string",
          enum: ["1:1", "3:4", "4:3", "9:16", "16:9"],
          description:
            "Aspect ratio of the generated image (default: 1:1). Use 16:9 for LinkedIn/Twitter banners, 1:1 for Instagram/carousel, 9:16 for stories.",
        },
      },
      required: ["prompt"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool name check
// ---------------------------------------------------------------------------

const IMAGE_GEN_NAMES = new Set(IMAGE_GEN_TOOLS.map((t) => t.name));

export function isImageGenTool(name: string): boolean {
  return IMAGE_GEN_NAMES.has(name);
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const FETCH_TIMEOUT_MS = 60_000;

async function resolveGoogleKey(userId: string): Promise<string | null> {
  try {
    const userSnap = await adminDb.doc(`users/${userId}`).get();
    if (!userSnap.exists) return null;
    const apiKeys = userSnap.data()?.apiKeys || {};
    // Check google key variants (google, google_2, etc.)
    for (const suffix of ["", "_2", "_3", "_4", "_5"]) {
      const key = apiKeys[`google${suffix}`];
      if (key && typeof key === "string" && key.trim().length >= 8) {
        return key.trim();
      }
    }
  } catch {
    // Fall through
  }
  // Env fallback
  const envKey = process.env.GOOGLE_AI_API_KEY;
  if (envKey && envKey.trim().length >= 8) return envKey.trim();
  return null;
}

export async function executeImageGenTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<{ result: string; isError: boolean }> {
  if (name !== "generate_image") {
    return { result: `Unknown image gen tool: ${name}`, isError: true };
  }

  const prompt = String(args.prompt ?? "").trim();
  if (!prompt) {
    return { result: "A 'prompt' parameter is required.", isError: true };
  }

  const apiKey = await resolveGoogleKey(userId);
  if (!apiKey) {
    return {
      result:
        "No Google AI API key found. Please add your Google AI Studio key in Settings → API Keys → Google.",
      isError: true,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    const res = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return {
        result: `Google AI API error ${res.status}: ${errorText.slice(0, 500)}`,
        isError: true,
      };
    }

    const data = await res.json();

    // Extract image and text from response
    const candidates = data.candidates || [];
    if (candidates.length === 0) {
      return {
        result: "No image generated. The model may have refused the prompt due to safety filters.",
        isError: true,
      };
    }

    const parts = candidates[0]?.content?.parts || [];
    let imageData = "";
    let imageMimeType = "";
    let textResponse = "";

    for (const part of parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        imageMimeType = part.inlineData.mimeType || "image/png";
      }
      if (part.text) {
        textResponse += part.text;
      }
    }

    if (!imageData) {
      return {
        result: textResponse
          ? `Model returned text instead of image: ${textResponse.slice(0, 500)}`
          : "No image data in response. Try a more descriptive prompt.",
        isError: true,
      };
    }

    // Upload to Firebase Storage for persistence (team runs, social posting, frontend display)
    const ext = imageMimeType.split("/")[1] || "png";
    const fileName = `generated-images/${userId}/${Date.now()}.${ext}`;
    let publicUrl = "";

    try {
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) {
        throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET env var not set");
      }
      const bucket = adminStorage.bucket(bucketName);
      console.log("[IMAGE_GEN] Uploading to bucket:", bucket.name, "file:", fileName, "size:", imageData.length, "chars base64");
      const file = bucket.file(fileName);
      const buffer = Buffer.from(imageData, "base64");
      await file.save(buffer, {
        contentType: imageMimeType,
        public: true,
      });
      publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      console.log("[IMAGE_GEN] Upload success:", publicUrl);
    } catch (err) {
      const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
      console.error("[IMAGE_GEN] Storage upload failed:", errMsg);
    }

    if (!publicUrl) {
      return {
        result: `Image generated but upload to storage failed. The image could not be saved.`,
        isError: true,
      };
    }

    // Return URL only — no base64 in tool result (avoids 175k tokens to LLM + SSE overflow)
    const summary = [
      `Image generated successfully.`,
      `URL: ${publicUrl}`,
      `Use this URL to embed the image in social media posts, download it, or display it.`,
      textResponse ? `Model note: ${textResponse.slice(0, 200)}` : "",
      `\n[IMAGE_URL]${publicUrl}[/IMAGE_URL]`,
    ]
      .filter(Boolean)
      .join("\n");

    return { result: summary, isError: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      return { result: "Image generation timed out (60s). Try a simpler prompt.", isError: true };
    }
    return { result: `Image generation error: ${message}`, isError: true };
  }
}
