import { NextResponse } from "next/server";
import { getWidgetScript } from "@/lib/widget/widget-source";

export async function GET() {
  const script = getWidgetScript();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": [
        "default-src 'none'",
        "script-src 'self'",
        "style-src 'unsafe-inline'",
        "connect-src https://kopern.ai https://kopern.vercel.app https://*.kopern.ai",
        "img-src data:",
      ].join("; "),
    },
  });
}
