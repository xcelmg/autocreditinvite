"use client";

import { ErrorPage } from "@/components/ErrorPage";

/** Anything that fails to load or render below the root layout. Try again re-fetches; the session is untouched. */
export default function RootError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPage {...props} />;
}
