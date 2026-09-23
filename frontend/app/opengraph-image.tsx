import { ImageResponse } from "next/og";

import { SITE_TAGLINE } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TraceMint — find copies of your art, and turn them into licences";

/** The card that appears when the site is shared. Drawn here so it always matches the live positioning. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0b",
          color: "#eaeae5",
          padding: 72,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 44, height: 44, background: "#ff5a1f" }} />
          <div style={{ fontSize: 34, letterSpacing: 2, fontWeight: 700 }}>TRACEMINT/</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.04, letterSpacing: -1, maxWidth: 940 }}>{SITE_TAGLINE}</div>
          <div style={{ fontSize: 28, color: "#9a9a95", maxWidth: 900, lineHeight: 1.4 }}>
            An agent finds them. GenLayer validators judge them. The site owner pays the licence on chain.
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 22, color: "#9a9a95" }}>
          <div style={{ color: "#9bf0c8" }}>97% to the creator</div>
          <div>Validator consensus, not one server</div>
          <div>GenLayer Studio Next</div>
        </div>
      </div>
    ),
    size,
  );
}
