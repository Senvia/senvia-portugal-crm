

# Tornar Editaveis os Dados de Energia e CPE/CUI no Modal de Edicao de Venda

## Problema

Os campos "Dados de Energia" (Tipo de Negociacao, Consumo Anual, Margem, DBL, Anos de Contrato, Comissao) e "CPE/CUI" estao a aparecer como **somente leitura** no modal de edicao de vendas. O utilizador precisa de poder editar estes valores diretamente.

## Solucao

Converter as seccoes read-only em campos editaveis com inputs, selects e a possibilidade de editar/adicionar/remover CPEs.

## Seccao Tecnica

### Ficheiro: `src/components/sales/EditSaleModal.tsx`

**1. Adicionar estado local para campos de energia/servico:**

Novos estados no componente:
- `negotiationType` (select com opcoes: Angariacao, Angariacao Indexado, Renovacao, Ang sem Volume)
- `consumoAnual` (input numerico)
- `margem` (input numerico)
- `dbl` (input numerico)
- `anosContrato` (input numerico)
- `comissao` (input numerico)
- `modeloServico` (select: Transacional, SAAS)
- `kwp` (input numerico)
- `servicosProdutos` (checkboxes: Solar, Carregadores/Baterias, Condensadores, Coberturas)

Inicializar todos no `useEffect` que ja existe (linhas 128-135) a partir dos dados da `sale`.

**2. Converter seccao "Dados de Energia" (linhas 498-549) de read-only para editavel:**

Substituir os `<p>` por inputs editaveis:
- Tipo de Negociacao: `<Select>` com as opcoes de `NEGOTIATION_TYPES`
- Consumo Anual: `<Input type="number">` com sufixo "kWh"
- Margem: `<Input type="number">` com sufixo "EUR/MWh"
- Anos de Contrato: `<Input type="number">`
- DBL: `<Input type="number">`
- Comissao: `<Input type="number">` com sufixo "EUR"

**3. Converter seccao "Dados do Servico" (linhas 552-603) de read-only para editavel:**

- Tipo de Negociacao: `<Select>`
- Modelo de Servico: `<Select>` (Transacional/SAAS)
- kWp: `<Input type="number">`
- Servicos/Produtos: Checkboxes para cada item de `SERVICOS_PRODUCTS`
- Comissao: `<Input type="number">`

**4. Converter seccao "CPEs" (linhas 606-693) para editavel:**

Para CPEs da proposta (`proposal_cpes`):
- Permitir editar: `comercializador`, `consumo_anual`, `margem`, `comissao`, `serial_number`
- Usar o hook `useUpdateProposalCpes` que ja existe para guardar alteracoes
- Adicionar estado local `editableCpes` inicializado a partir de `proposalCpes`

**5. Incluir campos novos no `handleSubmit` (linhas 268-393):**

Adicionar ao objecto `updates` passado ao `updateSale.mutateAsync`:
```
negotiation_type: negotiationType || null,
consumo_anual: parseFloat(consumoAnual) || null,
margem: parseFloat(margem) || null,
dbl: parseFloat(dbl) || null,
anos_contrato: parseInt(anosContrato) || null,
comissao: parseFloat(comissao) || null,
modelo_servico: modeloServico || null,
kwp: parseFloat(kwp) || null,
servicos_produtos: servicosProdutos.length > 0 ? servicosProdutos : null,
```

Para os CPEs, chamar `useUpdateProposalCpes` apos guardar a venda.

**Resultado:** Todos os campos de Energia, Servico e CPE passam a ser editaveis diretamente no modal de edicao, com os dados a serem guardados na base de dados ao submeter.

Total: 1 ficheiro editado (`EditSaleModal.tsx`).

