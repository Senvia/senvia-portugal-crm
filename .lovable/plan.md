

## Mostrar "Numero Proposta EDP" apenas para Telecom

### Problema

O campo "Numero Proposta EDP" aparece em **todos os nichos** nos modais de Criar Venda, Editar Venda e Detalhes da Venda. Deveria ser visível **apenas para o nicho telecom**.

### Alterações

Todos os 3 ficheiros já têm a variável `isTelecom` disponível.

| Ficheiro | Linha(s) | Alteração |
|---|---|---|
| `src/components/sales/CreateSaleModal.tsx` | 1166-1179 | Envolver o bloco do card "Numero Proposta EDP" com `{isTelecom && (...)}` |
| `src/components/sales/EditSaleModal.tsx` | 1077-1090 | Envolver o bloco do card "Numero Proposta EDP" com `{isTelecom && (...)}` |
| `src/components/sales/SaleDetailsModal.tsx` | 291-296 | Já está condicionado por `{(sale as any).edp_proposal_number && (...)}` — só aparece se tiver valor, o que está correcto. Mas para consistência, adicionar também `isTelecom &&` à condição |

### Detalhe

Em `CreateSaleModal.tsx` (linhas 1166-1179):
```tsx
{isTelecom && (
  <Card>
    <CardHeader className="pb-2 p-4">
      <CardTitle className="text-sm font-medium text-muted-foreground">Numero Proposta EDP *</CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <Input ... />
    </CardContent>
  </Card>
)}
```

Mesma lógica para `EditSaleModal.tsx` (linhas 1077-1090).

Em `SaleDetailsModal.tsx` (linha 291):
```tsx
{isTelecom && (sale as any).edp_proposal_number && (
```

