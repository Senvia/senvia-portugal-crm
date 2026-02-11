

## Uniformizar tamanho dos modais Nova Proposta e Editar Proposta

### Problema
Os dois modais tem larguras maximas diferentes:
- **Nova Proposta** (`CreateProposalModal`): `sm:max-w-lg` (512px)
- **Editar Proposta** (`EditProposalModal`): `sm:max-w-3xl` (768px)

### Solucao
Uniformizar ambos para `sm:max-w-3xl` (768px), que e o tamanho adequado para acomodar os campos de CPE e energia sem aperto. Tambem alinhar a estrutura do `CreateProposalModal` para usar o mesmo padrao de layout (flex col, ScrollArea, footer separado).

### Alteracoes

**`src/components/proposals/CreateProposalModal.tsx`**
- Alterar `sm:max-w-lg` para `sm:max-w-3xl`
- Adicionar `flex flex-col p-0` ao `DialogContent` (mesmo padrao do Edit)
- Envolver o conteudo num `ScrollArea` com `min-h-0` para scroll consistente
- Mover o padding para dentro do conteudo (`px-6 py-4`)
- Separar o header com `border-b` e o footer com `border-t`

### Ficheiros a editar
- `src/components/proposals/CreateProposalModal.tsx`
