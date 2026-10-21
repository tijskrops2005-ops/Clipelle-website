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

export const dataDocNl: LegalDoc = {
  slug: "data",
  title: "Bestanden en gegevens",
  summary: "Hoe Reelay je uploads en afgeronde video's bewaart, wie erbij kan en hoe ze worden verwijderd.",
  updated: "2026-10-21",
  draft: true,
  sections: [
    { heading: "Je bestanden", paragraphs: ["Productfoto's, logo's, achtergrondafbeeldingen, geüploade video's en afgeronde video's staan in een afgeschermde opslag die niet vanaf het open internet bereikbaar is. De app leest en schrijft daar met een serversleutel; browsers krijgen die sleutel nooit."] },
    { heading: "Gesigneerde links", paragraphs: ["Als je een video bekijkt of downloadt, maakt de server een gesigneerde link die beperkte tijd werkt (ongeveer een uur) en daarna stopt. Links die aan de diensten worden gegeven die een video maken, zijn ook tijdelijk. We publiceren nooit een permanente openbare link naar je bestanden."] },
    { heading: "Per workspace", paragraphs: ["Elk project, bestand, creditboeking en kostenregel hoort bij één workspace. De datalaag controleert de workspace bij elk verzoek; een project van een andere workspace bestaat voor de jouwe niet."] },
    { heading: "Verwerking", paragraphs: ["Om een video te maken gaan de benodigde invoer (je omschrijving, de foto, de te vertalen video, het script) naar de diensten achter elke stap en komen de resultaten terug in je opslag. Die diensten zijn vervangbaar en worden niet bij naam genoemd in het product; de stapnamen beschrijven wat er gebeurt."] },
    { heading: "Verwijderen", paragraphs: ["Een project verwijderen verwijdert de bestanden en gegevens ervan. Je account verwijderen in Settings verwijdert je projecten, bestanden, credits en profiel; dat kan niet ongedaan worden gemaakt en je credits gaan ermee verloren."] },
    { heading: "Concept", paragraphs: ["Dit is een concept, nog te beoordelen. De beschreven werkwijze is wat vandaag in het product is gebouwd."] },
  ],
};
