import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Users, 
  MessageSquare, 
  BarChart3, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  Shield,
  Clock
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-lg sticky top-0 z-50 bg-slate-950/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">SENVIA</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#funcionalidades" className="text-sm text-slate-400 hover:text-white transition-colors">
              Funcionalidades
            </a>
            <a href="#precos" className="text-sm text-slate-400 hover:text-white transition-colors">
              Preços
            </a>
          </nav>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button className="bg-primary hover:bg-primary/90" asChild>
              <Link to="/login">Agendar Demo</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Mais de 50 empresas portuguesas confiam em nós
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              O Sistema Operativo das{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Empresas de Serviços
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              CRM inteligente com automação WhatsApp e relatórios em tempo real. 
              Ideal para Clínicas, Imobiliárias e Consultórios em Portugal.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-base px-8" asChild>
                <Link to="/login?tab=signup">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-base px-8" asChild>
                <Link to="/login">Ver Demonstração</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-24 border-t border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-slate-800 text-slate-300 border-slate-700">
              Funcionalidades
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Tudo o que precisa num só lugar
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Ferramentas poderosas para gerir leads, automatizar comunicação e analisar resultados.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-white">CRM Centralizado</CardTitle>
                <CardDescription className="text-slate-400">
                  Gerencie todos os contactos num só lugar com vista Kanban intuitiva.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Vista Kanban drag & drop
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Histórico completo
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Notas e tarefas
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                  <MessageSquare className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle className="text-white">Integração WhatsApp</CardTitle>
                <CardDescription className="text-slate-400">
                  Comunique instantaneamente com clientes através do WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Um clique para contactar
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Modelos de mensagem
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Histórico de conversas
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                  <BarChart3 className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle className="text-white">Relatórios em Tempo Real</CardTitle>
                <CardDescription className="text-slate-400">
                  Métricas e análises detalhadas para decisões informadas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-purple-500" />
                    Dashboard interativo
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-purple-500" />
                    Taxas de conversão
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-purple-500" />
                    Exportação de dados
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Poupe Tempo</h3>
              <p className="text-slate-400 text-sm">
                Automatize tarefas repetitivas e foque no que importa.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">100% Seguro</h3>
              <p className="text-slate-400 text-sm">
                Dados encriptados e conformidade com RGPD.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Fácil de Usar</h3>
              <p className="text-slate-400 text-sm">
                Interface intuitiva sem necessidade de formação.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-24 border-t border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-slate-800 text-slate-300 border-slate-700">
              Preços
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Planos simples e transparentes
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Escolha o plano ideal para o seu negócio. Sem custos ocultos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Basic Plan */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Básico</CardTitle>
                <CardDescription className="text-slate-400">
                  Ideal para pequenos negócios
                </CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold text-white">€49</span>
                  <span className="text-slate-400">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Até 500 leads
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    1 utilizador
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Formulário público
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Integração WhatsApp
                  </li>
                </ul>
                <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" asChild>
                  <Link to="/login?tab=signup">Começar</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-gradient-to-br from-primary/20 to-blue-600/20 border-primary/30 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary text-white">Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-white">Profissional</CardTitle>
                <CardDescription className="text-slate-300">
                  Para equipas em crescimento
                </CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold text-white">€99</span>
                  <span className="text-slate-300">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Leads ilimitados
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    5 utilizadores
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Relatórios avançados
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    API de integração
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Suporte prioritário
                  </li>
                </ul>
                <Button className="w-full bg-primary hover:bg-primary/90" asChild>
                  <Link to="/login?tab=signup">Começar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto para transformar o seu negócio?
            </h2>
            <p className="text-slate-400 mb-8 text-lg">
              Junte-se a dezenas de empresas portuguesas que já usam o Senvia para crescer.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-base px-8" asChild>
              <Link to="/login?tab=signup">
                Começar Agora
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
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
  );
}
