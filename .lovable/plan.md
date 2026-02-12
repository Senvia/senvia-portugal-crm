

# Mover Dados da Venda para um Card Dedicado

## O que muda

A "Context Bar" atual (linha fina com codigo + data + estado em `border-b`) sera substituida por um **Card** completo, visualmente igual aos outros cards (Cliente, Produtos, etc.), posicionado **acima** do card "Cliente" na coluna esquerda.

## Layout do novo Card "Dados da Venda"

```text
+------------------------------------------+
| Dados da Venda                           |
|                                          |
| Codigo        Data          Estado       |
| V-00008       12 Fev 2026   [Em Prog. v] |
+------------------------------------------+
+------------------------------------------+
| Cliente                                  |
| ...                                      |
+------------------------------------------+
```

O card usa um grid de 3 colunas com:
- Coluna 1: label "Codigo" + valor `sale.code` (font-mono)
- Coluna 2: label "Data da Venda" + valor formatado
- Coluna 3: label "Estado" + Select de status (com cores)

## Ficheiros a alterar

### `src/components/sales/SaleDetailsModal.tsx`
1. **Remover** a "Context Bar" (linhas 173-204) -- o `div` com `border-b` que contem o codigo, data e select de estado
2. **Remover** o bloco `isDeliveredAndLocked` de aviso que esta logo abaixo (linhas 198-204)
3. **Adicionar** um novo Card "Dados da Venda" como primeiro elemento dentro da coluna esquerda (`lg:col-span-3 space-y-4`), antes do card "Cliente" (linha 229)
4. O aviso "Esta venda esta concluida..." passa para dentro do novo card, abaixo do grid

### Estrutura do novo card

```text
<Card>
  <CardHeader className="pb-2 p-4">
    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
      <FileText className="h-4 w-4" />
      Dados da Venda
    </CardTitle>
  </CardHeader>
  <CardContent className="p-4 pt-0">
    <div className="grid grid-cols-3 gap-4">
      <div>
        <p className="text-xs text-muted-foreground">Codigo</p>
        <p className="text-sm font-medium font-mono">{sale.code}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Data da Venda</p>
        <p className="text-sm font-medium">{formatted date}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Estado</p>
        <Select ... />
      </div>
    </div>
    {isDeliveredAndLocked && (
      <p className="text-xs text-muted-foreground mt-3">
        Esta venda esta concluida e nao pode ser alterada.
      </p>
    )}
  </CardContent>
</Card>
```

Nenhum outro ficheiro e alterado. A logica de negocio (lock, confirmacao AlertDialog) permanece inalterada.
