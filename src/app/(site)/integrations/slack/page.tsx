import type { Metadata } from "next";
import { IntegrationPage } from "@/components/site/IntegrationPage";
import { WaitlistForm } from "@/components/site/WaitlistForm";

export const metadata: Metadata = { title: "Slack bot (coming soon)", description: "Start a video from a Slack message. Not built yet; join the waitlist." };

export default function IntegrationSlackPage() {
  return (
    <IntegrationPage
      eyebrow="Slack bot"
      soon
      title="Start a video from a Slack message"
      intro="Not built yet. The idea: a bot in your workspace that takes a product link or a photo with a short description, starts the ad in Reelay and posts the finished video back in the channel. Leave your e-mail and we tell you when it is ready; nothing else happens."
      steps={[
        { title: "Install the bot", text: "Add it to a channel from Slack's app directory once it exists." },
        { title: "Mention it with a product", text: "A link or a photo and two sentences; the bot asks for the length and the presenter quality." },
        { title: "Get the video back", text: "The finished 9:16 ad is posted in the thread, with the credits it used." },
      ]}
      does={["Use your Reelay account, credits and limits", "Keep everything in Studio like any other project"]}
      doesNot={["Exist yet: this page is a description, not a feature", "Read messages it is not mentioned in", "Post ads anywhere outside Slack and your dashboard"]}
    >
      <div className="mt-8 rounded-card bg-surface p-6 shadow-card">
        <p className="text-[15px] font-semibold text-ink">Join the waitlist</p>
        <p className="mb-4 mt-1 text-[13px] text-muted">Your e-mail and this feature are stored, nothing more.</p>
        <WaitlistForm feature="slack" label="Slack bot" />
      </div>
    </IntegrationPage>
  );
}
