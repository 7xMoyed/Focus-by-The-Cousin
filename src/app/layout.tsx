import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import Script from "next/script";

import { LocaleProvider } from "@/features/i18n/locale-provider";
import { ThemeProvider } from "@/features/theme/theme-provider";
import { AuthProvider } from "@/features/auth/auth-provider";
import { SITE_DESCRIPTION_AR, SITE_DESCRIPTION_EN, SITE_URL } from "@/lib/site";

import "./globals.css";

const thmanyah = localFont({
  src: [
    { path: "../assets/fonts/thmanyah/thmanyahsans-Regular.woff2", weight: "400" },
    { path: "../assets/fonts/thmanyah/thmanyahsans-Medium.woff2", weight: "500" },
    { path: "../assets/fonts/thmanyah/thmanyahsans-Bold.woff2", weight: "700" },
  ],
  variable: "--font-thmanyah",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Focus by The Cousin | أماكن للدراسة والعمل بتركيز",
    template: "%s | Focus by The Cousin",
  },
  description: `${SITE_DESCRIPTION_AR} ${SITE_DESCRIPTION_EN}`,
  applicationName: "Focus by The Cousin",
  keywords: ["أماكن دراسة", "مساحات عمل", "مقاهي هادئة", "المجمعة", "الرياض"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Focus by The Cousin",
    title: "Focus by The Cousin | أماكن للدراسة والعمل بتركيز",
    description: `${SITE_DESCRIPTION_AR} ${SITE_DESCRIPTION_EN}`,
    locale: "ar_SA",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary",
    title: "Focus by The Cousin | أماكن للدراسة والعمل بتركيز",
    description: `${SITE_DESCRIPTION_AR} ${SITE_DESCRIPTION_EN}`,
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  robots: {
    index: true,
    follow: true,
  },
};

const themeBootScript = `
  try {
    const saved = localStorage.getItem("focus-theme-v1");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={thmanyah.variable}>
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>{children}</AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
        <Script id="focus-theme" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
      </body>
    </html>
  );
}
