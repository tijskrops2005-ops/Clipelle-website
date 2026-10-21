import type { Metadata } from "next";
import { IntegrationPage } from "@/components/site/IntegrationPage";

export const metadata: Metadata = { title: "MCP integration", description: "Let an AI assistant create ads, translate videos and read projects through the Model Context Protocol." };

export default function IntegrationMcpPage() {
  return (
    <IntegrationPage
      eyebrow="MCP"
      title="Ask an assistant to make the video"
      intro="The Reelay MCP server runs on your machine and gives any assistant that speaks the Model Context Protocol four tools: create an ad, translate a video, get a project, list projects. Your API key stays in the environment; every video is a normal project on your dashboard."
      primary={{ href: "/docs/mcp", label: "Install the MCP server" }}
      secondary={{ href: "/docs/api", label: "API docs" }}
      steps={[
        { title: "Build it once", text: "Clone the repository, run npm install and npm run build in the mcp folder." },
        { title: "Add your key", text: "Point your assistant's MCP configuration at the built server with REELAY_API_KEY in its environment." },
        { title: "Talk", text: "Describe the product and link a photo; the assistant calls create_ad and checks back with get_project." },
      ]}
      does={["Create ads and translations through the API with your key", "Report status, steps and the result link in plain JSON", "Work with any MCP client that supports stdio servers", "Stop the moment you revoke the key"]}
      doesNot={["Upload files from your computer (link public files instead)", "Make decisions about spending on its own: keep the assistant's confirmation on", "Store anything outside your Reelay account"]}
    />
  );
}
