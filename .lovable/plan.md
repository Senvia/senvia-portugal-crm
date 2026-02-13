

# Redesenho Completo das Campanhas (Estilo Brevo)

## Resumo

Redesenhar a pagina de campanhas e os seus modais para um estilo profissional inspirado no Brevo, com listagem em cards, filtros de pesquisa/estado, e modais full-page para criacao e detalhes.

---

## Alteracoes

### 1. `src/components/marketing/CampaignsTable.tsx` -- Redesenho da listagem

Substituir a tabela actual por **cards estilo Brevo** (como nos prints):

- Cada campanha e um card com borda, contendo:
  - **Esquerda**: checkbox + nome da campanha (bold), badge de estado (Enviada/Rascunho) com dot colorido, data de envio/edicao, numero sequencial (#1, #2...)
  - **Direita**: metricas em colunas (Destinatarios, Aberturas, Cliques) com valores absolutos e percentagens
  - **Extremo direito**: icone de acao (editar para rascunhos, stats para enviadas) + menu 3 pontos
- **Barra de filtros** acima dos cards:
  - Campo de pesquisa "Procurar uma campanha" (accent-insensitive com `normalizeString`)
  - Dropdown "Todos os status" (Todos, Rascunho, A enviar, Enviada, Falhada)
- Estado vazio mantido com icone e texto
- Mobile: cards empilhados com layout mais compacto

### 2. `src/components/marketing/CreateCampaignModal.tsx` -- Full-page com fluxo Brevo

Converter o Dialog pequeno (3 steps) para um **Dialog fullScreen** com o fluxo do Brevo:

**Passo 1 (full-page centrado)**: "Criar uma campanha de e-mail"
- Campo "Nome da campanha" com contador de caracteres (0/128)
- Selector de template (mantido)
- Botoes "Cancelar" e "Criar campanha"

**Passo 2 (full-page stepper vertical)**: Configuracao da campanha (estilo image-85)
- Header: nome da campanha + badge "Rascunho" + botao "Enviar campanha"
- Seccoes verticais em cards separados por linhas:
  - **Remetente**: mostra nome e email da org (lido das settings), botao "Alterar"
  - **Destinatarios**: mostra contagem selecionada, botao "Selecionar destinatarios" que abre sub-seccao com as 3 tabs actuais (Individual/Filtro/Lista)
  - **Assunto**: mostra o assunto do template selecionado
  - **Template**: mostra o nome do template, botao "Alterar template"
- Cada seccao tem icone verde (check) quando preenchida, cinza quando pendente
- Footer fixo com botao "Enviar campanha" (disabled ate todas seccoes estarem completas)

**Passo 3 (confirmacao)**: Manter o resumo actual mas dentro do layout full-page

### 3. `src/components/marketing/CampaignDetailsModal.tsx` -- Full-page

Converter para Dialog `variant="fullScreen"`:

- Header: nome da campanha + badge de estado + data de envio
- Conteudo centrado (`max-w-3xl mx-auto`):
  - Grid de metricas no topo (Destinatarios, Aberturas, Cliques) com valores + percentagens (estilo Brevo)
  - Barra de progresso (se a enviar)
  - Info da campanha (template, data)
  - Lista de destinatarios com pesquisa accent-insensitive e estados individuais

### 4. `src/pages/marketing/Campaigns.tsx` -- Ajustes minimos

- Passar props de filtro para o CampaignsTable (pesquisa e estado sao geridos internamente no componente)

---

### Ficheiros a editar

| Acao | Ficheiro |
|------|----------|
| Reescrever | `src/components/marketing/CampaignsTable.tsx` |
| Reescrever | `src/components/marketing/CreateCampaignModal.tsx` |
| Reescrever | `src/components/marketing/CampaignDetailsModal.tsx` |
| Editar | `src/pages/marketing/Campaigns.tsx` (ajustes minimos) |

---

### Detalhes tecnicos

- Usar `Dialog` com `variant="fullScreen"` para criacao e detalhes
- Usar `normalizeString` de `@/lib/utils` para pesquisa accent-insensitive na listagem e nos destinatarios
- Percentagens calculadas: `aberturas / destinatarios * 100`, `cliques / destinatarios * 100`
- Manter toda a logica de envio (batch via `sendTemplate`) e hooks existentes (`useCampaigns`, `useEmailTemplates`, etc.)
- Layout centrado com `max-w-3xl mx-auto` dentro dos full-page modals
- Mobile-first: cards empilhados, metricas em 2 colunas no mobile

