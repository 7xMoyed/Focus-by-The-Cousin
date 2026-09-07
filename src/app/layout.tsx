import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Focus by The Cousin — أفضل أماكن التركيز والمذاكرة",
    template: "%s | Focus by The Cousin",
  },
  description: "دليلك لأفضل أماكن التركيز والمذاكرة خارج المنزل — المجمعة والرياض",
  metadataBase: new URL("https://focusbythecousin.com"),
  openGraph: {
    locale: "ar_SA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexArabic.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
