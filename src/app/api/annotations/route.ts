import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

/**
 * Writes an annotation and its image into `test-dataset/real/`, and keeps
 * `index.json` in step so the benchmark harness picks it up with no further
 * work.
 *
 * This route writes to the repository, which is exactly the kind of thing that
 * should not exist in a deployed application. It is therefore refused outside
 * development, and the sample id is reduced to a safe slug before it touches a
 * path — an id of `../../etc/x` must not be able to write anywhere but here.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = join(process.cwd(), "test-dataset", "real");

const ROLES = new Set([
  "navbar", "hero", "heading", "paragraph", "button",
  "image", "card", "grid", "footer", "unknown",
]);

type IndexEntry = { id: string; style: string; image: string; truth: string };

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "The annotation tool writes to the repository and only runs in development." },
      { status: 403 },
    );
  }

  let payload: { truth?: Record<string, unknown>; image?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const truth = payload.truth as
    | { id?: string; style?: string; nodes?: { role?: string }[]; canvas?: { w: number; h: number } }
    | undefined;

  if (!truth?.id || !Array.isArray(truth.nodes) || truth.nodes.length === 0) {
    return NextResponse.json({ error: "Annotation is empty." }, { status: 400 });
  }

  // Path traversal is the only interesting attack on a route that writes files.
  // Reducing the id to a slug removes separators, dots and everything else that
  // could escape the directory, rather than trying to detect bad input.
  const slug = truth.id.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  if (!slug) {
    return NextResponse.json({ error: "Could not derive a filename from that image name." }, { status: 400 });
  }

  const unknownRole = truth.nodes.find((n) => !n.role || !ROLES.has(n.role));
  if (unknownRole) {
    return NextResponse.json({ error: `Unknown role: ${unknownRole.role}` }, { status: 400 });
  }

  const match = /^data:image\/(png|jpeg|webp);base64,([\s\S]+)$/.exec(payload.image ?? "");
  if (!match) {
    return NextResponse.json({ error: "Image must be a PNG, JPEG or WebP data URL." }, { status: 400 });
  }
  const [, format, base64] = match;
  const extension = format === "jpeg" ? "jpg" : format;

  await mkdir(ROOT, { recursive: true });

  const imageName = `${slug}.${extension}`;
  const truthName = `${slug}.truth.json`;

  await writeFile(join(ROOT, imageName), Buffer.from(base64, "base64"));
  await writeFile(join(ROOT, truthName), JSON.stringify(truth, null, 2) + "\n");

  // Re-saving the same sketch replaces its entry rather than duplicating it, so
  // fixing a mislabelled box is just annotating it again.
  const indexPath = join(ROOT, "index.json");
  let items: IndexEntry[] = [];
  try {
    const existing = JSON.parse(await readFile(indexPath, "utf8")) as { items?: IndexEntry[] };
    items = (existing.items ?? []).filter((item) => item.id !== slug);
  } catch {
    /* first sample — no index yet */
  }

  items.push({ id: slug, style: String(truth.style ?? "notebook"), image: imageName, truth: truthName });
  items.sort((a, b) => a.id.localeCompare(b.id));

  await writeFile(
    indexPath,
    JSON.stringify({ generated: new Date().toISOString(), count: items.length, items }, null, 2) + "\n",
  );

  return NextResponse.json({ savedAs: `test-dataset/real/${truthName}`, total: items.length });
}
