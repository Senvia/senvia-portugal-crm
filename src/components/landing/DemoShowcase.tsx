import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, BarChart3, Calendar, Mail, Receipt } from "lucide-react";
import { motion, useInView } from "framer-motion";

const TABS = [
  {
    id: "crm",
    label: "CRM Kanban",
    icon: LayoutGrid,
    badge: null,
    bullets: [
      "Arraste leads entre etapas personalizáveis",
      "Visualize o pipeline completo num relance",
      "Clique para abrir detalhes e histórico",
    ],
    gradient: "from-primary/20 to-blue-600/10",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    badge: null,
    bullets: [
      "Métricas de vendas em tempo real",
      "Gráficos de conversão e funil",
      "Filtros por equipa e período",
    ],
    gradient: "from-green-500/20 to-emerald-600/10",
  },
  {
    id: "calendar",
    label: "Calendário",
    icon: Calendar,
    badge: null,
    bullets: [
      "Agendamentos e follow-ups automáticos",
      "Vista diária, semanal e mensal",
      "Associe eventos a leads e clientes",
    ],
    gradient: "from-purple-500/20 to-violet-600/10",
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Mail,
    badge: "Pro",
    bullets: [
      "Campanhas de email com templates",
      "Listas de contactos segmentadas",
      "Relatórios de abertura e cliques",
    ],
    gradient: "from-orange-500/20 to-amber-600/10",
  },
  {
    id: "finance",
    label: "Financeiro",
    icon: Receipt,
    badge: "Elite",
    bullets: [
      "Faturas, pagamentos e despesas",
      "Integração com InvoiceXpress",
      "Relatórios financeiros completos",
    ],
    gradient: "from-cyan-500/20 to-teal-600/10",
  },
];

export function DemoShowcase() {
  const [active, setActive] = useState("crm");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <section id="funcionalidades" ref={ref} className="py-16 md:py-24 bg-slate-900/50 border-y border-slate-800/50">
      <div className="container mx-auto px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Veja o Senvia OS{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              em ação
            </span>
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 mb-8 justify-start md:justify-center">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                active === t.id
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge && (
                <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">
                  {t.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`max-w-4xl mx-auto rounded-2xl border border-slate-700/50 bg-gradient-to-br ${tab.gradient} p-8 md:p-12`}
        >
          <div className="flex items-center gap-3 mb-6">
            <tab.icon className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-semibold text-white">{tab.label}</h3>
            {tab.badge && (
              <Badge className="bg-primary/20 text-primary border-primary/30">{tab.badge}</Badge>
            )}
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700/30 p-6 mb-6 min-h-[200px] flex items-center justify-center">
            <div className="text-center">
              <tab.icon className="w-16 h-16 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Módulo {tab.label} do Senvia OS</p>
            </div>
          </div>

          <ul className="space-y-3">
            {tab.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-slate-300 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
