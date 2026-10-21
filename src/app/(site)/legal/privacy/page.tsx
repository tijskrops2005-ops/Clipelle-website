import type { Metadata } from "next";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy" };

/** What we really collect and why, from the code and docs. Tijs has it reviewed before launch. */
export default function PrivacyPage() {
  const name = config.productName;
  return (
    <article className="mx-auto max-w-2xl space-y-10 pt-16 sm:pt-24">
      <div>
        <p className="label-mono text-muted">Legal · last updated 21 October 2026 · draft for review</p>
        <h1 className="text-display mt-3">Privacy statement</h1>
        <p className="mt-4 text-subtitle text-muted">What {name} stores, where it goes and how long it stays.</p>
      </div>
      {[
        ["What we store", ["Account: your e-mail address, a password hash or sign-in tokens, your name if you enter it, and the brand defaults you save (colour, caption style, font, logo).", "Projects: the product photos, descriptions, scripts, videos and settings you enter, every intermediate result, the finished videos, timings and the amount each step cost.", "Translations: the uploaded video, transcripts, translated lines, the automatic quality check, and the timestamp of your rights confirmation.", "Billing: your plan, invoices and a credit ledger (what was granted, used and refunded). Card details stay with the payment provider.", "Site forms: demo and contact requests with name, e-mail, company and message, a hashed IP address and the time, used to answer you and to stop abuse.", "Technical: server logs with request times and error messages. No advertising cookies; a session cookie keeps you signed in."]],
        ["Where it goes", ["Files and the database live with our hosting and storage provider. To make a video, the relevant parts are sent to the AI and rendering services behind each step: product description and photo for the script and the product clip, the script and your voice choices for the presenter, the clips for the edit, and the uploaded video for a translation. These providers process the data to deliver the result and are bound by their own terms and data agreements. Payments go through our payment provider.", "We never show provider names in the product and we do not sell or share your data for advertising."]],
        ["How long", ["Projects and files stay in your account until you delete them or your account. Deleting your account removes projects and files within 30 days. Demo and contact requests are kept for 12 months. Cost and credit records are kept as long as the law requires for bookkeeping. Backups follow the provider's retention and are overwritten in the normal cycle."]],
        ["Your rights", ["You can see, change or export your data in Settings, delete projects yourself, and delete your account including everything in it. For anything else, or to object to processing, use the contact page. If you are in the EU you can also complain to your data protection authority."]],
        ["Security", ["Keys to the services stay on the server and are never sent to the browser. Every table is protected by row-level security and the public API roles have no access; your data is only reachable through our server with your session. Links to your files are signed and expire. The confirmation of rights for a translation is stored with the project."]],
        ["Changes and contact", [`We update this statement when the product changes; the date at the top tells you when. Questions: use the contact page. The legal entity behind ${name} and its address will be listed here before launch.`]],
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
