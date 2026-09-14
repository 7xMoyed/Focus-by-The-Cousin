import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";

import { LocaleProvider } from "@/features/i18n/locale-provider";

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
  title: {
    default: "Focus by The Cousin",
    template: "%s | Focus by The Cousin",
  },
  description: "اكتشف أفضل الأماكن للدراسة والعمل بتركيز في المجمعة وشمال الرياض.",
  applicationName: "Focus by The Cousin",
  keywords: ["أماكن دراسة", "مساحات عمل", "مقاهي هادئة", "المجمعة", "الرياض"],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <body className={thmanyah.variable}>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
