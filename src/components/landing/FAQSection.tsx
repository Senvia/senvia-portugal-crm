import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const FAQ_DATA = [
  { q: "O que é o Senvia OS?", a: "O Senvia OS é um sistema CRM com automação WhatsApp e Inteligência Artificial, desenhado especificamente para empresas de serviços high-ticket em Portugal, como clínicas, imobiliárias e empresas de construção." },
  { q: "Como funciona a automação de WhatsApp?", a: "Quando um lead preenche o seu formulário, o sistema analisa automaticamente as respostas com IA, classifica o potencial do cliente (Quente/Morno/Frio) e envia uma mensagem personalizada de WhatsApp em segundos." },
  { q: "Quanto custa o Senvia OS?", a: "O plano Starter começa em 49€/mês, o Pro em 99€/mês e o Elite em 147€/mês. Todos incluem 14 dias grátis sem cartão de crédito." },
  { q: "Para que tipo de empresas é indicado?", a: "O Senvia OS é ideal para empresas de serviços com ticket médio superior a 1.000€, como clínicas, imobiliárias, empresas de construção e energias renováveis." },
  { q: "Preciso de cartão de crédito para testar?", a: "Não. O teste grátis de 14 dias é completamente gratuito e não requer cartão de crédito. Basta registar-se e começar a usar." },
  { q: "Preciso de conhecimentos técnicos?", a: "Não. O Senvia OS é intuitivo e fácil de usar. Além disso, a nossa equipa ajuda na configuração inicial." },
  { q: "Como funciona a implementação?", a: "A implementação é feita pela nossa equipa e inclui configuração completa do CRM, formulários e automações de WhatsApp." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim. Não existe fidelização. Pode cancelar a sua subscrição a qualquer momento sem penalizações." },
  { q: "Funciona com o meu site atual?", a: "Sim. Basta adicionar o link do formulário Senvia ao seu site ou usar o formulário em landing pages externas." },
  { q: "Quanto tempo demora a configurar?", a: "A configuração base é feita em 24-48 horas. A equipa pode começar a usar imediatamente após o setup." },
  { q: "Os dados estão seguros?", a: "Sim. Todos os dados são alojados na União Europeia, em conformidade com o RGPD. Utilizamos encriptação e controlo de acessos rigoroso." },
  { q: "Como funciona o suporte?", a: "O suporte é feito em português, por email e WhatsApp. Respondemos em menos de 24 horas úteis." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-700/50 last:border-0">
      <button
        className="w-full py-4 flex items-center justify-between text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-white font-medium pr-4 text-sm sm:text-base">{q}</span>
        <ChevronDown className={`w-5 h-5 text-primary transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-96 pb-4" : "max-h-0"}`}>
        <p className="text-slate-400 text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export function FAQSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="faq" ref={ref} className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Perguntas{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              frequentes
            </span>
          </h2>
        </motion.div>

        <div className="max-w-3xl mx-auto bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          {FAQ_DATA.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        {/* FAQ Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ_DATA.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            }),
          }}
        />
      </div>
    </section>
  );
}
