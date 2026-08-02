import { createHash } from "node:crypto";
import sharp from "sharp";

/**
 * Pass 1 — preprocessing.
 *
 * Turns an arbitrary photograph into a clean binary stroke mask. Everything
 * here is deterministic arithmetic: no model, no randomness, fully unit
 * testable against fixtures.
 *
 * The quality ceiling of the whole pipeline is set in this file. A demo that
 * only works on a flat, evenly-lit scan is not a product — real inputs are
 * photographed at an angle under ceiling lights.
 */

/** Working resolution. Large enough to keep thin marker strokes, small enough to stay fast. */
const MAX_EDGE = 1400;

export type Preprocessed = {
  /** Binary stroke mask, 1 = ink. Length = width * height. */
  mask: Uint8Array;
  /**
   * The resized greyscale, *before* illumination correction, and the brightness
   * of blank paper within it.
   *
   * Kept because the mask cannot answer one question that matters: whether a
   * region is filled. Adaptive thresholding is a local-contrast operator, so the
   * middle of a large uniform block produces no ink — correct for its purpose,
   * and exactly wrong for recognising the solid rectangle that vector tools
   * export in place of an image. Illumination correction removes the same signal
   * for the same reason: a large flat tone *is* low frequency.
   *
   * So the fill test reads the uncorrected greyscale against a global paper
   * level. That makes it sensitive to uneven lighting, and it is used only as a
   * secondary signal for exactly that reason — a photographed hand drawing marks
   * an image with crossed diagonals, which the ink measurement already catches,
   * while solid fills come from scans and vector exports, which are evenly lit.
   */
  grey: Uint8Array;
  /** Brightness of blank paper: the 95th percentile of the greyscale. */
  paperLevel: number;
  width: number;
  height: number;
  /** Normalised greyscale after illumination correction, for display. */
  cleanedPng: Buffer;
  /** The rectified/resized source, for the vision model and the debug UI. */
  workingPng: Buffer;
  sourcePixels: { w: number; h: number };
  sha256: string;
  /** Fraction of pixels that are ink. Sanity signal — see `quality`. */
  inkRatio: number;
  /** 0–1. Low means the input is probably not a usable wireframe. */
  quality: number;
  ms: number;
};

/**
 * Separable box blur, three passes — a close approximation to a Gaussian.
 *
 * This is hand-written rather than delegated to sharp, because sharp's `blur()`
 * does not do what this code needs on a raw single-channel buffer: measured on a
 * synthetic 400×200 field with a 30px bar through the middle, `blur(12)` returned
 * a flat field with the bar erased entirely, and `blur(35)` returned a monotonic
 * gradient rather than anything centred on the bar. Both the illumination
 * estimate and the local mean were therefore wrong, which is why solid light-grey
 * fills — the way vector wireframe exports draw text — thresholded to nothing.
 *
 * Three box passes converge on a Gaussian (central limit); the radius conversion
 * below is the standard one for matching a given sigma. Each pass is O(n) via a
 * running sum, so this is also faster than a true Gaussian convolution.
 */
function boxBlurPass(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
): void {
  const window = 2 * radius + 1;
  const outer = horizontal ? height : width;
  const inner = horizontal ? width : height;
  const step = horizontal ? 1 : width;

  for (let o = 0; o < outer; o++) {
    const base = horizontal ? o * width : o;
    const at = (i: number) => base + Math.min(inner - 1, Math.max(0, i)) * step;

    // Seed the window, clamping at the edges so borders are not darkened.
    let sum = 0;
    for (let i = -radius; i <= radius; i++) sum += src[at(i)];

    for (let i = 0; i < inner; i++) {
      dst[base + i * step] = sum / window;
      sum -= src[at(i - radius)];
      sum += src[at(i + radius + 1)];
    }
  }
}

function blurChannel(
  data: ArrayLike<number>,
  width: number,
  height: number,
  sigma: number,
): Float32Array {
  const n = width * height;
  let src = new Float32Array(n);
  for (let i = 0; i < n; i++) src[i] = data[i];

  // Radius whose three-pass box blur has the requested sigma.
  const radius = Math.max(1, Math.round(Math.sqrt((12 * sigma * sigma) / 3 + 1) / 2 - 0.5));
  let dst = new Float32Array(n);

  for (let pass = 0; pass < 3; pass++) {
    boxBlurPass(src, dst, width, height, radius, true);
    [src, dst] = [dst, src];
    boxBlurPass(src, dst, width, height, radius, false);
    [src, dst] = [dst, src];
  }

  return src;
}

export async function preprocess(input: Buffer): Promise<Preprocessed> {
  const started = Date.now();
  const sha256 = createHash("sha256").update(input).digest("hex");

  // `rotate()` with no argument applies the EXIF orientation. Phone photos are
  // routinely stored sideways with an orientation flag; skipping this silently
  // rotates every detected box by 90°.
  const base = sharp(input).rotate();
  const meta = await base.metadata();
  const sourcePixels = { w: meta.width ?? 0, h: meta.height ?? 0 };

  const resized = base
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .grayscale();

  const { data: grey, info } = await resized.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const n = width * height;

  // ── illumination normalisation ───────────────────────────────────
  // A heavy blur approximates the lighting field: shadows and glare are low
  // frequency, ink is high frequency. Subtracting that field flattens uneven
  // lighting while leaving stroke contrast intact.
  //
  // Subtraction rather than division, deliberately. Dividing by the field is the
  // textbook flat-field correction and it fails here: where the background is
  // dark, a one-count step in the source becomes a large step in the ratio, so
  // 8-bit banding in a gradient amplifies into visible stripes that threshold
  // as ink. Subtraction keeps the noise amplitude constant across the frame.
  const illumination = blurChannel(grey, width, height, Math.max(width, height) / 40);

  const PAPER = 200; // where flattened paper lands on the 0–255 scale
  const normalised = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    normalised[i] = Math.max(0, Math.min(255, grey[i] - illumination[i] + PAPER));
  }

  // ── adaptive threshold ───────────────────────────────────────────
  // A global threshold fails the moment one corner of the page is darker than
  // another. Comparing each pixel against its own neighbourhood mean does not.
  const localMean = blurChannel(normalised, width, height, 12);

  // ── noise floor ──────────────────────────────────────────────────
  // How far below its neighbourhood a pixel must sit to count as ink is not a
  // constant — it depends on how noisy this particular image is. A JPEG of a
  // gradient-lit whiteboard carries banding and sensor noise many counts deep,
  // and a fixed bias tuned for a clean scan turns every one of those steps into
  // ink (the symptom is a thresholded image full of stripes).
  //
  // So measure it. The deviation from the local mean is dominated by noise
  // almost everywhere, because ink is a small fraction of the pixels. A robust
  // spread of that deviation — median absolute deviation, which ink outliers
  // cannot drag upward the way a standard deviation would — gives the noise
  // level directly, and the threshold is set a few multiples above it.
  const sampleStride = Math.max(1, Math.floor(n / 200_000));
  const deviations: number[] = [];
  for (let i = 0; i < n; i += sampleStride) {
    deviations.push(Math.abs(normalised[i] - localMean[i]));
  }
  deviations.sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length * 0.5)] || 1;
  // 1.4826 converts MAD to a standard-deviation equivalent for normal noise.
  const sigma = mad * 1.4826;
  const bias = Math.max(14, Math.min(70, sigma * 4));

  const mask = new Uint8Array(n);
  let ink = 0;
  for (let i = 0; i < n; i++) {
    if (normalised[i] < localMean[i] - bias) {
      mask[i] = 1;
      ink++;
    }
  }

  const inkRatio = ink / n;

  // Paper level: a high percentile of the raw greyscale. The mean would be
  // dragged down by ink, and the maximum would latch onto a single blown-out
  // highlight; the 95th percentile is neither.
  const brightness: number[] = [];
  for (let i = 0; i < n; i += sampleStride) brightness.push(grey[i]);
  brightness.sort((a, b) => a - b);
  const paperLevel = brightness[Math.floor(brightness.length * 0.95)] ?? 255;

  // ── quality signal ───────────────────────────────────────────────
  // A usable wireframe is mostly paper with a little ink. Far outside that band
  // means a photo of something else, a blank page, or a failed threshold — and
  // downstream confidence should reflect that rather than reporting certainty
  // about noise.
  const quality =
    inkRatio < 0.002 || inkRatio > 0.35
      ? 0.15
      : inkRatio < 0.006 || inkRatio > 0.22
        ? 0.55
        : 1;

  // Renderings for the debug UI.
  const cleanedPng = await sharp(
    Buffer.from(mask.map((v) => (v ? 0 : 255))),
    { raw: { width, height, channels: 1 } },
  )
    .png()
    .toBuffer();

  const workingPng = await sharp(grey, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();

  return {
    mask,
    grey: new Uint8Array(grey.buffer, grey.byteOffset, n),
    paperLevel,
    width,
    height,
    cleanedPng,
    workingPng,
    sourcePixels,
    sha256,
    inkRatio,
    quality,
    ms: Date.now() - started,
  };
}
