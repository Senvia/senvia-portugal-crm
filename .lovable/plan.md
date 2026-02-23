

# Restringir Alertas de Fidelizacao ao Nicho Telecom

## Problema
Os "Alertas de Fidelizacao" (CPE/CUI a expirar) sao uma funcionalidade exclusiva do nicho telecom, mas actualmente:
- O widget no Dashboard ja esta correctamente protegido (so aparece se `niche === 'telecom'`)
- O menu de Definicoes mostra a opcao "Alertas" para **todos** os nichos
- A edge function `check-fidelization-alerts` pode correr para organizacoes nao-telecom

## Alteracoes

### 1. `src/components/settings/MobileSettingsNav.tsx`
- Receber a prop `isTelecom` (ou `niche`) no componente
- Filtrar condicionalmente o item `notif-alerts` da seccao "notifications": so mostrar quando o nicho for telecom
- Para outros nichos, a seccao de notificacoes mostrara apenas "Push"

### 2. `src/pages/Settings.tsx`
- Passar a informacao do nicho da organizacao para o `MobileSettingsNav`
- Filtrar o item "notif-alerts" no menu desktop tambem, caso exista navegacao desktop que o liste
- No `renderContent`, manter o case `notif-alerts` (nao causa erro, simplesmente nao sera acessivel pelo menu)

### 3. `supabase/functions/check-fidelization-alerts/index.ts`
- Adicionar verificacao no inicio: se a organizacao nao e do nicho `telecom`, retornar imediatamente sem processar

### Resumo dos ficheiros
| Ficheiro | O que muda |
|----------|-----------|
| `MobileSettingsNav.tsx` | Esconder item "Alertas" se niche != telecom |
| `Settings.tsx` | Passar niche ao nav e filtrar menu desktop |
| `check-fidelization-alerts/index.ts` | Early return se niche != telecom |
