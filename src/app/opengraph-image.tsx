import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Mark } from "@/components/Mark";
import { BRAND, site } from "@/lib/site";

export const alt = `${site.name} — Your auto credit application, already started.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MUTED = "#5a606b";

/* The share card: the lockup and headline on the canvas, the hero photograph bled to the right edge
 * (a 520 × 655 crop of src/images/hero.jpg in assets/, read at build time like the fonts). */
export default async function OgImage() {
  const [bold, semi, photo] = await Promise.all([
    readFile(join(process.cwd(), "assets/sora-700.woff")),
    readFile(join(process.cwd(), "assets/sora-600.woff")),
    readFile(join(process.cwd(), "assets/og-photo.jpg")),
  ]);
  const src = `data:image/jpeg;base64,${photo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BRAND.canvas, color: BRAND.ink, fontFamily: "Sora" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "64px 56px 64px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Mark shield={BRAND.ink} check={BRAND.blue} halo={BRAND.canvas} size={58} />
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 42, fontWeight: 700, letterSpacing: -1.4 }}>
              <span style={{ fontSize: 26, fontWeight: 600, color: "#434852", marginRight: 6 }}>my</span>
              <span>Auto</span>
              <span style={{ color: BRAND.red }}>Credit</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 62, fontWeight: 700, lineHeight: 1.06, letterSpacing: -2.2 }}>
            <div>Your auto credit</div>
            <div>application,</div>
            <div style={{ color: BRAND.red }}>already started.</div>
            <div style={{ width: 56, height: 4, borderRadius: 2, background: BRAND.blue, marginTop: 26 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 24, fontWeight: 600, color: MUTED }}>
            <div style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap", background: BRAND.red, color: "#ffffff", borderRadius: 12, padding: "12px 20px", fontSize: 22 }}>
              Enter your Invitation Code
            </div>
            About 3 minutes
          </div>
        </div>
        <img src={src} width={520} height={630} alt="" style={{ width: 520, height: 630, objectFit: "cover" }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Sora", data: bold, weight: 700, style: "normal" },
        { name: "Sora", data: semi, weight: 600, style: "normal" },
      ],
    },
  );
}
