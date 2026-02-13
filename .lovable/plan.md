
# Sincronizacao Automatica de Campanhas

## O que muda

Remover o botao "Sincronizar" e tornar o processo completamente automatico. Quando o modal de detalhes abre, o sistema faz o sync com a Brevo automaticamente em background, sem precisar de nenhuma accao do utilizador.

## Alteracoes

### 1. `src/components/marketing/CampaignDetailsModal.tsx`
- Remover o botao "Sincronizar" do header
- Adicionar um `useEffect` que dispara `syncSends(campaign.id)` automaticamente quando o modal abre (e `sends.length === 0` ou sempre na primeira abertura)
- Manter o spinner discreto no header (o `RefreshCw` pequeno que ja existe) para indicar que esta a carregar/sincronizar
- O polling de 10s que ja existe no hook continua a manter os dados actualizados depois do sync inicial

### 2. `src/hooks/useCampaigns.ts`
- Sem alteracoes necessarias - o `useSyncCampaignSends` e o `refetchInterval: 10000` ja estao implementados

## Resultado

- O utilizador abre o modal e os dados aparecem automaticamente (sync + polling)
- Zero botoes para carregar, experiencia seamless
- O spinner discreto no header indica actividade em background
