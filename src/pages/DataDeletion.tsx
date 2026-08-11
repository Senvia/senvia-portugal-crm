import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

// Página exigida pela Meta no campo "Data Deletion Instructions URL" da revisão
// de apps. Tem de ser pública (sem login) e dizer explicitamente como pedir a
// eliminação — a política de privacidade sozinha costuma ser rejeitada por não
// ser dedicada ao assunto.
//
// A secção em inglês existe de propósito: os revisores da Meta são
// internacionais e avaliam a página sem tradutor.
export default function DataDeletion() {
  return (
    <>
      <SEO
        title="Eliminação de Dados"
        description="Como solicitar a eliminação dos seus dados do Senvia OS, incluindo dados provenientes do WhatsApp, Instagram e Messenger."
        canonical="/data-deletion"
      />
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <Link to="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>

          <article className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-foreground">Eliminação de Dados</h1>
            <p className="text-muted-foreground">Última atualização: Agosto 2026</p>

            <section className="mt-8 space-y-6 text-foreground">
              <div>
                <h2 className="text-xl font-semibold">1. Que dados guardamos</h2>
                <p className="text-muted-foreground">
                  O Senvia OS é um CRM utilizado por empresas para gerir a relação com os seus
                  clientes. Quando uma empresa liga um canal do WhatsApp, Instagram ou Messenger,
                  passamos a guardar as mensagens trocadas nesse canal, o nome e a fotografia de
                  perfil públicos do contacto, e o identificador da conversa. Guardamos ainda os
                  dados que a empresa registe sobre o contacto, como nome, email, telefone e notas.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold">2. Como pedir a eliminação</h2>
                <p className="text-muted-foreground">
                  Envie um email para <strong>privacidade@senvia.pt</strong> com o assunto
                  “Eliminação de dados”, indicando o número de telefone ou o nome de utilizador da
                  rede social associado à conversa. Precisamos dessa informação para identificar os
                  seus dados com segurança e não eliminar os de outra pessoa.
                </p>
                <p className="text-muted-foreground">
                  Se é cliente do Senvia OS e pretende eliminar a conta da sua empresa e todos os
                  dados nela contidos, use o mesmo endereço a partir do email da conta.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold">3. O que é eliminado e em quanto tempo</h2>
                <p className="text-muted-foreground">
                  Eliminamos permanentemente as mensagens, os dados de perfil recolhidos das
                  plataformas da Meta e os registos de contacto associados. A eliminação é concluída
                  no prazo máximo de 30 dias após a confirmação do pedido, e é irreversível.
                </p>
                <p className="text-muted-foreground">
                  Poderemos reter durante mais tempo apenas os dados que a lei nos obrigue a
                  conservar, como registos de faturação, nos termos da legislação fiscal portuguesa.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold">4. Desligar um canal</h2>
                <p className="text-muted-foreground">
                  A empresa pode desligar um canal do WhatsApp, Instagram ou Messenger a qualquer
                  momento nas definições da sua conta. Desligar o canal interrompe imediatamente a
                  recolha de novas mensagens, mas não elimina o histórico já recolhido — para isso é
                  necessário fazer o pedido descrito no ponto 2.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-5">
                <h2 className="text-xl font-semibold">Data Deletion Instructions (English)</h2>
                <p className="mt-2 text-muted-foreground">
                  Senvia OS is a CRM used by businesses to manage customer relationships. When a
                  business connects a WhatsApp, Instagram or Messenger channel, we store the
                  messages exchanged on that channel, the contact’s public profile name and picture,
                  the conversation identifier, and any contact details the business records.
                </p>
                <p className="mt-3 text-muted-foreground">
                  To request deletion of your data, email <strong>privacidade@senvia.pt</strong> with
                  the subject “Data deletion”, including the phone number or social media username
                  associated with the conversation. We need this to identify your data safely.
                </p>
                <p className="mt-3 text-muted-foreground">
                  We permanently delete the messages, the profile data collected from Meta
                  platforms, and the associated contact records within 30 days of confirming the
                  request. Deletion is irreversible. We only retain data for longer where Portuguese
                  law requires it, such as invoicing records.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold">5. Contacto</h2>
                <p className="text-muted-foreground">
                  Encarregado de Proteção de Dados: <strong>privacidade@senvia.pt</strong>. Consulte
                  também a nossa{" "}
                  <Link to="/privacy" className="text-primary underline">
                    Política de Privacidade
                  </Link>
                  .
                </p>
              </div>
            </section>
          </article>

          <footer className="mt-12 border-t pt-6 text-center text-sm text-muted-foreground">
            <p>© 2026 Senvia OS. Todos os direitos reservados.</p>
          </footer>
        </div>
      </div>
    </>
  );
}
