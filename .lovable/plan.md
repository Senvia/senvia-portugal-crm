

## IDs: Modal "Revisão de Proposta"

### Contexto
O botão "Revisão" na secção IDs não faz nada. Precisa abrir um modal fullScreen com o formulário de "Nova Revisão de Proposta" conforme a imagem de referência.

### Alterações

**1. Novo componente `PortalTotalLinkRevisaoDialog.tsx`**
- Dialog fullScreen com título "Nova Revisão de Proposta" e subtítulo "Revisão de Propostas"
- Formulário com os campos (todos placeholder para futura integração PHC):
  - **Cliente NIF** — Input text
  - **Nº Caso** — Input text
  - **Prazo** — Input text
  - **Registo** — Input text
  - **Mensal. Pretendida** — Input text
  - **Tipo Receita** — Select dropdown
  - **Penalização Tipo Receita** — Input text
  - **Múltiplo** — Input text
- Secção de upload de ficheiros (input file + label "Nenhum ficheiro selecionado")
- Botão "Gravar" ao lado do upload
- Botão full-width "Adicionar Nova Revisão de Proposta" no fundo
- Layout: labels à esquerda, inputs à direita (padrão da imagem)

**2. Atualizar `PortalTotalLinkLayout.tsx`**
- Adicionar state `isRevisaoDialogOpen`
- No `onClick` do botão, adicionar condição `currentSection.key === "ids"` para abrir o dialog
- Renderizar `PortalTotalLinkRevisaoDialog`

**Ficheiros:**
- `src/components/portal-total-link/PortalTotalLinkRevisaoDialog.tsx` (novo)
- `src/components/portal-total-link/PortalTotalLinkLayout.tsx` (editar)

