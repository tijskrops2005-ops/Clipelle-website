import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { config } from "@/lib/config";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: config.productName,
    template: `%s · ${config.productName}`,
  },
  description: config.tagline,
  openGraph: { type: "website", siteName: config.productName, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* One-time carry-over of browser storage written under the pre-rename prefix (22 Oct 2026); runs before hydration so no preference is lost.
            Through next/script (27 Oct 2026): a plain <script> made React warn on every client re-render of the root layout. */}
        <Script
          id="storage-carry-over"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var s=window.localStorage;for(var i=s.length-1;i>=0;i--){var k=s.key(i);if(k&&(k.indexOf("reelay.")===0||k.indexOf("reelay:")===0)){var n="clipelle"+k.slice(6);if(s.getItem(n)===null)s.setItem(n,s.getItem(k));s.removeItem(k);}}}catch(e){}`,
          }}
        />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
