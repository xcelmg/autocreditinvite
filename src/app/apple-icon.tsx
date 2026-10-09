import { ImageResponse } from "next/og";
import { Mark } from "@/components/Mark";
import { BRAND } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the white shield with the red check on charcoal (iOS rounds the corners). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.ink }}>
        <Mark shield="#ffffff" check={BRAND.red} halo={BRAND.ink} size={128} />
      </div>
    ),
    size,
  );
}
