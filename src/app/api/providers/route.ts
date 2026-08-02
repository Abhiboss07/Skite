import { NextResponse } from "next/server";

import { probeAll } from "@/ai/registry";

/**
 * Provider health.
 *
 * The Studio's picker reads this to show which backends are usable right now,
 * so the response is deliberately shaped for a person rather than a program:
 * every unhappy state carries a sentence saying what to do about it.
 *
 * No secrets are returned — only whether a key is present, never its value.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await probeAll();

  return NextResponse.json({
    providers,
    // The one the pipeline would use if the caller expressed no preference.
    active: process.env.SKITE_AI_PROVIDER ?? "ollama",
    anyReady: providers.some((p) => p.ok),
    visionReady: providers.some((p) => p.ok && p.capabilities.vision),
  });
}
