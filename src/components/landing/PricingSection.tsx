import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface PlanFeature {
  label: string;
  starter: boolean;
  pro: boolean;
  elite: boolean;
}

const FEATURES: PlanFeature[] = [
  { label: "CRM Base (Leads + Clientes)", starter: true, pro: true, elite: true },
  { label: "Calendário & Propostas", starter: true, pro: true, elite: true },
  { label: "Formulários", starter: true, pro: true, elite: true },
  { label: "Meta Pixels", starter: true, pro: true, elite: true },
  { label: "Módulo Marketing", starter: false, pro: true, elite: true },
  { label: "Integração WhatsApp", starter: false, pro: true, elite: true },
  { label: "Módulo Vendas", starter: false, pro: true, elite: true },
  { label: "Módulo Financeiro", starter: false, pro: false, elite: true },
  { label: "Módulo E-commerce", starter: false, pro: false, elite: true },
  { label: "Faturação (InvoiceXpress)", starter: false, pro: false, elite: true },
  { label: "Stripe (Pagamentos)", starter: false, pro: false, elite: true },
];

const PLANS = [
  {
    name: "Starter",
    price: 49,
    users: "Até 10 utilizadores",
    forms: "2 formulários",
    highlighted: false,
    key: "starter" as const,
  },
  {
    name: "Pro",
    price: 99,
    users: "Até 15 utilizadores",
    forms: "5 formulários",
    highlighted: true,
    key: "pro" as const,
  },
  {
    name: "Elite",
    price: 147,
    users: "Utilizadores ilimitados",
    forms: "Formulários ilimitados",
    highlighted: false,
    key: "elite" as const,
  },
];

export function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="precos" ref={ref} className="py-16 md:py-24 bg-slate-900/50 border-y border-slate-800/50">
      <div className="container mx-auto px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Planos simples,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              resultados reais
            </span>
          </h2>
          <p className="text-slate-400">14 dias grátis em todos os planos. Sem cartão de crédito.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className={`relative rounded-2xl border p-6 ${
                plan.highlighted
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-slate-700 bg-slate-800/40"
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white border-0">
                  Mais Popular
                </Badge>
              )}

              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold text-white">{plan.price}€</span>
                <span className="text-slate-400 text-sm">/mês</span>
              </div>
              <p className="text-slate-500 text-xs mb-1">{plan.users}</p>
              <p className="text-slate-500 text-xs mb-6">{plan.forms}</p>

              <ul className="space-y-3 mb-6">
                {FEATURES.map((f) => {
                  const has = f[plan.key];
                  return (
                    <li key={f.label} className="flex items-center gap-2 text-sm">
                      {has ? (
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      )}
                      <span className={has ? "text-slate-300" : "text-slate-600"}>{f.label}</span>
                    </li>
                  );
                })}
              </ul>

              <Button
                variant={plan.highlighted ? "senvia" : "outline"}
                className={`w-full ${!plan.highlighted ? "border-slate-600 text-white hover:bg-slate-700" : ""}`}
                asChild
              >
                <Link to="/login?tab=signup">Começar Teste Grátis</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          Todos os planos incluem 14 dias grátis. Sem cartão de crédito. Cancele a qualquer momento.
        </p>
      </div>
    </section>
  );
}
