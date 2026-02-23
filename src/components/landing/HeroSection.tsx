import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";

const CHECKS = [
  "IA classifica leads automaticamente",
  "WhatsApp em menos de 5 segundos",
  "CRM visual para a sua equipa",
  "Conforme RGPD — dados na UE",
];

export function HeroSection() {
  return (
    <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              14 dias grátis · Sem cartão de crédito
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
              Os seus leads são atendidos em segundos.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Mesmo às 3 da manhã.
              </span>
            </h1>

            <ul className="space-y-3 mb-8 text-left mx-auto lg:mx-0 max-w-md">
              {CHECKS.map((c) => (
                <li key={c} className="flex items-center gap-3 text-slate-300 text-sm sm:text-base">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button variant="senvia" size="xl" asChild>
                <Link to="/login">
                  Testar Grátis 14 Dias
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="border-slate-600 text-slate-200 hover:bg-slate-800"
                onClick={() =>
                  document.querySelector("#como-funciona")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Ver Como Funciona
              </Button>
            </div>
          </motion.div>

          {/* Right - Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative w-[280px] sm:w-[320px]">
              <div className="bg-slate-800 rounded-[2.5rem] p-3 shadow-2xl border border-slate-700">
                <div className="bg-slate-900 rounded-[2rem] overflow-hidden">
                  <div className="bg-slate-800 px-6 py-2 flex justify-between items-center">
                    <span className="text-white text-xs">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-2 bg-white/50 rounded-sm" />
                      <div className="w-4 h-2 bg-white rounded-sm" />
                    </div>
                  </div>
                  <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Clínica Dr. João</p>
                      <p className="text-green-200 text-xs">online</p>
                    </div>
                  </div>
                  <div className="bg-[#0B141A] p-4 min-h-[280px] space-y-3">
                    <div className="bg-[#202C33] rounded-lg rounded-tl-none p-3 max-w-[85%]">
                      <p className="text-white text-sm">
                        Olá <strong>Carlos</strong>! 👋
                      </p>
                      <p className="text-white text-sm mt-1">
                        Recebemos o seu pedido sobre <strong>Implantes Dentários</strong>.
                      </p>
                      <p className="text-white text-sm mt-2">A nossa equipa vai contactá-lo em breve!</p>
                      <p className="text-slate-400 text-[10px] text-right mt-1">09:41</p>
                    </div>
                    <div className="bg-[#005C4B] rounded-lg rounded-tr-none p-3 max-w-[75%] ml-auto">
                      <p className="text-white text-sm">Obrigado! Aguardo contacto 🦷</p>
                      <p className="text-slate-300 text-[10px] text-right mt-1">09:41 ✓✓</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 inset-0 bg-gradient-to-br from-primary/30 to-green-500/20 blur-3xl scale-110" />
            </div>
          </motion.div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 md:mt-24 max-w-3xl mx-auto">
          {[
            { value: "< 5s", label: "Tempo de resposta" },
            { value: "100%", label: "Leads atendidos" },
            { value: "24/7", label: "Sem folgas" },
            { value: "0", label: "Leads perdidos" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">{m.value}</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
