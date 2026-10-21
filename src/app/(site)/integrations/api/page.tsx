import type { Metadata } from "next";
import { IntegrationPage } from "@/components/site/IntegrationPage";

export const metadata: Metadata = { title: "API integration", description: "Create ads and translations from your own code with an API key: same credits, same limits, same projects." };

export default function IntegrationApiPage() {
  return (
    <IntegrationPage
      eyebrow="API"
      title="Make videos from your own code"
      intro="A key from Settings → API keys lets your shop, your sync job or your agency tooling create ads and translations the way the form does. Every project lands in Studio with the same credits and the same cost limits."
      primary={{ href: "/docs/api", label: "Read the API docs" }}
      secondary={{ href: "/signup", label: "Create an account" }}
      steps={[
        { title: "Create a key", text: "On a plan with credits, make a key in Settings. It is shown once; revoke it any time." },
        { title: "Send a product", text: "POST the product name, description and public image links, plus the length and quality you want." },
        { title: "Poll the project", text: "Read the status and the generic steps; when it is completed, download the video from a signed link." },
      ]}
      does={["Ads from a product and image links, translations from a video link", "Idempotency keys so a retry never makes a second video", "Clear error codes: credits, plan, budget, validation, rate limit", "Projects scoped to your account, never anyone else's"]}
      doesNot={["Send webhooks yet (poll the project)", "Launch ads on any ad platform", "Return provider names or raw provider data", "Bypass the credits and cost limits of your account"]}
    />
  );
}
