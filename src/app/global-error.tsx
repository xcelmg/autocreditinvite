"use client";

import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/sora";
import "./globals.css";
import { ErrorPage } from "@/components/ErrorPage";
import { site } from "@/lib/site";

/** A failure in the root layout itself: the same page in its own document (it replaces the layout). */
export default function GlobalError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <title>{site.name}</title>
        <ErrorPage {...props} />
      </body>
    </html>
  );
}
