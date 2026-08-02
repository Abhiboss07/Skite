import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social card, generated at build time.
 *
 * Composed from geometry and colour rather than type effects: Satori (which
 * renders this) supports only a subset of CSS, and no webfont is loaded here,
 * so the design leans on the brand's shapes — the half-wireframe, half-rendered
 * frame — to carry the identity.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#050816",
          fontFamily: "sans-serif",
        }}
      >
        {/* Aurora fields */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: 120,
            width: 900,
            height: 900,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(46,107,255,0.42) 0%, rgba(46,107,255,0) 62%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -340,
            right: -120,
            width: 820,
            height: 820,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0) 62%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 180,
            right: 260,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(34,211,238,0.3) 0%, rgba(34,211,238,0) 62%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 72,
            width: "100%",
          }}
        >
          {/* Mark + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", width: 64, height: 64, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 32,
                  height: 64,
                  border: "3px dashed rgba(238,241,248,0.55)",
                  borderRight: "none",
                  borderTopLeftRadius: 16,
                  borderBottomLeftRadius: 16,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 32,
                  top: 0,
                  width: 32,
                  height: 64,
                  background: "linear-gradient(135deg, #22D3EE 0%, #4D7CFF 50%, #8B5CF6 100%)",
                  borderTopRightRadius: 16,
                  borderBottomRightRadius: 16,
                }}
              />
            </div>
            <div
              style={{
                fontSize: 38,
                fontWeight: 700,
                color: "#EEF1F8",
                letterSpacing: -1,
              }}
            >
              SKITE
            </div>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div
              style={{
                display: "flex",
                fontSize: 92,
                fontWeight: 700,
                color: "#EEF1F8",
                letterSpacing: -4,
                lineHeight: 1.02,
              }}
            >
              From sketch to
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 92,
                fontWeight: 700,
                letterSpacing: -4,
                lineHeight: 1.02,
                backgroundImage: "linear-gradient(100deg, #22D3EE 0%, #4D7CFF 46%, #8B5CF6 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              stunning reality.
            </div>
          </div>

          {/* Footer line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.12)",
              paddingTop: 28,
            }}
          >
            <div style={{ display: "flex", fontSize: 25, color: "#9AA1B1", maxWidth: 760 }}>
              Hand-drawn wireframes into production-ready websites — layout preserved exactly.
            </div>
            <div style={{ display: "flex", fontSize: 22, color: "#6F778A" }}>skite.ai</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
