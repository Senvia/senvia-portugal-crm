// URL base da aplicação em produção
export const PRODUCTION_URL = 'https://senvia-portugal-crm.lovable.app';

// Helper para gerar URLs de produção
export const getProductionUrl = (path: string) => {
  return `${PRODUCTION_URL}${path.startsWith('/') ? path : '/' + path}`;
};
