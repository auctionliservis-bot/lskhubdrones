import { Link } from "@tanstack/react-router";

export function BrandHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-hero-gradient flex items-center justify-center shadow-soft">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm tracking-tight">Lisakovsk HUB</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Drone &amp; AI Lab</div>
          </div>
        </Link>
        <Link
          to="/drone-lab/admin"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Админ
        </Link>
      </div>
    </header>
  );
}

export function BrandFooter() {
  return (
    <footer className="border-t border-border mt-16 py-8 text-center text-xs text-muted-foreground">
      <div className="container mx-auto px-4">
        © {new Date().getFullYear()} Lisakovsk HUB · Drone &amp; AI Lab · Цифровизация региона
      </div>
    </footer>
  );
}
