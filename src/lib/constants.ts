// Versão actual do Senvia OS
export const APP_VERSION = '26.1.10';

// URL canónica usada APENAS como fallback (links externos/edge functions
// quando não há `window`). Em runtime, preferimos sempre o host actual
// para evitar que preview/staging gerem links para outro deploy.
export const PRODUCTION_URL = 'https://app.senvia.pt';

// Detecta o ambiente e retorna a URL base correcta.
// Regra: usar SEMPRE o host actual quando existir `window`. Só caímos
// no PRODUCTION_URL quando estamos em SSR/edge sem `window`.
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
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
