import { NextResponse } from "next/server";
import { apiHealth } from "@/lib/api";

/** This site's view of its configuration. Reveals no secrets. */
export async function GET() {
  const api = await apiHealth();
  return NextResponse.json(
    {
      ok: api.reachable,
      api,
      apiConfigured: !!(process.env.MICROSITES_API_URL && process.env.MICROSITES_API_KEY),
      sessionSecret: (process.env.SESSION_SECRET?.length ?? 0) >= 32,
    },
    { status: api.reachable ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
