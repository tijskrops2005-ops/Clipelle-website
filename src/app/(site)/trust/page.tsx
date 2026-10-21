import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { config } from "@/lib/config";
import { absoluteUrl } from "@/lib/site";
import { SectionIntro } from "@/components/site/SectionIntro";
import { TrustBlocks } from "@/components/site/TrustBlocks";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = { title: "Trust", description: "What Reelay does with your videos, files, data and money: only facts that match the product.", alternates: { canonical: absoluteUrl("/trust") } };

/** Only facts that hold in the product today. No certifications, no claims we cannot back. */
const facts: { title: string; text: string; link?: { href: string; label: string } }[] = [
  { title: "Rights before any translation", text: `A video is translated only after you confirm: "${config.rightsConfirmationText}" Without that confirmation the button stays disabled and the server refuses the request. The confirmation is stored with the project.` },
  { title: "Your own products and photos", text: "Image to video and URL to video ask you to use only products and photos you own or have the rights to use. Photos read from a product page are copied only after you confirm them." },
  { title: "Data separated per account", text: "Every project, file, credit entry and cost entry belongs to one account. The server checks the account on every request; another account's project is not found, not forbidden.", link: { href: "/legal/data", label: "Files and data" } },
  { title: "Files in private storage, signed links", text: "Uploads and finished videos live in a private bucket. Viewing or downloading uses a signed link that expires after about an hour. We never publish a permanent public link to your files." },
  { title: "Costs visible before you start", text: "Every form shows the estimate in credits and dollars. One confirmation step repeats it. The project page shows the real amount afterwards, next to the estimate.", link: { href: "/pricing", label: "Pricing" } },
  { title: "Deleting your data", text: "Deleting a project removes its files and records. Deleting your account in Settings removes projects, files, credits and profile; it cannot be undone." },
  { title: "Processors behind each step", text: "The script, the product clip, the presenter, the translation and the edit are made by specialised services that receive only the inputs that step needs. They are replaceable and are not named in the product; the step names describe what happens." },
  { title: "Accounts and sign-in", text: "E-mail with a verification link, a password or a magic link. Sign-in attempts are rate limited per address and per e-mail. API keys are stored as hashes and can be revoked at any time." },
  { title: "Cookies only with consent", text: "Optional analytics and partner-tracking scripts load only after you allow them in the cookie banner, and only when a provider is configured.", link: { href: "/legal/cookies", label: "Cookie policy" } },
];

export default function TrustPage() {
  return (
    <div className="space-y-24 pt-16 sm:pt-24 sm:space-y-32">
      <SectionIntro eyebrow="Trust" title="What we do with your videos, data and money" text="Only what is true in the product today. No certifications we do not have, no numbers we cannot show." />
      <section>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((f) => (
            <li key={f.title} className="flex flex-col rounded-card bg-surface p-6 shadow-card">
              <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent"><ShieldCheck className="size-4" aria-hidden /></span>
              <p className="mt-4 text-[17px] font-semibold text-ink">{f.title}</p>
              <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{f.text}</p>
              {f.link && <Link href={f.link.href} className="focus-ring mt-4 w-fit rounded-control text-sm font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">{f.link.label}</Link>}
            </li>
          ))}
        </ul>
      </section>
      <TrustBlocks />
      <section className="mx-auto max-w-2xl text-center text-[15px] text-muted">
        <p>Questions about security or data? <Link href="/contact" className="underline">Write to us</Link>. Legal drafts: <Link href="/legal/terms" className="underline">terms</Link>, <Link href="/legal/privacy" className="underline">privacy</Link>, <Link href="/legal/data" className="underline">files and data</Link>, <Link href="/legal/cookies" className="underline">cookies</Link>.</p>
      </section>
      <CtaBand />
    </div>
  );
}
