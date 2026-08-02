/**
 * Full-viewport film grain.
 *
 * Large flat gradients band badly on 8-bit displays; a few percent of noise
 * dithers those transitions away and gives the dark surfaces a physical,
 * photographic quality instead of a plasticky digital one.
 *
 * Server component — it has no interactivity and no state.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="noise-overlay pointer-events-none fixed inset-0 z-[70] mix-blend-soft-light"
    />
  );
}
