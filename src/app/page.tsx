import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

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

        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center px-6 py-[90px] text-center"
        >
          <h1
            className="animate-fade-rise max-w-7xl text-5xl leading-[0.95] font-normal tracking-[-2.46px] sm:text-7xl md:text-8xl"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            Where <em className="not-italic text-muted-foreground">focus</em> rises{" "}
            <em className="not-italic text-muted-foreground">through the silence.</em>
          </h1>

          <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            We find places made for deep thinkers, ambitious students, and focused work. Amid the
            noise, discover the cafés, libraries, and spaces where your best work can begin.
          </p>

          <Button className="liquid-glass animate-fade-rise-delay-2 mt-12 cursor-pointer rounded-full px-14 py-5 text-base text-foreground transition-transform duration-300 hover:scale-[1.03]">
            Find Your Place
          </Button>
        </main>
      </div>
    </div>
  );
}
