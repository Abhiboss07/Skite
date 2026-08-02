import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rewrites barrel imports (`import { X } from "lucide-react"`) into deep
  // per-module imports so unused icons and helpers never reach the bundle.
  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "@react-three/drei"],
  },

  // Nothing on this site uses any of these capabilities, and the headers cost
  // nothing to send.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
