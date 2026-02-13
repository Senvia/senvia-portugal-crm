
# Editar Campanha em Rascunho

## Problema

Ao clicar em "Editar" numa campanha com status `draft`, abre-se o modal de detalhes (apenas leitura) em vez de um modal de edicao com os dados pre-preenchidos.

## Solucao

Transformar o `CreateCampaignModal` num modal reutilizavel para criar E editar campanhas. Quando uma campanha draft e passada como prop, o modal abre directamente no Step 3 com todos os campos pre-preenchidos.

## Alteracoes

### 1. `src/hooks/useCampaigns.ts` -- Novo hook `useUpdateCampaign`

Criar um mutation hook para actualizar os campos de uma campanha existente (name, subject, template_id, html_content, settings, settings_data).

### 2. `src/components/marketing/CreateCampaignModal.tsx`

- Adicionar prop opcional `campaign?: EmailCampaign` para modo de edicao
- Quando `campaign` e fornecida:
  - Pre-preencher todos os estados (name, subject, templateId, settings, settingsData, contentMode, customHtml)
  - Iniciar directamente no Step 3 (configuracao)
  - O titulo muda de "Criar uma campanha" para "Editar campanha"
  - O botao "Guardar Campanha" chama `useUpdateCampaign` em vez de `useCreateCampaign`
  - O botao "Enviar campanha" actualiza a campanha existente e envia (em vez de criar uma nova)
- Usar `useEffect` para sincronizar os estados quando a prop `campaign` muda

### 3. `src/pages/marketing/Campaigns.tsx`

- Separar a logica de `onView` em dois fluxos:
  - Se a campanha e `draft`: abrir o `CreateCampaignModal` com a campanha para edicao
  - Se a campanha nao e `draft`: abrir o `CampaignDetailsModal` (comportamento actual)
- Adicionar estado `editingCampaign` para controlar o modal de edicao

### 4. `src/components/marketing/CampaignsTable.tsx`

- Adicionar callback `onEdit` nas props
- Separar o comportamento do botao de lapis (Pencil) para chamar `onEdit` em vez de `onView` quando a campanha e draft
- No dropdown menu, adicionar opcao "Editar" para campanhas draft

## Resultado

- Clicar no lapis de uma campanha draft abre o modal de edicao com os dados pre-preenchidos
- Clicar numa campanha enviada/a enviar abre os detalhes (como antes)
- O utilizador pode continuar a preencher os dados e enviar ou guardar novamente como rascunho
