// URL base da aplicação em produção
// IMPORTANTE: Actualizar para o domínio personalizado quando configurado
export const PRODUCTION_URL = 'https://senvia-portugal-crm.lovable.app';

// Detecta o ambiente e retorna a URL base correcta
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Se for lovableproject.com ou localhost, usar PRODUCTION_URL
    if (hostname.includes('lovableproject.com') || hostname === 'localhost') {
      return PRODUCTION_URL;
    }
    // Caso contrário, usar o domínio actual (já é produção)
    return window.location.origin;
  }
  return PRODUCTION_URL;
};

// Helper para gerar URLs de produção
export const getProductionUrl = (path: string) => {
  const base = getBaseUrl();
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
};
