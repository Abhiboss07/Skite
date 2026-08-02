import type { SVGProps } from "react";

/**
 * Brand glyphs.
 *
 * lucide-react v1 removed third-party brand icons (and its `X` export is the
 * close icon, not the X logo), so these are hand-authored. Each is a single
 * filled path on a 24×24 grid using `currentColor`, so they inherit text colour
 * and hover states exactly like a lucide icon would.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
} as const;

export function GithubIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2.2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M17.53 3h3.2l-6.99 7.99L22 21h-6.44l-5.04-6.6L4.75 21h-3.2l7.48-8.55L2 3h6.6l4.56 6.03L17.53 3Zm-1.12 16.06h1.77L7.67 4.84H5.77l10.64 14.22Z" />
    </svg>
  );
}

export function LinkedinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.83v1.64h.05a4.2 4.2 0 0 1 3.78-2.08C21.4 8.56 22 11.2 22 14.4V21h-4v-5.86c0-1.4-.03-3.2-1.95-3.2-1.96 0-2.26 1.53-2.26 3.1V21h-4V9Z" />
    </svg>
  );
}

export function DiscordIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19.3 5.34A16.7 16.7 0 0 0 15.15 4c-.2.36-.42.84-.58 1.22a15.5 15.5 0 0 0-4.6 0A11 11 0 0 0 9.38 4a16.6 16.6 0 0 0-4.15 1.34C2.6 9.26 1.89 13.08 2.25 16.84A16.8 16.8 0 0 0 7.35 19.4c.41-.56.78-1.16 1.09-1.79a10.9 10.9 0 0 1-1.72-.82c.14-.11.29-.22.42-.34a12 12 0 0 0 10.24 0l.42.34c-.55.32-1.13.6-1.73.83.32.63.68 1.23 1.1 1.79a16.7 16.7 0 0 0 5.09-2.57c.42-4.36-.71-8.14-2.96-11.5ZM8.68 14.55c-1 0-1.81-.91-1.81-2.03 0-1.12.8-2.03 1.8-2.03 1.02 0 1.83.92 1.82 2.03 0 1.12-.8 2.03-1.81 2.03Zm6.68 0c-1 0-1.81-.91-1.81-2.03 0-1.12.8-2.03 1.81-2.03 1.01 0 1.82.92 1.8 2.03 0 1.12-.79 2.03-1.8 2.03Z" />
    </svg>
  );
}
