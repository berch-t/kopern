import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, graderRateLimit } from "@/lib/security/rate-limit";
import { graderProbeSchema, validateBody } from "@/lib/security/validation";
import { probeEndpoint } from "@/lib/grading/external-executor";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const rl = await checkRateLimit(graderRateLimit, ip);
  if (rl) return rl;

  const raw = await request.json();
  const parsed = validateBody(graderProbeSchema, raw);
  if ("error" in parsed) return parsed.error;

  const result = await probeEndpoint({
    url: parsed.data.url,
    method: parsed.data.method,
    authType: parsed.data.authType,
    authValue: parsed.data.authValue,
    authHeaderName: parsed.data.authHeaderName,
    bodyTemplate: parsed.data.bodyTemplate,
    timeout: 15_000,
  });

  return NextResponse.json(result);
}
