import { SiteHeader } from "@/components/layout/site-header";
import { LocalizedHero } from "@/features/home/localized-hero";

export default function Home() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background text-foreground">
      <video
        className="absolute inset-0 z-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      <div className="relative z-10 flex min-h-screen w-full flex-col">
        <SiteHeader />

        <LocalizedHero />
      </div>
    </div>
  );
}
