import { Button } from "@/components/ui/button";

const navigation = ["Home", "Places", "About", "Journal", "Reach Us"] as const;

export function SiteHeader() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl flex-row items-center justify-between px-5 py-6 sm:px-8">
      <a
        href="#main-content"
        className="text-2xl tracking-tight text-foreground sm:text-3xl"
        style={{ fontFamily: '"Instrument Serif", serif' }}
      >
        Focus by The Cousin<sup className="text-xs">®</sup>
      </a>

      <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
        {navigation.map((item, index) => (
          <a
            key={item}
            href={index === 0 ? "#main-content" : `#${item.toLowerCase().replace(" ", "-")}`}
            aria-current={index === 0 ? "page" : undefined}
            className={`text-sm transition-colors ${
              index === 0 ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item}
          </a>
        ))}
      </nav>

      <Button className="liquid-glass rounded-full px-4 py-2.5 text-sm whitespace-nowrap text-foreground transition-transform duration-300 hover:scale-[1.03] sm:px-6">
        Begin Journey
      </Button>
    </header>
  );
}
