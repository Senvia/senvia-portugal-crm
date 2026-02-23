import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  MessageCircle,
  Brain,
  FileText,
  Mail,
  Calendar,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const FEATURES = [
  { icon: LayoutGrid, title: "CRM Visual Kanban", desc: "Arraste leads entre etapas personalizáveis do seu funil.", badge: null },
  { icon: MessageCircle, title: "Automação WhatsApp", desc: "Mensagens automáticas em menos de 5 segundos.", badge: null },
  { icon: Brain, title: "Classificação por IA", desc: "Leads classificados como Quente, Morno ou Frio.", badge: null },
  { icon: FileText, title: "Formulários", desc: "Tradicional e conversacional para captação de leads.", badge: null },
  { icon: Mail, title: "Marketing", desc: "Campanhas de email, templates e listas segmentadas.", badge: "Pro" },
  { icon: Calendar, title: "Calendário", desc: "Agendamentos, follow-ups e eventos associados.", badge: null },
  { icon: Receipt, title: "Financeiro", desc: "Faturas, pagamentos, despesas e integração com InvoiceXpress.", badge: "Elite" },
  { icon: ShoppingBag, title: "E-commerce", desc: "Loja online, produtos, encomendas e gestão de stock.", badge: "Elite" },
];

export function FeaturesGrid() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Tudo o que precisa.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Num só lugar.
            </span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                {f.badge && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/25">
                    {f.badge}
                  </Badge>
                )}
              </div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
