import { useState } from "react";
import { CheckCircle2, Clipboard, ExternalLink, FileText, PlayCircle, Printer, Send, ShieldCheck } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const asset = (name: string) => `/tutorials/make-senvia/${name}`;

const facebookSteps = [
  {
    src: asset("facebook-new-lead.jpg"),
    title: "Escolher Facebook Lead Ads",
    description: "No primeiro modulo, pesquise por Facebook Lead Ads e selecione New Lead.",
  },
  {
    src: asset("facebook-add-module.jpg"),
    title: "Modulo New Lead",
    description: "Este sera o primeiro passo do scenario, responsavel por receber novos leads.",
  },
  {
    src: asset("facebook-config-webhook.jpg"),
    title: "Criar ou selecionar webhook",
    description: "No campo Webhook, clique em Add ou escolha uma ligacao ja existente.",
  },
  {
    src: asset("facebook-fields-select.jpg"),
    title: "Selecionar os campos",
    description: "Em Fields, selecione todos os campos disponiveis para enviar os dados completos.",
  },
  {
    src: asset("facebook-id-finder.jpg"),
    title: "Procurar a pagina",
    description: "Use o ID Finder para encontrar a pagina de Facebook pelo nome.",
  },
  {
    src: asset("facebook-form-select.jpg"),
    title: "Escolher o formulario",
    description: "Selecione o formulario de leads usado na campanha.",
  },
];

const checklist = [
  "Conta Make criada e com acesso ao Facebook correto.",
  "Scenario criado com o modulo Facebook Lead Ads > New Lead.",
  "Pagina de Facebook selecionada.",
  "Formulario certo selecionado.",
  "Todos os campos do formulario selecionados em Fields.",
  "Webhook de entrada copiado no SENVIA OS.",
  "Modulo HTTP configurado com Make a request.",
  "Pedido HTTP enviado por POST com body JSON.",
  "Lead de teste recebido no SENVIA OS.",
  "Scenario guardado e ativado.",
];

const payload = `{
  "name": "{{full_name}}",
  "email": "{{email}}",
  "phone": "{{phone_number}}",
  "company": "{{company_name}}",
  "source": "Facebook Lead Ads",
  "notes": "Lead recebido automaticamente pelo Make"
}`;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="secondary" onClick={copy} className="gap-2">
      <Clipboard className="h-4 w-4" />
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

function StepCard({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <article className="grid gap-5 rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm md:grid-cols-[72px_1fr] md:p-7">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-emerald-700/20 bg-emerald-50 text-lg font-black text-emerald-800">
        {number}
      </div>
      <div className="min-w-0">
        <h3 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h3>
        <div className="mt-3 space-y-4 text-slate-600">{children}</div>
      </div>
    </article>
  );
}

function ScreenshotCard({ src, title, description }: { src: string; title: string; description: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <img src={src} alt={title} className="aspect-video w-full object-contain" loading="lazy" />
      <figcaption className="border-t border-slate-200 bg-white p-3">
        <strong className="block text-sm text-slate-950">{title}</strong>
        <span className="mt-1 block text-sm text-slate-600">{description}</span>
      </figcaption>
    </figure>
  );
}

export default function TutorialMakeSenvia() {
  return (
    <>
      <SEO
        title="Tutorial Make + SENVIA OS"
        description="Guia para conectar Facebook Lead Ads ao SENVIA OS usando Make."
        canonical="/tutorial/make-senvia"
      />

      <main className="min-h-screen bg-[#f6f7f3] text-slate-950">
        <header className="border-b border-emerald-950/10 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">SENVIA OS</p>
              <h1 className="text-xl font-black tracking-tight">Tutorial Make + Facebook Lead Ads</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="gap-2">
                <a href="#passos">
                  <PlayCircle className="h-4 w-4" />
                  Ver passos
                </a>
              </Button>
              <Button type="button" className="gap-2 bg-emerald-700 hover:bg-emerald-800" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Imprimir PDF
              </Button>
            </div>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-700/20 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              Guia para configurar sozinho
            </p>
            <h2 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-6xl">
              Como enviar leads do Facebook para o SENVIA OS automaticamente.
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-slate-600">
              Sempre que uma pessoa preencher o formulario de lead no Facebook, o Make recebe esses dados e envia
              automaticamente para o SENVIA OS. Assim o lead entra no CRM sem copiar, colar ou importar ficheiros.
            </p>
          </div>

          <aside className="rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold">Fluxo da integracao</h3>
            <div className="mt-5 space-y-3">
              {[
                ["1", "Lead entra no Facebook", "O contacto preenche o formulario do anuncio."],
                ["2", "Make recebe os dados", "O scenario recolhe nome, email, telefone e campos extra."],
                ["3", "HTTP envia para o CRM", "O modulo Make a request envia um POST para o webhook."],
                ["4", "SENVIA OS cria o lead", "O lead aparece no pipeline definido pela equipa."],
              ].map(([number, title, description]) => (
                <div key={number} className="grid grid-cols-[40px_1fr] gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">{number}</span>
                  <span>
                    <strong className="block text-sm text-slate-950">{title}</strong>
                    <span className="block text-sm text-slate-600">{description}</span>
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-emerald-700/20 bg-emerald-50 p-5">
              <CheckCircle2 className="mb-3 h-6 w-6 text-emerald-700" />
              <h3 className="font-bold text-slate-950">O que vai ser configurado</h3>
              <p className="mt-2 text-sm text-slate-600">Facebook Lead Ads, Make e webhook de entrada do SENVIA OS.</p>
            </div>
            <div className="rounded-lg border border-amber-700/20 bg-amber-50 p-5">
              <FileText className="mb-3 h-6 w-6 text-amber-700" />
              <h3 className="font-bold text-slate-950">Antes de testar</h3>
              <p className="mt-2 text-sm text-slate-600">O formulario precisa existir e a conta Facebook deve ter acesso aos leads da pagina.</p>
            </div>
            <div className="rounded-lg border border-red-700/20 bg-red-50 p-5">
              <Send className="mb-3 h-6 w-6 text-red-700" />
              <h3 className="font-bold text-slate-950">Modulo correto no HTTP</h3>
              <p className="mt-2 text-sm text-slate-600">Use HTTP &gt; Make a request. Esse modulo envia os dados para o SENVIA OS.</p>
            </div>
          </div>
        </section>

        <section id="passos" className="mx-auto max-w-7xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Passo a passo</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Configurar o scenario no Make</h2>
            <p className="mt-4 text-slate-600">Siga os passos na ordem. No fim, execute um teste antes de deixar a automacao ativa.</p>
          </div>

          <StepCard number="01" title="Criar conta no Make">
            <p>
              Acesse{" "}
              <a href="https://us2.make.com/" target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline underline-offset-4">
                us2.make.com <ExternalLink className="inline h-3 w-3" />
              </a>
              , crie uma conta gratuita ou entre numa conta existente.
            </p>
            <p>Para teste, o plano gratuito costuma ser suficiente. Para uso continuo, recomenda-se um plano pago adequado ao volume de leads.</p>
          </StepCard>

          <StepCard number="02" title="Criar um scenario">
            <p>No menu lateral do Make, entre em Scenarios e clique em Create a new scenario.</p>
            <p>Depois clique no botao grande de adicionar modulo e escolha Facebook Lead Ads &gt; New Lead.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {facebookSteps.slice(0, 2).map((item) => (
                <ScreenshotCard key={item.src} {...item} />
              ))}
            </div>
          </StepCard>

          <StepCard number="03" title="Configurar o Facebook Lead Ads">
            <p>Autorize a conta Facebook que tem acesso a pagina e aos formularios de leads.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>No campo Webhook, clique em Add ou selecione um webhook existente.</li>
              <li>Em Fields, selecione todos os campos disponiveis.</li>
              <li>Use o ID Finder para procurar a pagina pelo nome.</li>
              <li>Selecione o formulario correto e clique em Save.</li>
            </ul>
            <div className="grid gap-4 md:grid-cols-2">
              {facebookSteps.slice(2).map((item) => (
                <ScreenshotCard key={item.src} {...item} />
              ))}
              <ScreenshotCard
                src={asset("facebook-fields-saved.jpg")}
                title="Campos guardados"
                description="Confirme que os campos aparecem preenchidos antes de guardar."
              />
              <ScreenshotCard
                src={asset("facebook-saving.jpg")}
                title="Guardar configuracao"
                description="Clique em Save para guardar o modulo Facebook Lead Ads."
              />
            </div>
          </StepCard>

          <StepCard number="04" title="Copiar o webhook no SENVIA OS">
            <p>No SENVIA OS, entre em Definicoes &gt; Integracoes &gt; Webhook de Entrada.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Crie ou abra o webhook que sera usado para receber leads.</li>
              <li>Defina a origem, pipeline ou responsavel conforme a configuracao da equipa.</li>
              <li>Copie o URL do webhook para usar no Make.</li>
            </ul>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-4 py-3">
                <strong className="text-sm">Formato do URL</strong>
                <CopyButton value="https://SEU-SUPABASE/functions/v1/submit-lead?mode=webhook&token=SEU_TOKEN" />
              </div>
              <pre className="overflow-x-auto p-4 text-sm text-emerald-50">
                <code>https://SEU-SUPABASE/functions/v1/submit-lead?mode=webhook&amp;token=SEU_TOKEN</code>
              </pre>
            </div>
          </StepCard>

          <StepCard number="05" title="Adicionar o modulo HTTP">
            <p>Clique em Add module depois do modulo Facebook Lead Ads. Pesquise por HTTP e selecione o app HTTP.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <ScreenshotCard
                src={asset("facebook-app-starred.jpg")}
                title="Adicionar o segundo modulo"
                description="Clique no botao de adicionar modulo a seguir ao Facebook Lead Ads."
              />
              <ScreenshotCard
                src={asset("make-http-search.jpg")}
                title="Selecionar HTTP"
                description="Na pesquisa, escolha o app HTTP."
              />
            </div>
          </StepCard>

          <StepCard number="06" title="Escolher Make a request">
            <p>Dentro do app HTTP, selecione Make a request. Este e o modulo que envia dados por POST para o SENVIA OS.</p>
            <ScreenshotCard
              src={asset("make-http-module.jpg")}
              title="Modulo HTTP correto"
              description="Use Make a request para enviar o lead. Nao use Resolve URL para esta integracao."
            />
          </StepCard>

          <StepCard number="07" title="Configurar o pedido HTTP">
            <p>No modulo HTTP, configure os campos principais desta forma:</p>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-950">
                <span className="p-3">Campo</span>
                <span className="p-3">Valor</span>
              </div>
              {[
                ["Method", "POST"],
                ["URL", "URL copiado no SENVIA OS"],
                ["Headers", "Content-Type: application/json"],
                ["Body type", "Raw ou JSON, conforme aparecer na conta Make"],
              ].map(([field, value]) => (
                <div key={field} className="grid grid-cols-2 border-b border-slate-100 text-sm last:border-b-0">
                  <span className="p-3 font-semibold text-slate-950">{field}</span>
                  <span className="p-3 text-slate-600">{value}</span>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-4 py-3">
                <strong className="text-sm">Exemplo de JSON</strong>
                <CopyButton value={payload} />
              </div>
              <pre className="overflow-x-auto p-4 text-sm text-emerald-50">
                <code>{payload}</code>
              </pre>
            </div>
            <p>Ao preencher o JSON, substitua cada campo entre chavetas pelos dados reais vindos do modulo Facebook Lead Ads.</p>
          </StepCard>

          <StepCard number="08" title="Testar e ativar">
            <p>Clique em Run once no Make e envie um lead de teste pelo formulario do Facebook.</p>
            <ScreenshotCard
              src={asset("make-waiting-save.jpg")}
              title="Aguardar lead de teste"
              description="Quando aparecer Waiting for data, envie um teste para confirmar que o scenario recebe os dados."
            />
            <ul className="list-disc space-y-2 pl-5">
              <li>Confirme se o modulo Facebook recebeu os dados.</li>
              <li>Confirme se o modulo HTTP respondeu com sucesso.</li>
              <li>Abra o SENVIA OS e verifique se o lead apareceu no CRM.</li>
              <li>Depois do teste, guarde e ative o scenario.</li>
            </ul>
          </StepCard>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.78fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Checklist final</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {checklist.map((item) => (
                  <label key={item} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <input type="checkbox" className="mt-1 accent-emerald-700" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-emerald-700/20 bg-emerald-50 p-5 md:p-7">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Explicacao simples</h2>
              <p className="mt-4 text-slate-700">
                O formulario continua igual para quem preenche. A diferenca e que, assim que uma pessoa envia os dados,
                o Make recebe essa informacao e envia automaticamente para o SENVIA OS. O lead fica criado no CRM sem
                trabalho manual.
              </p>
              <div className="mt-5">
                <CopyButton value="Sempre que alguem preencher o formulario, o Make vai recolher os dados e envia-los automaticamente para o SENVIA OS. O lead fica criado no CRM sem ser necessario copiar, colar ou importar ficheiros." />
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
