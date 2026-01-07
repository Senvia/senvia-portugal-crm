import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, ExternalLink, Globe, Code, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  // Demo data - will come from Supabase
  const publicApiKey = "pk_live_abc123xyz789";
  const publicFormUrl = `${window.location.origin}/p/form/${publicApiKey}`;
  const iframeCode = `<iframe src="${publicFormUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AppLayout userName="Carlos" organizationName="Premium Services">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie as integrações e configurações da sua conta
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Public Form Integration */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Integração - Formulário Público</CardTitle>
              </div>
              <CardDescription>
                Utilize este link ou código para captar leads diretamente da sua Landing Page ou website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Direct Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Link Direto do Formulário
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={publicFormUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(publicFormUrl, 'url')}
                  >
                    {copied === 'url' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(publicFormUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole este link diretamente em botões ou utilize-o em campanhas de marketing
                </p>
              </div>

              <Separator />

              {/* Embed Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Código de Incorporação (iframe)
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={iframeCode} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(iframeCode, 'iframe')}
                  >
                    {copied === 'iframe' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole este código HTML no seu website para incorporar o formulário
                </p>
              </div>

              <Separator />

              {/* API Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Chave API Pública
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={publicApiKey} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(publicApiKey, 'api')}
                  >
                    {copied === 'api' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Utilize esta chave para integrações personalizadas via API
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
              <CardDescription>
                Detalhes da sua organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Organização</span>
                <span className="font-medium">Premium Services</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plano</span>
                <Badge variant="secondary">Profissional</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Utilizadores</span>
                <span className="font-medium">3 / 10</span>
              </div>
            </CardContent>
          </Card>

          {/* GDPR Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-success" />
                Conformidade RGPD
              </CardTitle>
              <CardDescription>
                Estado de conformidade com a regulamentação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Consentimento em formulários</span>
                <Badge className="bg-success/10 text-success border-success/20">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Direito ao esquecimento</span>
                <Badge className="bg-success/10 text-success border-success/20">Disponível</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Política de privacidade</span>
                <Badge className="bg-success/10 text-success border-success/20">Configurada</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <a href="/privacy" className="hover:text-foreground hover:underline">
            Política de Privacidade
          </a>
          <span>•</span>
          <a href="/terms" className="hover:text-foreground hover:underline">
            Termos de Uso
          </a>
          <span>•</span>
          <a href="mailto:suporte@senvia.pt" className="hover:text-foreground hover:underline">
            Suporte
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
