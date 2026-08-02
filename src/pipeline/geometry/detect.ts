/**
 * Pass 2 — primitive detection.
 *
 * Finds the drawn regions in a binary stroke mask. Deterministic: connected
 * components plus shape statistics. No model.
 *
 * The key observation that makes this tractable: a hand-drawn rectangle is a
 * closed loop of ink, so it forms a single connected component whose bounding
 * box *is* the rectangle. We do not need to fit lines or find corners — the
 * component's extent already carries the geometry.
 */

import type { Primitive } from "../ir/schema.ts";

export type DetectedRegion = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Ink pixels inside the bounding box, from the undilated mask. */
  strokePixels: number;
  /** strokePixels / area. Hollow outlines are low; filled scribbles are high. */
  fillRatio: number;
  /**
   * Ink density in the box's interior, ignoring a border band.
   *
   * This is what separates an empty container from an image placeholder: a
   * hand-drawn rectangle has essentially nothing inside its own outline, while
   * the conventional "image" symbol has two diagonals crossing the middle.
   * Overall fill ratio cannot distinguish them because the outline dominates it.
   */
  interiorInk: number;
  /**
   * Fraction of the interior that is *toned* — darker than paper, whether or not
   * it thresholded as ink.
   *
   * `interiorInk` catches the hand-drawn image symbol (crossed diagonals);
   * this catches the vector one (a solid grey rectangle). Both are the same
   * component to a person reading the wireframe, so both must be detectable.
   */
  interiorFill: number;
  /** Merged text lines. 1 suggests a heading, several a paragraph. */
  lines: number;
  primitive: Primitive;
};

export type Detection = {
  regions: DetectedRegion[];
  ms: number;
  /** 0–1 — how confident detection is that it found real structure. */
  confidence: number;
};

/**
 * Morphological dilation, 4-connected, in place on a copy.
 *
 * Hand-drawn box outlines routinely have small gaps where the pen lifted. Without
 * closing them the outline fragments into several components and one rectangle
 * becomes four unrelated strokes. Dilating before labelling closes those gaps;
 * statistics are still computed against the original mask so the fill ratio is
 * not inflated.
 */
function dilate(mask: Uint8Array, width: number, height: number, iterations: number): Uint8Array {
  let src = mask;
  for (let it = 0; it < iterations; it++) {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const i = row + x;
        if (
          src[i] ||
          (x > 0 && src[i - 1]) ||
          (x < width - 1 && src[i + 1]) ||
          (y > 0 && src[i - width]) ||
          (y < height - 1 && src[i + width])
        ) {
          out[i] = 1;
        }
      }
    }
    src = out;
  }
  return src;
}

type RawComponent = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixels: number;
};

/** 8-connected labelling with an explicit stack — recursion overflows at this scale. */
function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
): RawComponent[] {
  const seen = new Uint8Array(mask.length);
  const components: RawComponent[] = [];
  const stack = new Int32Array(mask.length);

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;

    let top = 0;
    stack[top++] = start;
    seen[start] = 1;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let pixels = 0;

    while (top > 0) {
      const i = stack[--top];
      const x = i % width;
      const y = (i - x) / width;

      pixels++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const j = ny * width + nx;
          if (mask[j] && !seen[j]) {
            seen[j] = 1;
            stack[top++] = j;
          }
        }
      }
    }

    components.push({ minX, minY, maxX, maxY, pixels });
  }

  return components;
}

/** Count ink in the original (undilated) mask inside a box. */
function inkInBox(
  mask: Uint8Array,
  width: number,
  x: number,
  y: number,
  w: number,
  h: number,
): number {
  let count = 0;
  for (let yy = y; yy < y + h; yy++) {
    const row = yy * width;
    for (let xx = x; xx < x + w; xx++) {
      if (mask[row + xx]) count++;
    }
  }
  return count;
}

/**
 * Group text-like fragments into blocks.
 *
 * Handwriting fragments into one component per stroke cluster — a written word
 * can be several. Fragments that share a horizontal band and sit close together
 * are one line of text, and a heading drawn as two squiggles should become one
 * text node rather than two.
 */
function mergeTextRuns(regions: DetectedRegion[], baseGap: number): DetectedRegion[] {
  const text = regions.filter((r) => r.primitive === "text");
  const rest = regions.filter((r) => r.primitive !== "text");
  const used = new Set<string>();
  const merged: DetectedRegion[] = [];

  const sorted = [...text].sort((a, b) => a.y - b.y || a.x - b.x);

  for (const seed of sorted) {
    if (used.has(seed.id)) continue;
    used.add(seed.id);

    let { x, y, w, h, strokePixels } = seed;

    let grew = true;
    while (grew) {
      grew = false;
      for (const cand of sorted) {
        if (used.has(cand.id)) continue;

        // Same horizontal band? Compare vertical centres against the taller height.
        const cy1 = y + h / 2;
        const cy2 = cand.y + cand.h / 2;
        const sameBand = Math.abs(cy1 - cy2) < Math.max(h, cand.h) * 0.6;

        // Close horizontally? Allow a gap proportional to text height.
        const gap = Math.max(x, cand.x) - Math.min(x + w, cand.x + cand.w);
        const closeEnough = gap < Math.max(baseGap, Math.max(h, cand.h) * 1.2);

        if (sameBand && closeEnough) {
          const nx = Math.min(x, cand.x);
          const ny = Math.min(y, cand.y);
          const nx2 = Math.max(x + w, cand.x + cand.w);
          const ny2 = Math.max(y + h, cand.y + cand.h);
          x = nx;
          y = ny;
          w = nx2 - nx;
          h = ny2 - ny;
          strokePixels += cand.strokePixels;
          used.add(cand.id);
          grew = true;
        }
      }
    }

    merged.push({
      id: seed.id,
      x,
      y,
      w,
      h,
      strokePixels,
      fillRatio: strokePixels / Math.max(1, w * h),
      interiorInk: 0,
      interiorFill: 0,
      lines: 1,
      primitive: "text",
    });
  }

  return [...rest, ...merged];
}

/**
 * Second text merge: stack lines into blocks.
 *
 * `mergeTextRuns` joins fragments across a line. This joins lines into a
 * paragraph — left-aligned, vertically adjacent, similar height. Without it a
 * three-line paragraph stays three separate nodes and the classifier sees three
 * headings instead of one body block.
 */
function mergeTextBlocks(regions: DetectedRegion[]): DetectedRegion[] {
  const text = regions.filter((r) => r.primitive === "text").sort((a, b) => a.y - b.y || a.x - b.x);
  const rest = regions.filter((r) => r.primitive !== "text");
  const used = new Set<string>();
  const out: DetectedRegion[] = [];

  for (const seed of text) {
    if (used.has(seed.id)) continue;
    used.add(seed.id);

    let { x, y, w, h, strokePixels } = seed;
    let lines = 1;

    let grew = true;
    while (grew) {
      grew = false;
      for (const cand of text) {
        if (used.has(cand.id)) continue;

        const leftAligned = Math.abs(cand.x - x) < Math.max(14, seed.w * 0.12);
        const verticalGap = cand.y - (y + h);
        // Compare against the SEED line's height, never the accumulated block
        // height. Using the growing height widens the acceptance window with
        // every merge, so one paragraph swallows the next section.
        const lineH = seed.h;
        // Line spacing is several times the stroke height, not equal to it.
        const adjacent = verticalGap > -lineH * 0.5 && verticalGap < Math.max(30, lineH * 4);
        const similarHeight = Math.abs(cand.h - lineH) < Math.max(12, lineH * 0.9);

        if (leftAligned && adjacent && similarHeight) {
          const nx = Math.min(x, cand.x);
          const ny = Math.min(y, cand.y);
          const nx2 = Math.max(x + w, cand.x + cand.w);
          const ny2 = Math.max(y + h, cand.y + cand.h);
          x = nx;
          y = ny;
          w = nx2 - nx;
          h = ny2 - ny;
          strokePixels += cand.strokePixels;
          lines++;
          used.add(cand.id);
          grew = true;
        }
      }
    }

    out.push({
      id: seed.id,
      x,
      y,
      w,
      h,
      strokePixels,
      fillRatio: strokePixels / Math.max(1, w * h),
      interiorInk: 0,
      interiorFill: 0,
      lines,
      primitive: "text",
    });
  }

  return [...rest, ...out];
}

export function detect(
  mask: Uint8Array,
  width: number,
  height: number,
  /** The uncorrected greyscale and its paper level, for fill measurement. */
  tone?: { grey: ArrayLike<number>; paperLevel: number },
): Detection {
  const started = Date.now();

  // One pass closes pen-lift gaps; two bridged the gutter between adjacent
  // cards and merged a whole row into a single component.
  const closed = dilate(mask, width, height, 1);
  const raw = connectedComponents(closed, width, height);

  const canvasArea = width * height;
  const regions: DetectedRegion[] = [];

  raw.forEach((c, index) => {
    const x = c.minX;
    const y = c.minY;
    const w = c.maxX - c.minX + 1;
    const h = c.maxY - c.minY + 1;
    const area = w * h;

    // Noise floor — dust, JPEG artefacts, pen dots.
    if (area < 120 || (w < 8 && h < 8)) return;
    // A component spanning nearly the whole canvas is usually the page border
    // or a failed threshold, not a drawn region.
    if (area > canvasArea * 0.92) return;

    const strokePixels = inkInBox(mask, width, x, y, w, h);
    const fillRatio = strokePixels / area;

    // Sample the central 50% of the box, not merely inside its outline.
    // A 12% inset still catches stroke wobble bleeding inward, which made every
    // empty container look like it had content. The centre is where an image
    // placeholder's diagonals cross and where a hollow rectangle has nothing.
    const insetX = Math.round(w * 0.25);
    const insetY = Math.round(h * 0.25);
    const iw = w - insetX * 2;
    const ih = h - insetY * 2;
    const interiorInk =
      iw > 4 && ih > 4 ? inkInBox(mask, width, x + insetX, y + insetY, iw, ih) / (iw * ih) : 0;

    // Toned fraction of the same interior, measured against the paper just
    // outside this box rather than against a page-wide paper level.
    //
    // A global reference fails on photographs: the shading across a sheet of
    // paper is often deeper than the tone of a filled rectangle, so every
    // region in the dim half of the page reads as filled. Comparing against the
    // immediate surroundings cancels the shading, because a gradient is
    // essentially constant across the few dozen pixels that separate the two
    // samples. What survives is what we actually want to know: is the inside of
    // this box darker than the paper *around* it?
    let interiorFill = 0;
    if (tone && iw > 4 && ih > 4) {
      const band = 24;
      const ringStride = Math.max(1, Math.floor(Math.max(w, h) / 60));
      const ring: number[] = [];
      const x0 = Math.max(0, x - band);
      const x1 = Math.min(width - 1, x + w + band);
      const y0 = Math.max(0, y - band);
      const y1 = Math.min(height - 1, y + h + band);

      for (let yy = y0; yy <= y1; yy += ringStride) {
        const inRows = yy > y && yy < y + h;
        for (let xx = x0; xx <= x1; xx += ringStride) {
          // Skip the box itself; sample only the band around it.
          if (inRows && xx > x && xx < x + w) continue;
          ring.push(tone.grey[yy * width + xx]);
        }
      }

      if (ring.length > 16) {
        ring.sort((a, b) => a - b);
        // Median, not mean: a neighbouring stroke clipped by the band should not
        // drag the paper estimate down.
        const localPaper = ring[Math.floor(ring.length / 2)];
        const threshold = localPaper - 18;
        const stride = Math.max(1, Math.floor(Math.min(iw, ih) / 40));
        let toned = 0;
        let sampled = 0;
        for (let yy = y + insetY; yy < y + insetY + ih; yy += stride) {
          const row = yy * width;
          for (let xx = x + insetX; xx < x + insetX + iw; xx += stride) {
            if (tone.grey[row + xx] < threshold) toned++;
            sampled++;
          }
        }
        interiorFill = sampled ? toned / sampled : 0;
      }
    }

    let primitive: Primitive;
    // Note: a thin horizontal line is NOT treated as a rule. In wireframes a
    // drawn line *is* the convention for a line of text, and digital wireframes
    // draw it 1-2px thick. Classifying those as dividers loses every text block
    // on clean inputs, so they fall through to the text branch below.
    if (fillRatio < 0.34 && w > 42 && h > 26) {
      // Mostly empty inside its own bounds: a hollow shape, i.e. a container.
      primitive = "container";
    } else if (h < 46) {
      // Small and comparatively dense: writing.
      primitive = "text";
    } else {
      primitive = "container";
    }

    regions.push({
      id: `r${index}`,
      x,
      y,
      w,
      h,
      strokePixels,
      fillRatio,
      interiorInk,
      interiorFill,
      lines: 1,
      primitive,
    });
  });

  const grouped = mergeTextBlocks(mergeTextRuns(regions, Math.max(6, width * 0.01)));

  // Detection confidence: did we find a plausible number of regions, and do they
  // look like structure rather than speckle? Reported rather than assumed.
  const containers = grouped.filter((r) => r.primitive === "container").length;
  const confidence =
    grouped.length === 0
      ? 0
      : grouped.length > 220
        ? 0.25 // almost certainly noise fragments
        : containers === 0
          ? 0.4 // text but no boxes: probably not a wireframe
          : Math.min(1, 0.55 + Math.min(containers, 12) * 0.0375);

  return {
    regions: grouped.sort((a, b) => a.y - b.y || a.x - b.x),
    ms: Date.now() - started,
    confidence,
  };
}
