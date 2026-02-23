import { Zap, MessageSquare, Users } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const STEPS = [
  {
    num: 1,
    icon: Zap,
    title: "Capture",
    subtitle: "Receção & Análise por IA",
    desc: 'O lead preenche o formulário. A IA analisa as respostas e classifica automaticamente como Quente, Morno ou Frio.',
    color: "text-primary",
    bg: "bg-primary/10",
    line: "from-primary/50",
  },
  {
    num: 2,
    icon: MessageSquare,
    title: "Nurture",
    subtitle: "Primeiro Contacto Imediato",
    desc: "Em menos de 5 segundos, o lead recebe uma mensagem personalizada de WhatsApp — diferente para cada temperatura.",
    color: "text-green-400",
    bg: "bg-green-500/10",
    line: "from-green-500/50",
  },
  {
    num: 3,
    icon: Users,
    title: "Close",
    subtitle: "A Sua Equipa Fecha",
    desc: "O lead aparece no CRM Kanban já classificado. A equipa sabe quem é prioridade e assume a conversa.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    line: "",
  },
];

export function SolutionSteps() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="como-funciona" ref={ref} className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Como o{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Senvia OS
            </span>{" "}
            funciona
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            3 passos simples. Sem complexidade. Resultados desde o primeiro dia.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.2 }}
              className="relative text-center"
            >
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                {s.num}
              </div>
              <div className={`w-16 h-16 ${s.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                <s.icon className={`w-8 h-8 ${s.color}`} />
              </div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{s.title}</p>
              <h3 className="text-xl font-semibold text-white mb-3">{s.subtitle}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>

              {i < 2 && (
                <div className="hidden md:block absolute top-10 left-full w-full h-[2px] bg-gradient-to-r from-slate-600 to-transparent -translate-x-1/2" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
