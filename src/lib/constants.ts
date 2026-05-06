// Versão actual do Senvia OS
export const APP_VERSION = '26.1.5';

// URL canónica usada APENAS como fallback (links externos/edge functions
// quando não há `window`). Em runtime, preferimos sempre o host actual
// para evitar que preview/staging gerem links para outro deploy.
export const PRODUCTION_URL = 'https://senvia-portugal-crm.lovable.app';

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
