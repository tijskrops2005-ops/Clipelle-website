import { brand } from "@/lib/brand";
import { config } from "@/lib/config";

/**
 * The texts of the "ready" and "failed" e-mails (pure, tested). Short, in our voice, no marketing,
 * no provider names. Every mail has a plain-text part and a branded HTML part in the same look as
 * the sign-in mails (docs/email-templates/). Since 27 Oct 2026 the "ready" mail shows a picture of
 * the video (sent inline as cid:poster, see src/lib/mailPoster.ts) that opens the project, and a
 * Download button per finished version; both links ask for a sign-in when needed.
 */
export type MailDownload = { label: string; url: string };
export type MailLinks = { logoUrl: string; settingsUrl: string };
export type ProjectMailInput = {
  name: string;
  status: "completed" | "failed";
  kind: "ad" | "translate";
  url: string;
  error?: string;
  recipientName?: string | null;
  /** One per finished version (a translation can have several languages). */
  downloads?: MailDownload[];
  /** Set when the picture is attached inline under this content id. */
  poster?: { cid: string; width: number; height: number } | null;
  links?: MailLinks;
};
export type BatchMailInput = { name: string; status: "completed" | "partial" | "failed"; finished: number; failed: number; total: number; url: string; recipientName?: string | null; links?: MailLinks };
export type Mail = { subject: string; text: string; html: string };

function greeting(name?: string | null) {
  const first = name?.trim().split(" ")[0];
  return first ? `Hi ${first.charAt(0).toUpperCase()}${first.slice(1)},` : "Hi,";
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const C = { ink: "#111114", bg: "#FAFAF7", surface: "#FFFFFF", muted: "#6B6B70", border: "#ECEAE4", panel: "#F4F3EF", accent: "#D43F1B" };
const FONT = "Helvetica,Arial,sans-serif";

function button(label: string, href: string, kind: "accent" | "ink" = "accent") {
  const bg = kind === "accent" ? C.accent : C.ink;
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${bg};color:#FFFFFF;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;text-decoration:none;padding:14px 28px;border-radius:999px">${escapeHtml(label)}</a>`;
}

/** The shell every notification shares: logo, one white card, a quiet footer with the switch to stop these mails. */
function layout(o: { preheader: string; body: string; links?: MailLinks }) {
  const logo = o.links ? `<img src="${escapeHtml(o.links.logoUrl)}" alt="${escapeHtml(brand.name)}" width="132" style="display:block;width:132px;height:auto;margin:0 0 28px;border:0" />` : `<p style="margin:0 0 28px;font-size:17px;font-weight:700">${escapeHtml(brand.name)}</p>`;
  const stop = o.links ? ` You get this e-mail because notifications are on for your account. <a href="${escapeHtml(o.links.settingsUrl)}" style="color:${C.muted};text-decoration:underline">Turn them off</a>.` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(brand.name)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${escapeHtml(o.preheader)}</div>
<div style="margin:0;padding:32px 16px;background:${C.bg};font-family:${FONT};color:${C.ink}">
  <div style="max-width:480px;margin:0 auto;background:${C.surface};border:1px solid ${C.border};border-radius:20px;padding:32px">
    ${logo}
    ${o.body}
  </div>
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:1.6;color:${C.muted};text-align:center">${escapeHtml(brand.name)} · ${escapeHtml(brand.tagline)}${stop}</p>
</div>
</body></html>`;
}

const h1 = (s: string) => `<h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;font-weight:600;letter-spacing:-0.02em">${s}</h1>`;
const lead = (s: string) => `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${C.muted}">${s}</p>`;
const small = (s: string) => `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${C.muted}">${s}</p>`;

export function composeProjectMail(input: ProjectMailInput): Mail {
  const what = input.kind === "ad" ? "ad" : "translation";
  const name = escapeHtml(input.name);
  if (input.status === "completed") {
    const downloads = input.downloads ?? [];
    const picture = input.poster
      ? `<a href="${escapeHtml(input.url)}" style="display:block;text-decoration:none;margin:0 0 24px;text-align:center"><img src="cid:${escapeHtml(input.poster.cid)}" alt="Watch &quot;${name}&quot;" width="${Math.round(input.poster.width / 2)}" height="${Math.round(input.poster.height / 2)}" style="display:inline-block;width:${Math.round(input.poster.width / 2)}px;max-width:100%;height:auto;border:0;border-radius:16px" /></a>`
      : "";
    const actions =
      downloads.length === 1
        ? `<div style="text-align:center">${button("Download video", downloads[0].url)}</div>`
        : downloads.length > 1
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.panel};border-radius:14px;border-collapse:separate">${downloads
              .map((d, i) => {
                const line = i > 0 ? `border-top:1px solid ${C.border};` : "";
                return `<tr><td style="padding:14px 0 14px 18px;${line}font-family:${FONT};font-size:15px;font-weight:600;color:${C.ink}">${escapeHtml(d.label)}</td><td align="right" style="padding:14px 18px 14px 0;${line}font-family:${FONT};font-size:15px"><a href="${escapeHtml(d.url)}" style="color:${C.accent};font-weight:600;text-decoration:none">Download</a></td></tr>`;
              })
              .join("")}</table>`
          : `<div style="text-align:center">${button("Open your video", input.url)}</div>`;
    const html = layout({
      preheader: `"${input.name}" is finished and ready to download.`,
      links: input.links,
      body: [
        h1(`Your ${what} is ready`),
        lead(`${escapeHtml(greeting(input.recipientName))} &quot;${name}&quot; is finished and ready to download.`),
        picture,
        actions,
        small(`Or <a href="${escapeHtml(input.url)}" style="color:${C.ink};text-decoration:underline">open the project</a> to watch it, make another version or share it.`),
      ].join("\n"),
    });
    const textDownloads = downloads.length > 1 ? `\n\n${downloads.map((d) => `${d.label}: ${d.url}`).join("\n")}` : downloads.length === 1 ? `\n\nDownload: ${downloads[0].url}` : "";
    return {
      subject: `Your ${what} "${input.name}" is ready`,
      text: `${greeting(input.recipientName)}\n\nYour ${what} "${input.name}" is finished and ready to download.${textDownloads}\n\nOpen the project: ${input.url}\n\n${config.productName}`,
      html,
    };
  }
  const html = layout({
    preheader: `"${input.name}" stopped before it was finished. Your credits for it are refunded.`,
    links: input.links,
    body: [
      h1(`Your ${what} stopped`),
      lead(`${escapeHtml(greeting(input.recipientName))} &quot;${name}&quot; stopped before it was finished. Credits for a failed run are refunded.`),
      input.error ? `<div style="margin:0 0 24px;padding:16px 18px;background:${C.panel};border-radius:14px;font-size:14px;line-height:1.6"><span style="font-weight:600">What happened:</span> ${escapeHtml(input.error)}</div>` : "",
      `<div style="text-align:center">${button("Open and retry", input.url, "ink")}</div>`,
    ].join("\n"),
  });
  return {
    subject: `Your ${what} "${input.name}" stopped`,
    text: `${greeting(input.recipientName)}\n\nYour ${what} "${input.name}" stopped before it was finished.${input.error ? `\n\nWhat happened: ${input.error}` : ""}\n\nOpen the project to retry the step; credits for a failed run are refunded.\n\n${input.url}\n\n${config.productName}`,
    html,
  };
}

export function composeBatchMail(input: BatchMailInput): Mail {
  const summary = input.failed === 0 ? `All ${input.total} variations are ready to download.` : input.finished === 0 ? `None of the ${input.total} variations finished.` : `${input.finished} of ${input.total} variations are ready; ${input.failed} stopped.`;
  const retry = input.failed > 0 ? " Open a stopped one to retry it; its credits are refunded." : "";
  const subject = input.status === "completed" ? `Your ${input.total} variations of "${input.name}" are ready` : input.status === "partial" ? `${input.finished} of ${input.total} variations of "${input.name}" are ready` : `Your variations of "${input.name}" stopped`;
  const html = layout({
    preheader: summary,
    links: input.links,
    body: [
      h1(input.finished > 0 ? "Your variations are ready" : "Your variations stopped"),
      lead(`${escapeHtml(greeting(input.recipientName))} ${escapeHtml(summary)}${escapeHtml(retry)}`),
      `<div style="text-align:center">${button(input.finished > 0 ? "View your variations" : "Open and retry", input.url, input.finished > 0 ? "accent" : "ink")}</div>`,
    ].join("\n"),
  });
  return { subject, text: `${greeting(input.recipientName)}\n\n${summary}${retry}\n\n${input.url}\n\n${config.productName}`, html };
}
