import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Mark } from "@/components/Mark";
import { BRAND, site } from "@/lib/site";

export const alt = `${site.name} — Your auto credit application, already started.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MUTED = "#5a606b";

export default async function OgImage() {
  const [bold, semi] = await Promise.all([
    readFile(join(process.cwd(), "assets/sora-700.woff")),
    readFile(join(process.cwd(), "assets/sora-600.woff")),
  ]);
  const rows = ["Invitation Code", "Name and address", "Mobile number"];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BRAND.canvas,
          color: BRAND.ink,
          fontFamily: "Sora",
          padding: "64px 72px",
          gap: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Mark shield={BRAND.ink} check={BRAND.red} halo={BRAND.canvas} size={58} />
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 42, fontWeight: 700, letterSpacing: -1.4 }}>
              <span style={{ fontSize: 26, fontWeight: 600, color: "#434852", marginRight: 6 }}>my</span>
              <span>Auto</span>
              <span style={{ color: BRAND.blue }}>Credit</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 62, fontWeight: 700, lineHeight: 1.06, letterSpacing: -2.2 }}>
            <div>Your auto credit</div>
            <div>application,</div>
            <div style={{ color: BRAND.blue }}>already started.</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: MUTED }}>
            Enter your Invitation Code · About 3 minutes
          </div>
        </div>
        <div
          style={{
            width: 400,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: BRAND.ink,
            borderRadius: 28,
            padding: 32,
            gap: 14,
            color: "#ffffff",
          }}
        >
          {rows.map((r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", fontSize: 24, fontWeight: 600 }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </div>
              {r}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: BRAND.blue, borderRadius: 16, padding: "18px 20px", fontSize: 24, fontWeight: 700 }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.blue, fontSize: 20 }}>
              4
            </div>
            Credit application
          </div>
        </div>
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
