import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Ligar o WhatsApp pelo assistente da Meta (Embedded Signup).
 *
 * Porque é que isto não é um `window.open` como o Instagram: o assistente do
 * WhatsApp é alojado pela Meta e SÓ funciona lançado pelo SDK dela. Abri-lo como
 * um link solto mostra o primeiro ecrã e o botão "Começar" não faz nada — volta
 * ao início, sem erro nenhum. Foi o que aconteceu.
 *
 * O SDK dá-nos duas coisas ao mesmo tempo:
 *   - um `code`, que o servidor troca por token (nunca passa pelo browser)
 *   - o `waba_id` e o `phone_number_id` DA CONTA QUE A PESSOA ESCOLHEU no
 *     assistente
 *
 * O segundo ponto é o que fecha o buraco que ligou a conta de um cliente à
 * caixa da agência: já não se adivinha a conta a partir das permissões — ela vem
 * dita pelo próprio assistente.
 */

interface SessaoWhatsApp {
  waba_id?: string;
  phone_number_id?: string;
  business_id?: string;
}

declare global {
  interface Window {
    FB?: {
      init: (o: Record<string, unknown>) => void;
      login: (cb: (r: { authResponse?: { code?: string } }) => void, o: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

/** Carrega o SDK uma vez e devolve quando estiver pronto a usar. */
function carregarSdk(appId: string, versao: string): Promise<void> {
  if (window.FB) return Promise.resolve();
  return new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version: versao });
      resolve();
    };
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/en_US/sdk.js';
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.onerror = () => reject(new Error('Não foi possível carregar o SDK da Meta. Alguma extensão do browser pode estar a bloqueá-lo.'));
    document.body.appendChild(s);
  });
}

export function useWhatsAppSignup() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ label }: { label?: string }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');

      // 1. Os ids da app e da configuração — não são segredos, mas vêm do
      //    servidor para não haver duas fontes de verdade.
      const { data: params, error: pErr } = await supabase.functions.invoke('meta-connect', {
        body: { action: 'whatsapp_params', organization_id: organization.id },
      });
      if (pErr) {
        let detail = '';
        try {
          const b = await (pErr as { context?: Response }).context?.json();
          detail = b?.error ?? '';
        } catch { /* corpo não era JSON */ }
        throw new Error(detail || (pErr as Error).message);
      }
      const { app_id, config_id, graph_version } = params as {
        app_id: string; config_id: string; graph_version: string;
      };

      await carregarSdk(app_id, graph_version);

      // 2. A sessão chega por `message`, em paralelo com o `code`. Começa-se a
      //    ouvir ANTES de abrir — a mensagem pode chegar primeiro.
      let sessao: SessaoWhatsApp | null = null;
      const ouvir = (ev: MessageEvent) => {
        if (!String(ev.origin).endsWith('facebook.com')) return;
        try {
          const d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
          if (d?.type !== 'WA_EMBEDDED_SIGNUP') return;
          // Os ids tanto vêm dentro de `data` como no próprio objeto, conforme
          // a versão. Aceitam-se os dois em vez de exigir uma forma exata.
          const c = (d.data ?? d) as SessaoWhatsApp;
          if (c?.waba_id || c?.phone_number_id) sessao = { ...(sessao ?? {}), ...c };
        } catch { /* nem tudo o que a Meta envia é a sessão */ }
      };
      window.addEventListener('message', ouvir);

      try {
        const code = await new Promise<string>((resolve, reject) => {
          window.FB!.login(
            (r) => {
              const c = r?.authResponse?.code;
              if (c) resolve(c);
              else reject(new Error('Ligação cancelada — o assistente foi fechado antes do fim.'));
            },
            {
              config_id,
              response_type: 'code',
              // Sem isto o SDK devolve um token em vez do código, e a troca
              // server-to-server — que é o que mantém o segredo no servidor —
              // deixa de ser possível.
              override_default_response_type: true,
              extras: {
                setup: {},
                // Coexistence: o cliente mantém o número na app do WhatsApp
                // Business e traz os contactos e 180 dias de histórico.
                featureType: 'whatsapp_business_app_onboarding',
                sessionInfoVersion: '3',
              },
            },
          );
        });

        // A mensagem da sessão e o código chegam por caminhos diferentes e não
        // têm ordem garantida. Se o código veio primeiro, dá-se um instante à
        // mensagem antes de desistir — desistir já era falhar uma ligação que
        // afinal correu bem.
        for (let i = 0; i < 20 && !sessao?.waba_id; i++) {
          await new Promise((r) => setTimeout(r, 150));
        }

        // 3. O servidor troca o código por token e cria a caixa. O token nunca
        //    chega aqui.
        const { data, error } = await supabase.functions.invoke('meta-connect', {
          body: {
            action: 'whatsapp_signup',
            organization_id: organization.id,
            code,
            // Podem vir vazios: nesse caso o servidor descobre a conta a partir
            // das permissões do token, e pergunta se houver mais do que uma.
            waba_id: sessao?.waba_id ?? null,
            phone_number_id: sessao?.phone_number_id ?? null,
            label,
          },
        });
        if (error) {
          let detail = '';
          try {
            const b = await (error as { context?: Response }).context?.json();
            detail = b?.error ?? '';
          } catch { /* corpo não era JSON */ }
          throw new Error(detail || (error as Error).message);
        }
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        return data as { channel_type: string; label: string };
      } finally {
        window.removeEventListener('message', ouvir);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', organization?.id] });
    },
  });
}
