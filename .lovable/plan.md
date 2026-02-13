
# Redesign dos Modais de Propostas para Full-Page

## Objectivo
Converter os 3 modais de propostas (Detalhes, Criar, Editar) do layout actual de dialog pequeno (`sm:max-w-lg` / `sm:max-w-2xl`) para o layout full-page usado nos modais de vendas, com grid de 2 colunas em desktop (60/40) e coluna direita sticky.

## Modais afectados

### 1. ProposalDetailsModal (903 linhas)
**De**: `DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"`
**Para**: `DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0"`

Layout:
- **Coluna esquerda** (lg:col-span-3): Cliente, Status, CPEs/Produtos, Observacoes
- **Coluna direita** (lg:col-span-2, sticky): Valor Total, Badge de status, Tipo (telecom), Accoes (Editar, Imprimir, Email, Eliminar)

### 2. CreateProposalModal (637 linhas)
**De**: `DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0"`
**Para**: `DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0"`

Layout:
- **Coluna esquerda** (lg:col-span-3): Formulario (Cliente, Data, Estado, Tipo Negociacao, CPEs/Produtos)
- **Coluna direita** (lg:col-span-2, sticky): Resumo de valor total, Comissao, Botao submeter

### 3. EditProposalModal (734 linhas)
**De**: `DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0"`
**Para**: `DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0"`

Layout identico ao CreateProposalModal.

## Estrutura HTML comum (seguindo o padrao dos modais de venda)

```text
DialogContent variant="fullScreen"
  +-- DialogHeader (border-b, px-6, py-4)
  +-- div.flex-1.overflow-y-auto
       +-- div.max-w-6xl.mx-auto.p-4.sm:p-6
            +-- div.grid.grid-cols-1.lg:grid-cols-5.gap-6
                 +-- div.lg:col-span-3.space-y-4  (conteudo principal)
                 |    +-- Card: Info Basica
                 |    +-- Card: CPEs / Produtos
                 |    +-- Card: Observacoes
                 +-- div.lg:col-span-2            (resumo sticky)
                      +-- div.lg:sticky.lg:top-0.space-y-4
                           +-- Card: Valor Total
                           +-- Card: Accoes
```

## Detalhe por modal

### ProposalDetailsModal
- Header: Titulo "Proposta {code}" + Badge de status + data
- Coluna esquerda:
  - Card "Cliente" (dados do cliente/lead)
  - Card "Status" (seletor de estado)
  - Card "CPEs" (telecom) ou Card "Produtos" (nao-telecom)
  - Card "Servicos Telecom" (se aplicavel)
  - Card "Observacoes" (textarea editavel inline)
- Coluna direita (sticky):
  - Card com valor total (destaque visual)
  - Resumo telecom (MWh, margem, comissao) se aplicavel
  - Tipo badge (Energia/Servicos) se telecom
  - Botoes de accao (Editar, Imprimir, Enviar Email, Eliminar)

### CreateProposalModal
- Header: "Nova Proposta"
- Coluna esquerda:
  - Card "Info Basica" (Cliente + Data + Estado)
  - Card "Tipo de Negociacao" (telecom)
  - Card "Tipo de Proposta" (telecom)
  - Card "CPEs" ou "Produtos/Servicos"
  - Card "Observacoes"
- Coluna direita (sticky):
  - Card "Resumo" (valor total, comissao)
  - Botao "Criar Proposta"

### EditProposalModal
- Identico ao Create mas com dados pre-preenchidos
- Header: "Editar Proposta {code}"
- Botao "Guardar Alteracoes"

## Mobile
Em mobile (`grid-cols-1`), as colunas empilham naturalmente - o resumo/accoes ficam por baixo do conteudo principal (sem sticky).

## Ficheiros alterados
- `src/components/proposals/ProposalDetailsModal.tsx`
- `src/components/proposals/CreateProposalModal.tsx`
- `src/components/proposals/EditProposalModal.tsx`

## Nota
A logica de negocio, hooks, e callbacks permanecem inalterados. Apenas o layout JSX e reestruturado para usar o padrao full-page com grid 60/40.
