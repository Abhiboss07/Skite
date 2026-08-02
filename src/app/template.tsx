/**
 * Runs on every navigation (unlike layout.tsx, which persists), which makes it
 * the right place for the page-enter transition.
 *
 * Pure CSS, and a server component. This previously used Motion, which
 * serialised `opacity: 0` into the server HTML for the wrapper around *every
 * page* — nothing on any route could paint until the bundle had hydrated. A
 * CSS animation runs at first paint and ships zero JavaScript.
 *
 * Deliberately restrained: a short rise and defocus. Long page transitions feel
 * luxurious exactly once and then feel slow — the content is the reward.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
