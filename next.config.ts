import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The OG image reads its fonts and photo crop from disk at build/request time.
  outputFileTracingIncludes: { "/opengraph-image": ["./assets/sora-700.woff", "./assets/sora-600.woff", "./assets/og-photo.jpg"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // Paths the previous site (and printed mailers) may still send people to.
    return [
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/invitation.html", destination: "/invitation", permanent: true },
      { source: "/privacy.html", destination: "/privacy", permanent: true },
      { source: "/terms.html", destination: "/terms", permanent: true },
      { source: "/pin/:pin(\\d{3}-?\\d{3}-?\\d{3})", destination: "/p/:pin", permanent: false },
    ];
  },
};

export default nextConfig;
