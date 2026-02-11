

## Alinhar o Modal de Venda com os Requisitos do InvoiceXpress

### Problema Identificado

O modal de criacao de venda nao garante que os dados necessarios para emissao de faturas estejam completos. Quando o utilizador cria uma venda e depois tenta emitir fatura, a emissao falha porque faltam dados obrigatorios.

**O que o InvoiceXpress exige para emitir qualquer documento (FT, FR, RC):**
1. Nome do cliente
2. NIF (obrigatorio - a edge function rejeita sem NIF)
3. Morada, codigo postal, cidade, pais (recomendado para conformidade fiscal)
4. Itens com nome, preco unitario, quantidade e taxa de IVA
5. Data do documento

**O que o modal de venda NAO mostra/valida hoje:**
1. Nao avisa se o cliente selecionado nao tem NIF
2. Nao mostra os dados fiscais do cliente (NIF, morada) para confirmar que estao correctos
3. Nao mostra a taxa de IVA que sera aplicada a cada item/produto
4. Nao permite ao utilizador ver a informacao fiscal antes de submeter

### Alteracoes Propostas

**1. Aviso de NIF em falta no modal de criacao (CreateSaleModal + EditSaleModal)**

Quando a organizacao tem InvoiceXpress activo e o utilizador seleciona um cliente sem NIF:
- Mostrar um alerta amarelo abaixo do selector de cliente: "Este cliente nao tem NIF. Nao sera possivel emitir faturas."
- Adicionar um link rapido "Editar cliente" para completar os dados fiscais

**2. Mini-card de dados fiscais do cliente**

Quando o cliente e selecionado, mostrar um card compacto com:
- NIF (com icone verde se preenchido, amarelo se vazio)
- Morada fiscal resumida (se existir)
- Isto permite ao utilizador confirmar rapidamente que os dados estao correctos

**3. Mostrar taxa de IVA por item na lista de produtos**

Cada item na lista de produtos passa a mostrar:
- O badge de IVA aplicavel (ex: "IVA 23%", "Isento")
- O IVA e determinado pelo produto (se tiver tax_value) ou pela configuracao global da organizacao
- Mostrar o valor com IVA ao lado do subtotal

**4. Resumo fiscal no bloco de totais**

O bloco de "Valores" passa a incluir:
- Subtotal (sem IVA) - ja existe
- Desconto - ja existe
- IVA (calculado) - NOVO
- Total com IVA - NOVO

Isto alinha o que o utilizador ve no modal de venda com o que aparece na fatura emitida.

### Detalhes Tecnicos

**Ficheiros a alterar:**

1. `src/components/sales/CreateSaleModal.tsx`
   - Buscar dados do cliente selecionado (nif, address) para mostrar no card
   - Buscar tax_config da organizacao e tax_value por produto
   - Adicionar alerta de NIF em falta (condicional: so se InvoiceXpress activo)
   - Adicionar badge de IVA em cada item
   - Adicionar linha de IVA no bloco de totais

2. `src/components/sales/EditSaleModal.tsx`
   - Mesmas alteracoes de visibilidade de dados fiscais do cliente
   - Alerta de NIF em falta
   - Badge de IVA por item
   - Linha de IVA no totais

3. `src/components/sales/SaleDetailsModal.tsx`
   - Mostrar IVA nos itens e no bloco de totais (consistencia com criacao)

**Logica de calculo de IVA (para exibicao):**

```text
Para cada item:
  taxa = produto.tax_value ?? organizacao.tax_config.tax_value ?? 23
  iva_item = item.unit_price * item.quantity * (taxa / 100)

IVA total = soma de todos os iva_item
Total com IVA = subtotal - desconto + IVA total
```

Nota: O valor guardado na base de dados (total_value) continua a ser o valor sem IVA (como hoje). O IVA e apenas calculado e mostrado para informacao do utilizador. O calculo real do IVA e feito pelo InvoiceXpress na emissao do documento.

**Condicionalidade:** Todas estas melhorias so aparecem se a organizacao tiver a integracao InvoiceXpress activa. Para organizacoes sem InvoiceXpress, o modal mantem-se exactamente como esta.

