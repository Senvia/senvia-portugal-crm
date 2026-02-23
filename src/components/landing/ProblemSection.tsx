import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, HelpCircle, Clock } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const PROBLEMS = [
  {
    icon: MessageSquare,
    title: "Leads Misturados",
    desc: "Leads misturados com mensagens pessoais e grupos de família.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    hover: "hover:border-red-500/50",
  },
  {
    icon: HelpCircle,
    title: "Sem Visibilidade",
    desc: "Não sabe quem veio do anúncio de hoje ou quem é apenas curioso.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    hover: "hover:border-orange-500/50",
  },
  {
    icon: Clock,
    title: "O Vácuo",
    desc: 'O lead preenche o formulário e fica no "vácuo" até alguém ver o email.',
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    hover: "hover:border-yellow-500/50",
  },
];

export function ProblemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-24 bg-slate-900/50 border-y border-slate-800/50">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Reconhece-se nesta{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              situação?
            </span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <Card className={`bg-slate-800/50 border-slate-700 ${p.hover} transition-colors group h-full`}>
                <CardContent className="pt-6 text-center">
                  <div className={`w-16 h-16 ${p.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <p.icon className={`w-8 h-8 ${p.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{p.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
