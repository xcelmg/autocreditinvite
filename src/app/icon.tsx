import { ImageResponse } from "next/og";
import { Mark } from "@/components/Mark";
import { BRAND } from "@/lib/site";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: the shield and check in white on the brand red (one colour reads best this small). */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.red, borderRadius: 8 }}>
        <Mark shield="#ffffff" check="#ffffff" halo={BRAND.red} size={28} />
      </div>
    ),
    size,
  );
}
