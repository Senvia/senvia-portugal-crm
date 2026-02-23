import { Link } from "react-router-dom";

const COLUMNS = [
  {
    title: "Produto",
    links: [
      { label: "Funcionalidades", href: "#funcionalidades" },
      { label: "Preços", href: "#precos" },
      { label: "Para Quem", href: "#nichos" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre Nós", href: "#" },
      { label: "Contacto", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidade", href: "/privacy", route: true },
      { label: "Termos", href: "/terms", route: true },
    ],
  },
];

export function LandingFooter() {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800/50 py-12 md:py-16">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <img
              alt="SENVIA"
              className="h-8 w-32 object-contain mb-4"
              src="/lovable-uploads/a8233653-01d3-4e25-b107-7d7bd8806e79.png"
            />
            <p className="text-slate-500 text-sm leading-relaxed">
              CRM com IA e automação WhatsApp para empresas de serviços em Portugal.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-semibold mb-4 text-sm">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {"route" in link && link.route ? (
                      <Link to={link.href} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                        {link.label}
                      </Link>
                    ) : (
                      <button
                        onClick={() => scrollTo(link.href)}
                        className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Senvia. Todos os direitos reservados.
          </p>
          <p className="text-slate-600 text-xs">Feito com ❤️ em Portugal 🇵🇹</p>
        </div>
      </div>
    </footer>
  );
}
