import type { Metadata } from "next";
import { IntegrationPage } from "@/components/site/IntegrationPage";
import { WaitlistForm } from "@/components/site/WaitlistForm";

export const metadata: Metadata = { title: "Ad Launcher (coming soon)", description: "Send a finished ad to an ad account. Not built yet; join the waitlist." };

export default function IntegrationAdLauncherPage() {
  return (
    <IntegrationPage
      eyebrow="Ad Launcher"
      soon
      title="Send a finished ad to your ad account"
      intro="Not built yet. The idea: once a video is ready, hand it to a connected ad account as a draft creative, so you finish the campaign where you always do. Reelay would stop at the draft; targeting, budgets and launching stay in the ad platform. Leave your e-mail and we tell you when it is ready."
      steps={[
        { title: "Connect an ad account", text: "A permission you grant once in Settings → Connections, revocable there." },
        { title: "Pick a finished video", text: "On the project page: send as a draft creative, with the name and the caption text." },
        { title: "Finish in the ad platform", text: "Audience, budget and schedule are set where you manage your campaigns." },
      ]}
      does={["Upload a finished video as a draft creative to an account you connect", "Keep the caption text with the creative"]}
      doesNot={["Exist yet: this page is a description, not a feature", "Launch, target or budget campaigns", "Read your ad performance (Reelay is not an analytics tool)"]}
    >
      <div className="mt-8 rounded-card bg-surface p-6 shadow-card">
        <p className="text-[15px] font-semibold text-ink">Join the waitlist</p>
        <p className="mb-4 mt-1 text-[13px] text-muted">Your e-mail and this feature are stored, nothing more.</p>
        <WaitlistForm feature="ad-launcher" label="Ad Launcher" />
      </div>
    </IntegrationPage>
  );
}
