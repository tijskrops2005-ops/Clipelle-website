import Script from "next/script";
import { siteUrl } from "@/lib/site";
import { CONSENT_COOKIE } from "@/lib/consent";

/**
 * Google Analytics 4 with consent mode v2 (29 Oct 2026). Every consent type starts "denied", so
 * before a choice (or after Decline) the tag sends cookieless pings only; Accept in the cookie banner
 * grants `analytics_storage` (src/lib/consent.ts). Advertising types stay denied: the site runs no
 * Google ads. Only on the live domain: a production build on Vercel with NEXT_PUBLIC_GA_MEASUREMENT_ID
 * set, and in the browser only on the site's own host (not on preview or *.vercel.app addresses).
 * Pages whose address carries a token (share links, invites, sign-in callbacks) never load the tag,
 * and sign-in parameters are stripped from the first page address.
 */
const ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

export function gaEnabled() {
  return process.env.VERCEL_ENV === "production" && /^G-[A-Z0-9]{4,20}$/.test(ID);
}

export function GoogleAnalytics() {
  if (!gaEnabled()) return null;
  const host = new URL(siteUrl()).hostname;
  const js = `(function(){
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"denied",wait_for_update:500});
gtag("set","ads_data_redaction",true);
if(location.hostname!==${JSON.stringify(host)}||/^\\/(share|invite|auth)\\//.test(location.pathname))return;
try{var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);if(m){var c=JSON.parse(decodeURIComponent(m[1]));if(c&&c.v===1&&c.analytics)gtag("consent","update",{analytics_storage:"granted"});}}catch(e){}
var u=new URL(location.href);["code","token","token_hash","access_token","refresh_token","type"].forEach(function(k){u.searchParams.delete(k);});
gtag("js",new Date());gtag("config",${JSON.stringify(ID)},{page_location:u.href,allow_google_signals:false,allow_ad_personalization_signals:false});
var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id=${ID}";document.head.appendChild(s);
})();`;
  return <Script id="google-analytics" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: js }} />;
}
