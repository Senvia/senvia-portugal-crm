import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, HardHat, Home } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const NICHES = [
  {
    icon: Stethoscope,
    title: "Clínicas & Saúde",
    subtitle: "Dentistas, Estética, Capilar",
    ticket: "Ticket médio > 1.000€",
    scenario:
      'A rececionista está ao telefone. Chega um formulário do site. Com o Senvia, o paciente já recebeu uma mensagem de WhatsApp antes de desligar a chamada.',
  },
  {
    icon: HardHat,
    title: "Construção & Energia",
    subtitle: "Remodelações, Painéis Solares",
    ticket: "Ticket médio > 3.000€",
    scenario:
      "Um pedido de orçamento chega às 22h. O Senvia responde na hora, classifica o lead e no dia seguinte a equipa já sabe quem ligar primeiro.",
  },
  {
    icon: Home,
    title: "Imobiliárias",
    subtitle: "Mediação, Investimento",
    ticket: "Comissão > 5.000€",
    scenario:
      "Lead do Idealista preenche formulário. IA vê que quer comprar acima de 300k€. Classificado como Quente. WhatsApp enviado. Agente avisado.",
  },
];

export function NichesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="nichos" ref={ref} className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Desenhado para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              negócios de serviço
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {NICHES.map((n, i) => (
            <motion.div
              key={n.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <Card className="bg-slate-800/50 border-slate-700 hover:border-primary/40 transition-all h-full">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <n.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{n.title}</h3>
                  <p className="text-slate-500 text-xs mb-1">{n.subtitle}</p>
                  <p className="text-primary text-xs font-semibold mb-4">{n.ticket}</p>
                  <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700/30">
                    <p className="text-slate-300 text-sm leading-relaxed italic">"{n.scenario}"</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
