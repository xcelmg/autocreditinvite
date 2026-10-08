import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="October 8, 2026">
      <p>
        This policy explains what {site.name} (&quot;we&quot;, &quot;us&quot;) collects on this website, why, and who we
        share it with. {site.name} is run on behalf of participating automotive dealerships.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>The Invitation Code from your mailer, which identifies the mailing and the dealership that sent it.</li>
        <li>Your mobile phone number, and your email address if you choose to give it.</li>
        <li>Your name, if we can&apos;t confirm it from your invitation.</li>
        <li>
          Any optional answers you choose to give about your situation — for example, whether you&apos;ve had a
          bankruptcy or repossession, how you&apos;d describe your credit, your down payment, the kind of vehicle you
          want and when. You can skip every one of them.
        </li>
        <li>
          <strong>For the credit application:</strong> your Social Security number and date of birth, and a record of
          your authorization for the credit check (the time, your IP address and the version of the wording you agreed
          to).
        </li>
        <li>
          Basic technical data such as your IP address, browser type and pages visited, used for security and to
          measure how the site performs.
        </li>
        <li>
          An anonymous visitor ID stored in a cookie on your device, plus your device type (phone, tablet or computer) and
          the kind of site that referred you, so we can count visits and see how well the program works. It doesn&apos;t
          identify you and isn&apos;t used for advertising.
        </li>
      </ul>

      <h2>The credit application</h2>
      <p>
        Entering your Invitation Code and contact details does not check your credit. If you choose to send the credit
        application, we collect your Social Security number and date of birth and send them, with your name and address
        from your invitation, to the participating dealership named on your invitation. With your written
        authorization, the dealership shares them with the lenders and other financing sources it submits your
        application to. They use them to obtain your credit report — a hard inquiry, which may affect your credit
        score — and to evaluate your application.
      </p>
      <ul>
        <li>Your Social Security number and date of birth are sent over an encrypted connection (TLS).</li>
        <li>
          This website does not keep them: they pass through to the dealership&apos;s records and are not stored in your
          browser, in cookies or in this site&apos;s logs.
        </li>
        <li>They are used only to process your credit application, and for nothing else.</li>
        <li>We never sell them, or any of your personal information.</li>
      </ul>
      <p>The credit application is optional. You can skip it, and your specialist can take it at your visit instead.</p>

      <h2>How we use your information</h2>
      <ul>
        <li>To find your invitation and show its details.</li>
        <li>
          To send your information to the participating dealership named on your invitation so its specialist can text
          you about vehicle financing and your visit.
        </li>
        <li>To send your credit application to the dealership and its lenders, if you choose to.</li>
        <li>To match your response to the mailing you received and measure the program&apos;s results.</li>
        <li>To prevent fraud and abuse of the site.</li>
      </ul>
      <p>Your optional answers are used only to help the dealership&apos;s specialist prepare for your visit.</p>

      <h2>Who we share it with</h2>
      <p>
        Your information is shared with the participating dealership named on your invitation and, for the credit
        application, with the lenders and other financing sources the dealership submits it to. We also use service
        providers that help operate the program (for example, website hosting and campaign management), who may use it
        only to provide those services. The dealership and its lenders handle your information under their own privacy
        notices. We do not sell your personal information.
      </p>

      <h2>Text messages</h2>
      <p>
        If you agree, the dealership may send text messages about your invitation and credit application to the mobile
        number you provide, which may be sent using automated technology. Message and data rates may apply, and message
        frequency varies. Reply STOP at any time to opt out. Consent is never a condition of purchase.
      </p>

      <h2>Retention and security</h2>
      <p>
        We keep response records for as long as needed to run and measure the program and to meet legal obligations.
        Data is sent over encrypted connections, and access is limited to people who need it.
      </p>

      <h2>Your choices</h2>
      <p>
        You can stop texts at any time by replying STOP. To ask to access, correct or delete the information you
        submitted, see <a className="link" href="#contact">Contact us</a> below. Depending on where you live, you may
        have additional rights under state privacy laws; we will honor them as required.
      </p>

      <h2>Children</h2>
      <p>This site is intended for adults 18 and older. We do not knowingly collect information from children.</p>

      <h2>Changes</h2>
      <p>We may update this policy. The date at the top shows when it last changed.</p>

      <h2 id="contact">Contact us</h2>
      <p>
        For questions about this policy, or to ask us to access, correct or delete your information, or to stop texts,
        email <a className="link" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. You can also reply STOP
        to any text.
      </p>
    </LegalPage>
  );
}
