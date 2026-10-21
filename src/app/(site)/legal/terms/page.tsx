import type { Metadata } from "next";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "Terms of service" };

/** Plain-language terms based on what the product really does. Tijs has them reviewed before launch. */
export default function TermsPage() {
  const name = config.productName;
  return (
    <article className="mx-auto max-w-2xl space-y-10 pt-16 sm:pt-24">
      <div>
        <p className="label-mono text-muted">Legal · last updated 21 October 2026 · draft for review</p>
        <h1 className="text-display mt-3">Terms of service</h1>
        <p className="mt-4 text-subtitle text-muted">These terms describe what {name} does, what you may do with it and what we expect from each other. Short sentences, no surprises.</p>
      </div>
      {[
        ["1. The service", [`${name} turns product information into short video ads and translates videos you own into other languages. The steps run automatically with third-party AI and rendering services behind them. You get the finished files; we keep a copy in your account until you delete it.`]],
        ["2. Your account", ["You need an account with a verified e-mail address. You are responsible for what happens under your account and for keeping your password to yourself. One person, one account; a business can add seats on an Enterprise agreement."]],
        ["3. Credits, plans and payment", ["Plans include a number of credits per month. Credits never expire: credits from a subscription or a credit pack stay on your account for as long as the account exists, also after a subscription is cancelled; deleting the account forfeits them. The free first ad expires 30 days after it is granted. A project reserves the credits shown on the form before it starts and settles afterwards; a failed project is refunded. Subscriptions renew until you cancel in Billing; cancelling keeps the plan active until the end of the paid period. Prices are in US dollars and exclude VAT where applicable. Payments are handled by our payment provider; we never see your card number.", "The first ad after verification is free for one e-mail address and limited to ten seconds in Standard quality. We may pause free ads when a daily cap is reached."]],
        ["4. Your content and rights", ["You keep every right to what you upload and to the videos made from it. You confirm that you own the product photos and videos you upload, and, for translations, that you have the speaker's permission to use their voice and face. We may refuse or remove content that breaks the law, infringes someone's rights, or is used to deceive.", "We do not build watermark removal and we do not clone a voice or face without the confirmation above."]],
        ["5. What we do with your files", ["Your uploads and results are stored in private storage and reach the AI and rendering services only to make your video. Links to your files are signed and expire. See the privacy statement for the details, retention and your rights."]],
        ["6. Availability and changes", ["We aim for the service to be available at all times but cannot promise it. Services behind the steps change; we may replace them without notice as long as the result stays comparable. We may change these terms; the date at the top tells you when, and continued use after that date means you accept the change."]],
        ["7. Liability", ["We deliver videos as they come out of the automated process. Check a video before you publish it. To the extent the law allows, our liability is limited to the amount you paid in the three months before the claim. We are not liable for indirect damage, lost profit, or claims that follow from content you provided."]],
        ["8. Ending", ["You can delete your account in Settings at any time; your projects and files are deleted with it within 30 days. We may suspend or end an account that breaks these terms, with notice where reasonable."]],
        ["9. Contact and law", [`Questions about these terms: use the contact page. These terms are governed by Dutch law; disputes go to the competent court in the Netherlands unless mandatory consumer law says otherwise. ${name} is a working name of the operating company; the legal entity and address will be listed here before launch.`]],
      ].map(([h, ps]) => (
        <section key={h as string} className="space-y-3">
          <h2 className="text-title">{h as string}</h2>
          {(ps as string[]).map((p, i) => (
            <p key={i} className="text-[17px] leading-relaxed text-ink/90">{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
