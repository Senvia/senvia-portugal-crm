

# Tornar Data da Venda Read-Only no Modal Editar Venda

## Problema
No modal "Editar Venda", a data da venda aparece como um date picker editavel, enquanto no "Detalhes da Venda" aparece como texto simples read-only. A data de uma venda nao deve ser editavel.

## O que fazer

### `src/components/sales/EditSaleModal.tsx`

Substituir o Popover/Calendar (linhas 405-431) por texto simples read-only, igualando o estilo do SaleDetailsModal:

**De** (date picker editavel):
```text
<Popover>
  <PopoverTrigger><Button>...</Button></PopoverTrigger>
  <PopoverContent><Calendar .../></PopoverContent>
</Popover>
```

**Para** (texto read-only):
```text
<p className="text-xs text-muted-foreground">Data da Venda</p>
<p className="text-sm font-medium">
  {format(new Date(sale.sale_date), "d MMM yyyy", { locale: pt })}
</p>
```

Tambem remover o state `saleDate` e a logica associada do `handleSave`, ja que a data nao sera mais editavel.

