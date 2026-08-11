// Versão actual do Senvia OS
export const APP_VERSION = '26.1.10';

// URL canónica usada APENAS como fallback (links externos/edge functions
// quando não há `window`). Em runtime, preferimos sempre o host actual
// para evitar que preview/staging gerem links para outro deploy.
export const PRODUCTION_URL = 'https://app.senvia.pt';

// Detecta o ambiente e retorna a URL base correcta.
// Regra: usar o host actual quando existir `window` — mas SÓ se for http(s).
// Dentro da extensão do Chrome a origem é `chrome-extension://<id>`, que não
// abre em máquina nenhuma e ainda muda a cada recarregamento em modo unpacked.
// Como esta função alimenta links de convite copiados e o URL de acesso ENVIADO
// POR EMAIL (TeamTab), deixar passar essa origem produzia links mortos para
// terceiros. Em SSR/edge continua a cair no PRODUCTION_URL.
export const getBaseUrl = () => {
  if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
    return window.location.origin;
  }
  return PRODUCTION_URL;
};

// Helper para gerar URLs relativas ao host actual (ou produção em SSR).
export const getProductionUrl = (path: string) => {
  const base = getBaseUrl();
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
};

// Tunable magic numbers for the inbox (Caixa de Entrada). Centralized so the SLA
// thresholds, grouping window, attachment cap and desktop breakpoint aren't
// scattered as literals across the page and its sub-components.
export const INBOX_CONFIG = {
  // Customer-waiting SLA traffic light.
  SLA_WARN_MIN: 15,
  SLA_LATE_MIN: 60,
  // Consecutive same-sender messages within this window render as one group.
  GROUP_WINDOW_MS: 5 * 60 * 1000,
  // Max outgoing attachment size.
  ATTACHMENT_MAX_BYTES: 10 * 1024 * 1024,
  // px width at/above which the contact panel is a fixed column (else a Sheet).
  DESKTOP_BREAKPOINT: 1024,
} as const;

/**
 * Canais de mensagens (WhatsApp, Instagram, Facebook) desligados — "Brevemente".
 *
 * A Caixa de Entrada funciona só para EMAIL enquanto isto for `false`.
 *
 * Porquê: o WhatsApp por ligação não-oficial (Evolution) viola os Termos de
 * Serviço da Meta e arrisca o ban do número do cliente; e o Instagram/Messenger
 * exigem App Review da Meta, que ainda não está aprovada. Prometer canais que
 * não podemos entregar em condições é pior do que não os oferecer.
 *
 * Para voltar a ligar: mudar para `true`. É o único sítio a mexer — o catálogo
 * de canais, a lista de caixas e o painel lateral da Caixa de Entrada leem
 * todos daqui. Os dados dos canais já ligados NÃO são apagados por isto, apenas
 * deixam de aparecer, por isso a mudança é reversível sem perder nada.
 */
export const MESSAGING_CHANNELS_ENABLED = false;

/** Rótulo mostrado nos canais ainda por abrir. */
export const CHANNEL_COMING_SOON_LABEL = 'Brevemente';
