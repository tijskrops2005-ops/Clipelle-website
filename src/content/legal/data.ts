import type { LegalDoc } from "./types";

/** How files and data are handled. Only what the product really does (storage, deletion, signed links). */
export const dataDoc: LegalDoc = {
  slug: "data",
  title: "Files and data",
  summary: "How Reelay stores your uploads and finished videos, who can reach them, and how they are deleted.",
  updated: "2026-10-21",
  draft: true,
  sections: [
    { heading: "Your files", paragraphs: ["Product photos, logos, background images, uploaded videos and finished videos are stored in a private storage bucket that is not reachable from the open web. The app reads and writes it with a server-side key; browsers never get that key."] },
    { heading: "Signed links", paragraphs: ["When you watch or download a video, the server creates a signed link that works for a limited time (about an hour) and then stops working. Links handed to the services that make a video are temporary too. We never publish a permanent public link to your files."] },
    { heading: "Per account", paragraphs: ["Every project, file, credit entry and cost entry belongs to one account. The data layer checks the account on every request; a project of another account does not exist as far as yours is concerned."] },
    { heading: "Processing", paragraphs: ["To make a video, the necessary inputs (your description, the photo, the video to translate, the script) are sent to the services behind each step and the results are copied back into your storage. Those services are replaceable and are not named in the product; the step names describe what happens."] },
    { heading: "Deleting", paragraphs: ["Deleting a project removes its files and records. Deleting your account in Settings removes your projects, files, credits and profile; it cannot be undone and your credits are lost with it."] },
    { heading: "Draft", paragraphs: ["This is a draft, to be reviewed. The practices described are the ones built into the product today."] },
  ],
};
