
# Filtrar Destinatarios ao Clicar nos Cards de Metricas

## Objetivo

Ao clicar num card de metrica (Destinatarios, Enviados, Aberturas, Cliques, Erros), a lista de destinatarios abaixo filtra automaticamente para mostrar apenas os registos correspondentes. Clicar novamente no mesmo card remove o filtro.

## Alteracoes

### Ficheiro: `src/components/marketing/CampaignDetailsModal.tsx`

1. **Novo estado** `activeFilter` com valores possiveis: `null | 'all' | 'delivered' | 'opened' | 'clicked' | 'failed'`

2. **Cards clicaveis** — adicionar `cursor-pointer` e um anel visual (`ring-2 ring-primary`) ao card ativo. O `onClick` alterna o filtro (clique = ativa, segundo clique = desativa).

3. **Logica de filtragem** — o `filteredSends` combina o filtro de metrica com a pesquisa por texto:
   - `all`: mostra todos (sem filtro extra)
   - `delivered`: `status === 'sent' || status === 'delivered'`
   - `opened`: `opened_at !== null`
   - `clicked`: `clicked_at !== null`
   - `failed`: `status === 'failed' || status === 'bounced' || status === 'blocked' || status === 'spam'`

4. **Contador no titulo** — o titulo "Destinatarios (X)" atualiza para refletir a contagem filtrada quando um filtro esta ativo.

5. **Indicador visual** — badge ou texto junto ao titulo a indicar qual filtro esta ativo, com botao "Limpar" para remover.

## Detalhe Tecnico

Cada metrica no array `metrics` recebe um campo `filterKey` que mapeia ao tipo de filtro. O card renderiza com estilos condicionais baseados em `activeFilter === m.filterKey`. A filtragem e feita num unico `useMemo` que aplica primeiro o filtro de metrica e depois o filtro de texto.
