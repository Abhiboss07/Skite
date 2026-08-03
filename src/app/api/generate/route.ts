import { NextResponse } from "next/server";

import { runPipeline } from "@/pipeline/run";

/**
 * The generation endpoint.
 *
 * One request, one full pipeline run, every intermediate returned. The debug UI
 * needs all of them at once, and the run takes a few hundred milliseconds, so
 * streaming the stages separately would add real complexity to save latency
 * nobody can perceive. If a model pass lands in the hot path and pushes this
 * into seconds, this is the place that becomes a stream.
 *
 * Node runtime, not edge: preprocessing uses `sharp`, which is native.
 */
export const runtime = "nodejs";
/** Generation is inherently dynamic; nothing here is cacheable. */
export const dynamic = "force-dynamic";

/** Beyond this an upload is not a wireframe photo, whatever it is. */
const MAX_BYTES = 12 * 1024 * 1024;

const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Send the image as multipart/form-data with a `file` field." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No `file` field in the request." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1e6).toFixed(1)} MB; the limit is ${MAX_BYTES / 1e6} MB.` },
      { status: 413 },
    );
  }

  // The declared type is a hint from the client and not evidence of anything;
  // `sharp` re-derives the real format from the bytes and rejects what it
  // cannot decode. Checking it here only produces a better error message.
  if (file.type && !ACCEPTED.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type ${file.type}. Upload a PNG, JPEG, WebP or AVIF.` },
      { status: 415 },
    );
  }

  const classifierParam = form.get("classifier");
  const classifier =
    classifierParam === "heuristic" || classifierParam === "vision" ? classifierParam : "auto";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await runPipeline(buffer, { classifier, sourceKind: "photo" });

    return NextResponse.json({
      ok: result.ok,
      ir: result.ir,
      tree: result.tree,
      semantic: result.semantic,
      code: result.code,
      prompt: result.prompt,
      images: result.images,
      regions: result.detection.regions,
      report: result.report,
      warnings: result.warnings,
      filename: file.name,
    });
  } catch (error) {
    // The message is surfaced to the UI on purpose: during a demo, "sharp could
    // not decode this file" is the answer, and a generic 500 is a dead end.
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[generate] pipeline failed:", error);
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 });
  }
}
