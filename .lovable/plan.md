

## Fallback do Nome do Lead para Nome da Empresa

### Contexto
Quando um lead e criado sem nome (campo vazio), o sistema guarda uma string vazia ou "Anonimo". O pedido e que, se nao houver nome mas houver `company_name`, o nome do lead deve ser automaticamente preenchido com o nome da empresa.

### Alteracoes

**1. AddLeadModal.tsx (Frontend - criacao manual)**
- Na funcao `onSubmit`, alterar a linha `name: data.name || ''` para `name: data.name || data.company_name || ''`

**2. submit-lead/index.ts (Edge Function - formulario publico)**
- Na linha 200, alterar `name: body.name?.trim() || 'Anónimo'` para `name: body.name?.trim() || body.company_name?.trim() || 'Anónimo'`

Nao sao necessarias alteracoes de display -- o `LeadCard` e outros componentes ja mostram `lead.name` como titulo principal.

