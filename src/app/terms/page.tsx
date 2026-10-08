import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage title="Terms of Use" updated="October 8, 2026">
      <p>By using this website you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>

      <h2>What this site is</h2>
      <p>
        {site.name} is a marketing program that connects people with participating automotive dealerships. It is not a
        lender or a broker. It doesn&apos;t make credit decisions, and it doesn&apos;t arrange, negotiate or
        guarantee financing. Nothing on this site is an offer of credit or a commitment to lend.
      </p>

      <h2>Financing</h2>
      <p>
        Any financing is provided by third-party lenders through the dealership. Approval, rates, down payment and
        terms depend on your complete credit application, verification of the information you provide, the vehicle you
        choose and each lender&apos;s criteria. Not everyone will qualify. Sending a credit application on this site means
        the dealership and its lenders will consider it — not that it will be approved.
      </p>

      <h2>The credit application</h2>
      <p>
        The credit application is optional. When you send it, you authorize the dealership named on your invitation,
        and the lenders and other financing sources it submits your application to, to obtain your consumer credit
        report. That is a hard inquiry, which will appear on your credit report and may affect your credit score.
        Entering your Invitation Code and contact details alone does not check your credit. You may withdraw your
        authorization before your report is obtained by contacting the dealership.
      </p>

      <h2>Your information</h2>
      <p>
        You agree that the information you submit is accurate and is your own, and that you are 18 or older. How it is handled is described in our{" "}
        <Link className="font-semibold underline" href="/privacy">
          Privacy Policy
        </Link>
        .
      </p>

      <h2>Text messages</h2>
      <p>
        If you agree to receive texts, the dealership named on your invitation may text you about your invitation and
        credit application.
        Message and data rates may apply; message frequency varies. Reply STOP to opt out at any time. Consent is not a
        condition of purchase.
      </p>

      <h2>Invitation Codes</h2>
      <p>
        Invitations are personal and are limited to the dates printed on them. Don&apos;t attempt to guess or use
        Invitation Codes that aren&apos;t yours; we may block access that looks automated or abusive.
      </p>

      <h2>No warranties</h2>
      <p>
        The site is provided &quot;as is&quot;. To the fullest extent allowed by law, we disclaim all warranties and are
        not liable for indirect or consequential damages arising from your use of the site.
      </p>

      <h2>Questions and requests</h2>
      <p>
        For questions about your invitation or these terms, or to make a request about your information, email{" "}
        <a className="link" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows when they last changed.</p>
    </LegalPage>
  );
}
