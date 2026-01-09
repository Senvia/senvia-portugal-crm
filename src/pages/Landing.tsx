import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { 
  CheckCircle, 
  Clock,
  MessageSquare,
  HelpCircle,
  Zap,
  Users,
  Stethoscope,
  HardHat,
  Home,
  ArrowDown,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import senviaLogo from "@/assets/senvia-logo-mobile.png";

// FAQ Data for SEO
const faqData = [
  {
    question: "O que é o Senvia OS?",
    answer: "O Senvia OS é um sistema CRM com automação WhatsApp e Inteligência Artificial, desenhado especificamente para empresas de serviços high-ticket em Portugal, como clínicas, imobiliárias e empresas de construção."
  },
  {
    question: "Como funciona a automação de WhatsApp?",
    answer: "Quando um lead preenche o seu formulário, o sistema analisa automaticamente as respostas com IA, classifica o potencial do cliente (Quente/Morno/Frio) e envia uma mensagem personalizada de WhatsApp em segundos, garantindo que nenhum lead fica sem resposta."
  },
  {
    question: "Quanto custa o Senvia OS?",
    answer: "O Senvia OS tem uma taxa de implementação única de 1.200€ que inclui landing page, configuração completa e formação. Depois, paga apenas 150€/mês que inclui hospedagem, custos de API e suporte contínuo."
  },
  {
    question: "Para que tipo de empresas é indicado?",
    answer: "O Senvia OS é ideal para empresas de serviços com ticket médio superior a 1.000€, como clínicas (dentárias, estética, capilar), imobiliárias, empresas de construção, remodelações e energias renováveis."
  }
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-slate-700 last:border-0">
      <button
        className="w-full py-5 flex items-center justify-between text-left"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="text-white font-medium pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-primary transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}>
        <p className="text-slate-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

const CONVERSATIONAL_FORM_URL = "https://senvia-portugal-crm.lovable.app/c/c2f636c7-a29a-46ec-9563-db2b14ac5c6e";

function ConversationalFormButton() {
  return (
    <Button 
      size="lg" 
      className="bg-[#25D366] hover:bg-[#22c55e] text-white text-base px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all"
      asChild
    >
      <a href={CONVERSATIONAL_FORM_URL} target="_blank" rel="noopener noreferrer">
        <MessageSquare className="mr-2 w-5 h-5" />
        RECEBER MENSAGEM DE TESTE
        <ExternalLink className="ml-2 w-4 h-4" />
      </a>
    </Button>
  );
}

export default function Landing() {
  const scrollToContacto = () => {
    const element = document.getElementById('contacto');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <SEO 
        canonical="/"
        title="CRM com Automação WhatsApp e IA para Empresas em Portugal"
        description="Senvia OS - Sistema de gestão de leads com automação WhatsApp e IA. Ideal para clínicas, imobiliárias e construção. Resposta automática em segundos."
      />
      
      {/* FAQ Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqData.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      })}} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header - Simple & Clean */}
      <header className="border-b border-slate-800/50 backdrop-blur-lg sticky top-0 z-50 bg-slate-950/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/">
            <img src={senviaLogo} alt="SENVIA" className="h-10 w-40 object-contain" />
          </Link>
          
          <Button variant="outline" className="border-primary/50 bg-primary/10 text-white hover:bg-primary/20 hover:border-primary" asChild>
            <Link to="/login">Área do Cliente</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section - A Promessa Real */}
      <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Copy */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Não deixe o lead esperar enquanto a sua equipa está{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                  ocupada.
                </span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-4 leading-relaxed">
                O Senvia OS recebe o lead do seu site, a IA analisa o potencial (<strong className="text-green-400">Quente</strong>/<strong className="text-blue-400">Frio</strong>) e envia imediatamente a primeira mensagem de WhatsApp.
              </p>
              
              <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                <strong className="text-primary">O Resultado:</strong> O cliente sente-se atendido na hora, e a sua equipa já recebe o lead organizado no nosso CRM para continuar a conversa.
              </p>
              
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-base px-6 sm:px-8 py-6 h-auto text-sm sm:text-base"
                onClick={scrollToContacto}
              >
                QUERO ORGANIZAR O MEU ATENDIMENTO
                <ArrowDown className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* Right - Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-[280px] sm:w-[320px]">
                {/* Phone Frame */}
                <div className="bg-slate-800 rounded-[2.5rem] p-3 shadow-2xl border border-slate-700">
                  {/* Phone Screen */}
                  <div className="bg-slate-900 rounded-[2rem] overflow-hidden">
                    {/* Status Bar */}
                    <div className="bg-slate-800 px-6 py-2 flex justify-between items-center">
                      <span className="text-white text-xs">9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 bg-white/50 rounded-sm"></div>
                        <div className="w-4 h-2 bg-white rounded-sm"></div>
                      </div>
                    </div>
                    
                    {/* WhatsApp Header */}
                    <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Clínica Dr. João</p>
                        <p className="text-green-200 text-xs">online</p>
                      </div>
                    </div>
                    
                    {/* Chat Messages */}
                    <div className="bg-[#0B141A] p-4 min-h-[280px] space-y-3">
                      {/* Incoming Message */}
                      <div className="bg-[#202C33] rounded-lg rounded-tl-none p-3 max-w-[85%] animate-fade-in">
                        <p className="text-white text-sm">
                          Olá <strong>Carlos</strong>! 👋
                        </p>
                        <p className="text-white text-sm mt-1">
                          Recebemos o seu pedido de informação sobre <strong>Implantes Dentários</strong>.
                        </p>
                        <p className="text-white text-sm mt-2">
                          A nossa equipa vai contactá-lo em breve!
                        </p>
                        <p className="text-slate-400 text-[10px] text-right mt-1">09:41</p>
                      </div>
                      
                      {/* Outgoing Message */}
                      <div className="bg-[#005C4B] rounded-lg rounded-tr-none p-3 max-w-[75%] ml-auto">
                        <p className="text-white text-sm">Obrigado! Aguardo contacto 🦷</p>
                        <p className="text-slate-300 text-[10px] text-right mt-1">09:41 ✓✓</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Glow effect behind phone */}
                <div className="absolute -z-10 inset-0 bg-gradient-to-br from-primary/30 to-green-500/20 blur-3xl scale-110"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* O Problema - Caos e Cegueira */}
      <section className="py-16 md:py-24 bg-slate-900/50 border-y border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              O seu WhatsApp atual é uma{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                confusão?
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Leads Misturados */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-red-500/50 transition-colors group">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-red-500/20 transition-colors">
                  <MessageSquare className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Leads Misturados</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Leads misturados com mensagens pessoais e <strong className="text-red-400">grupos de família</strong>.
                </p>
              </CardContent>
            </Card>

            {/* Sem Visibilidade */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-orange-500/50 transition-colors group">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-500/20 transition-colors">
                  <HelpCircle className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Sem Visibilidade</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Você não sabe quem veio do <strong className="text-orange-400">anúncio de hoje</strong> ou quem é apenas curioso.
                </p>
              </CardContent>
            </Card>

            {/* O Vácuo */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-yellow-500/50 transition-colors group sm:col-span-2 md:col-span-1 sm:max-w-md sm:mx-auto md:max-w-none">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-500/20 transition-colors">
                  <Clock className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">O Vácuo</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  O lead preenche o formulário e fica no <strong className="text-yellow-400">"vácuo"</strong> até alguém ver o email.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Como o Senvia OS Funciona - Workflow Real */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Como o{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Senvia OS Funciona
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Passo 1 - Receção & Análise */}
            <div className="relative">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Receção & Análise</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  O lead preenche o formulário. O nosso sistema lê as respostas e coloca uma <strong className="text-primary">"Etiqueta de Temperatura"</strong> (Quente, Morno, Frio).
                </p>
              </div>
              {/* Connector Line - Hidden on mobile */}
              <div className="hidden md:block absolute top-10 left-full w-full h-[2px] bg-gradient-to-r from-primary/50 to-transparent -translate-x-1/2"></div>
            </div>

            {/* Passo 2 - Primeiro Contacto Imediato */}
            <div className="relative">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Primeiro Contacto Imediato</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  O sistema envia uma <strong className="text-green-400">mensagem automática personalizada</strong> (diferente para cada temperatura) para garantir que o cliente sabe que foi recebido.
                </p>
              </div>
              {/* Connector Line - Hidden on mobile */}
              <div className="hidden md:block absolute top-10 left-full w-full h-[2px] bg-gradient-to-r from-green-500/50 to-transparent -translate-x-1/2"></div>
            </div>

            {/* Passo 3 - A Sua Vez (Gestão) */}
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">A Sua Vez (Gestão)</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                O lead cai no <strong className="text-purple-400">Painel Senvia (CRM)</strong> já classificado. A sua equipa entra, vê quem é Prioridade e assume a conversa humana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Para Quem É - Segmentação */}
      <section className="py-16 md:py-24 bg-slate-900/50 border-y border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Desenhado para{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Negócios de Serviço.
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Clínicas & Saúde */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
              <CardContent className="pt-6">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Stethoscope className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Clínicas & Saúde</h3>
                <p className="text-slate-500 text-xs mb-2">Dentistas, Estética, Capilar</p>
                <p className="text-slate-400 text-sm">
                  Não perca pacientes de implantes de <strong className="text-white">alto valor</strong>.
                </p>
              </CardContent>
            </Card>

            {/* Construção & Reformas */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10">
              <CardContent className="pt-6">
                <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
                  <HardHat className="w-7 h-7 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Construção & Reformas</h3>
                <p className="text-slate-500 text-xs mb-2">Obras, Remodelações, Energias</p>
                <p className="text-slate-400 text-sm">
                  Filtre quem quer <strong className="text-white">orçamento real</strong> de quem só está a sonhar.
                </p>
              </CardContent>
            </Card>

            {/* Imobiliária */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-green-500/50 transition-all hover:shadow-lg hover:shadow-green-500/10 sm:col-span-2 md:col-span-1 sm:max-w-md sm:mx-auto md:max-w-none">
              <CardContent className="pt-6">
                <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Home className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Imobiliária</h3>
                <p className="text-slate-500 text-xs mb-2">Agentes, Mediação, Consultores</p>
                <p className="text-slate-400 text-sm">
                  Atenda quem quer <strong className="text-white">visitar casas agora</strong>.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* O Que Está Incluído - Features Reais */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                O que está incluído na{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                  Implementação Senvia OS?
                </span>
              </h2>
            </div>

            <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6 sm:p-8 md:p-10">
              <ul className="space-y-4 sm:space-y-5">
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <span className="text-white font-medium">CRM Próprio (Senvia OS)</span>
                    <span className="text-slate-500 text-sm ml-2">— Um painel visual (Kanban) para gerir os seus leads num só lugar.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <span className="text-white font-medium">Classificação por Formulário</span>
                    <span className="text-slate-500 text-sm ml-2">— A IA lê o que o cliente respondeu e diz-lhe o potencial de compra antes de você dizer "olá".</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <span className="text-white font-medium">Disparo de WhatsApp</span>
                    <span className="text-slate-500 text-sm ml-2">— Envio da mensagem de abertura via API (sem depender do telemóvel estar ligado).</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <span className="text-white font-medium">Landing Page & Formulário</span>
                    <span className="text-slate-500 text-sm ml-2">— Nós entregamos a página de captura pronta a usar.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-slate-900/50 border-y border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                Perguntas{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                  Frequentes
                </span>
              </h2>
              <p className="text-slate-400">
                Tudo o que precisa saber sobre o Senvia OS
              </p>
            </div>

            <div className="bg-slate-800/30 border border-slate-700 rounded-2xl px-6 sm:px-8">
              {faqData.map((item, index) => (
                <FAQItem key={index} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final - Botão com Popup */}
      <section id="contacto" className="py-16 md:py-24 bg-gradient-to-b from-slate-900/50 to-slate-950 border-t border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Pronto para{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                organizar o seu atendimento?
              </span>
            </h2>
            <p className="text-slate-400 mb-8">
              Teste o sistema agora e receba uma mensagem automática no seu WhatsApp.
            </p>
            
            <ConversationalFormButton />
            
            <p className="text-slate-500 text-xs mt-6">
              Os seus dados estão seguros. Respeitamos a sua privacidade.
            </p>
          </div>
        </div>
      </section>

      {/* Footer - Minimalista */}
      <footer className="border-t border-slate-800/50 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src={senviaLogo} alt="SENVIA" className="w-8 h-8 object-contain rounded-lg" />
              <span className="text-lg font-bold text-white tracking-tight">SENVIA</span>
            </div>
            
            <nav className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">
                Política de Privacidade
              </Link>
              <Link to="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
                Termos de Uso
              </Link>
            </nav>
            
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Senvia. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
