import type { Metadata } from "next";
import { Footer, Header } from "@/components/Chrome";
import { Portal } from "./Portal";
import { viewFromSession, type FlowView } from "@/lib/flow";
import { readSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your invitation",
  description: "Enter the Invitation Code from your mailer to start your auto credit application with the participating dealership.",
  robots: { index: false },
};

const LINK_ERRORS: Record<string, string> = {
  notfound: "We couldn't find that Invitation Code. Check the 9 digits on your mailer and try again.",
  inactive:
    "This Invitation Code isn't active right now — invitations are good only for the dates on your mailer. The dealership named on your mailer can still help.",
  unavailable: "We can't look up Invitation Codes right this second. Please try again in a moment.",
  limit: "Too many tries in a row. Please wait a few minutes and try again.",
};

export default async function InvitationPage(props: PageProps<"/invitation">) {
  const sp = await props.searchParams;
  let view: FlowView = await viewFromSession(await readSession());
  // A failed QR deep link lands here with the code pre-filled.
  if (view.step === "code" && typeof sp.code === "string") {
    view = { step: "code", code: sp.code, error: typeof sp.e === "string" ? LINK_ERRORS[sp.e] : undefined };
  }
  return (
    <>
      <Header cta={false} />
      <main id="main" className="flex-1">
        <Portal initial={view} />
      </main>
      <Footer />
    </>
  );
}
