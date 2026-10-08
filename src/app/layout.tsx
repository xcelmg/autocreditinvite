import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/sora";
import "./globals.css";
import { DemoBanner } from "@/components/Chrome";
import { apiHealth } from "@/lib/api";
import { site } from "@/lib/site";
import { MOTION_GATE } from "@/lib/motion";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Your auto credit application, by invitation`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f7fa",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const demo = (await apiHealth()).mode === "demo";
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_GATE }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-ink-900 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
        >
          Skip to content
        </a>
        {demo && <DemoBanner />}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
