import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
