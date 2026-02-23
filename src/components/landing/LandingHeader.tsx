import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Preços", href: "#precos" },
  { label: "Para Quem", href: "#nichos" },
  { label: "FAQ", href: "#faq" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex-shrink-0">
          <img
            alt="SENVIA"
            className="h-9 w-36 object-contain"
            src="/lovable-uploads/a8233653-01d3-4e25-b107-7d7bd8806e79.png"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" className="text-slate-300 hover:text-white" asChild>
            <Link to="/login">Área do Cliente</Link>
          </Button>
          <Button variant="senvia" size="sm" asChild>
            <Link to="/login">Testar Grátis</Link>
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 text-slate-300"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-slate-950/98 backdrop-blur-xl z-40 animate-fade-in">
          <nav className="flex flex-col p-6 gap-4">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="text-lg text-slate-200 hover:text-white py-3 border-b border-slate-800 text-left"
              >
                {l.label}
              </button>
            ))}
            <div className="flex flex-col gap-3 mt-6">
              <Button variant="outline" className="w-full border-slate-600 text-white" asChild>
                <Link to="/login">Área do Cliente</Link>
              </Button>
              <Button variant="senvia" className="w-full" asChild>
                <Link to="/login">Testar Grátis 14 Dias</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
