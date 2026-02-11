
Objetivo (Telecom apenas)
- Quando uma proposta (do nicho Telecom) é aceite e abre o modal “Nova Venda”, os dados da proposta (tipo de negociação, dados do serviço/energia, e CPE/CUI) devem aparecer no próprio modal da venda, de forma automática, para o utilizador confirmar antes de criar a venda.
- Para organizações não-Telecom, estes campos não devem aparecer (nem ser “forçados” no payload).

Diagnóstico do que está a acontecer agora (por que “não aparece”)
- O modal `CreateSaleModal` já copia e envia para a venda os campos:
  - `negotiation_type`
  - `servicos_produtos`
  - (e outros: `proposal_type`, `modelo_servico`, `kwp`, `comissao`, etc.)
- Porém, o modal “Nova Venda” não renderiza nenhum bloco de UI para mostrar esses campos. Ou seja: os dados podem até estar a ser enviados/salvos, mas o utilizador não os vê no ecrã (exatamente como no teu print).
- Além disso, no fluxo “Aceitar proposta → abrir venda”, existe risco de “stale data” (dados desatualizados): o `ProposalDetailsModal` passa o objeto `proposal` (do state do ecrã) como `prefillProposal`. Se o utilizador editou a proposta antes e o state não foi atualizado, o modal de venda pode receber um `prefillProposal` sem os campos mais recentes. Para seleção manual dentro do modal de venda isto não acontece porque ele usa `useProposals()`.

O que vamos implementar (resultado esperado)
1) No modal “Nova Venda”, quando a organização for Telecom e houver proposta selecionada:
   - Mostrar uma secção “Dados Telecom (da Proposta)” com:
     - Tipo de Negociação (label humana)
     - Se proposta_type = “servicos”:
       - Serviços/Produtos (badges)
       - Modelo de Serviço
       - kWp
       - Comissão
     - Se proposta_type = “energia”:
       - Tipo de Negociação
       - Resumo (ex.: nº de CPEs, consumo total MWh, comissão total) usando `proposalCpes` quando existir
   - Mostrar/expandir a secção de CPEs com os campos relevantes (CPE/CUI, consumo, duração, DBL, margem, comissão, datas contrato), no estilo “preview” (read-only), para o utilizador confirmar.
2) Garantir que isto é Telecom-only:
   - UI só aparece quando `organization.niche === 'telecom'`
   - Payload só envia `negotiation_type/servicos_produtos/...` quando Telecom; caso contrário, envia `undefined` (ou limpa state ao remover proposta).
3) Corrigir o risco de dados desatualizados no fluxo “Aceitar”:
   - Quando existir `prefillProposal`, usar preferencialmente a versão do `useProposals()` (cache atual) para preencher os campos (fallback para `prefillProposal` se ainda não estiver carregado).

Arquivos que vamos mexer
A) src/components/sales/CreateSaleModal.tsx
Mudanças principais:
1. Determinar Telecom:
   - Criar `const isTelecom = organization?.niche === 'telecom'`.
2. Fonte de dados “confiável” da proposta (evitar stale):
   - Criar `effectiveProposal` baseado no `proposalId`/`prefillProposal.id`, priorizando o objeto vindo de `proposals` (hook `useProposals()`), e só depois `prefillProposal`.
   - Ajustar o `useEffect` de reset/prefill para preencher campos a partir do `effectiveProposal` (quando disponível).
3. Reset correto quando “Venda direta” (proposal = none) ou quando muda cliente:
   - Hoje, `handleProposalSelect("none")` limpa `proposalId/items/notes`, mas não limpa `proposalType/negotiationType/servicosProdutos/...`.
   - Vamos limpar esses campos para não “vazar” dados de uma proposta anterior.
4. UI: nova secção “Dados Telecom (da Proposta)”:
   - Inserir após “Informação Básica” e antes de “Produtos/Serviços”.
   - Render condicional: `if (isTelecom && proposalId)` (ou `effectiveProposalId`).
   - Layout mobile-first (coluna única no mobile, `sm:grid-cols-2` quando fizer sentido).
   - Exibir com labels humanas usando:
     - `NEGOTIATION_TYPE_LABELS`
     - `MODELO_SERVICO_LABELS` (importar de `@/types/proposals` para mostrar texto bonito)
     - `Badge` para serviços selecionados.
5. UI: melhorar “CPEs (serão criados/atualizados)”:
   - Trocar título para Telecom: “CPE/CUI (Pontos de Consumo)”
   - Mostrar mais detalhes por CPE (quando existirem):
     - `serial_number` (CPE/CUI)
     - `consumo_anual`, `duracao_contrato`, `dbl`, `margem`, `comissao`
     - `contrato_inicio`, `contrato_fim`
   - Render condicional forte:
     - Só mostrar esta secção se `isTelecom` e `proposalCpes.length > 0`
     - (Mantém o comportamento atual para outros nichos: não mostra nada)
6. Payload Telecom-only:
   - No `createSale.mutateAsync`, enviar:
     - `negotiation_type`, `servicos_produtos`, `proposal_type`, `modelo_servico`, `kwp`, `comissao`, etc. apenas se `isTelecom` e houver proposta selecionada.
   - Se não for Telecom ou for venda direta, enviar `undefined` (e o reset do state evita lixo).

B) src/components/sales/SaleDetailsModal.tsx
Ajustes para manter consistência Telecom-only:
1. Gate das secções “Dados de Energia” e “Dados do Serviço”:
   - Hoje o modal mostra se `sale.proposal_type === 'energia'/'servicos'` e existir conteúdo.
   - Vamos exigir também `isTelecom` para estas secções aparecerem.
2. Gate da secção de CPEs:
   - Garantir que a secção de CPE/CUI só aparece para Telecom (evita mostrar “CPEs” em nichos onde isso não se aplica).

Critérios de aceitação (o que eu vou validar no preview)
1) Telecom:
- Abrir uma proposta Telecom → mudar status para “Aceite” → abre “Nova Venda”
- O modal “Nova Venda” deve mostrar:
  - “Tipo de Negociação”
  - Se for “Serviços”: lista de serviços/produtos + modelo + kWp + comissão (se existirem)
  - Se houver CPEs: a secção “CPE/CUI” aparece e lista os pontos com métricas
- Criar a venda
- Abrir a venda criada: “SaleDetailsModal” mostra os mesmos campos (Telecom) e os CPEs.

2) Não-Telecom:
- Abrir “Nova Venda” e/ou aceitar proposta (não-telecom)
- Não deve aparecer a secção Telecom
- A venda criada não deve exibir blocos Telecom no detalhe.

Notas importantes (para evitar regressões)
- Estas alterações são 100% UI/UX e “scope” (não exigem nova migração).
- Não vamos remover colunas do banco (já existem); apenas garantir que:
  - só são exibidas no contexto Telecom
  - só são preenchidas/enviadas automaticamente quando Telecom

Sequência de implementação (rápida e segura)
1) Atualizar `CreateSaleModal` (UI + reset + effectiveProposal)
2) Ajustar `SaleDetailsModal` (gates Telecom-only)
3) Teste end-to-end: aceitar proposta telecom e criar venda; repetir em organização não-telecom
