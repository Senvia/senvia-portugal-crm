
# Ocultar Produtos/Servicos nas Vendas (Telecom)

## Resumo
No nicho telecom, a seccao "Produtos / Servicos" nas vendas nao e utilizada (a faturacao e externa). Vamos ocultar esta seccao nos 3 locais onde aparece: criacao, detalhes e edicao de vendas.

## O que muda

### 1. Modal de Criacao (`src/components/sales/CreateSaleModal.tsx`)
- Envolver o bloco "Produtos / Servicos" (linhas ~870-973) com `{!isTelecom && (...)}`
- A variavel `isTelecom` ja existe no componente (linha 114)
- Para telecom, o valor total vem da proposta (CPEs/comissoes), nao de itens de produto

### 2. Modal de Detalhes (`src/components/sales/SaleDetailsModal.tsx`)
- Envolver o bloco "Products/Services" (linhas ~559-588) com `{!isTelecom && saleItems.length > 0 && (...)}`
- A variavel `isTelecom` ja existe no componente (linha 131)

### 3. Modal de Edicao (`src/components/sales/EditSaleModal.tsx`)
- Adicionar a variavel `isTelecom` (importando `useAuth` e verificando `organization?.niche`)
- Envolver o bloco "Produtos/Servicos" (linha ~479) com `{!isTelecom && (...)}`

### 4. Logica de submissao (CreateSaleModal)
- Na submissao, saltar a criacao de `sale_items` quando `isTelecom` (ja que nao ha itens)

## Ficheiros alterados
- `src/components/sales/CreateSaleModal.tsx`
- `src/components/sales/SaleDetailsModal.tsx`
- `src/components/sales/EditSaleModal.tsx`
