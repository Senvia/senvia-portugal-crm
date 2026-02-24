

# Corrigir Cards de Estatísticas na Página de Clientes (Telecom)

## Problema

Na pagina `/clients`, o ultimo card de stats so mostra "Comissao Total" para o nicho telecom. Faltam os cards de **MWh** e **kWp** que o utilizador espera ver.

## Solucao

Substituir o card unico "Comissao Total" por **3 cards separados** quando o nicho e telecom:
- Comissao (euro)
- MWh
- kWp

Para outros nichos, manter o card "Valor Total" como esta.

## Secao Tecnica

### Ficheiro alterado

**`src/pages/Clients.tsx`** (linhas 203-222)

Substituir o card unico condicional por 3 cards para telecom:

```text
Antes (telecom):
  [Total] [Ativos] [VIP] [Inativos] [Comissao Total]

Depois (telecom):
  [Total] [Ativos] [VIP] [Inativos] [Comissao] [MWh] [kWp]
```

- Mudar a grid de `grid-cols-2 md:grid-cols-5` para `grid-cols-2 md:grid-cols-5 lg:grid-cols-7` quando telecom, ou usar renderizacao condicional com 3 cards pequenos
- Alternativa mais simples: manter a grid de 5 colunas em desktop, mas para telecom substituir o ultimo card por 3 mini-cards empilhados ou usar uma grid adaptada com `col-span`

A abordagem mais limpa:
- Para telecom: grid com 7 colunas em desktop (`grid-cols-2 md:grid-cols-4 lg:grid-cols-7`) com os 3 cards extras
- Para generico: manter `grid-cols-2 md:grid-cols-5` com o card "Valor Total"

Cada card tera:
1. **Comissao** -- icone Euro, cor success, valor `formatCurrency(stats.totalComissao)`
2. **MWh** -- icone Zap, valor `stats.totalMwh.toFixed(2)`
3. **kWp** -- icone Zap, valor `stats.totalKwp.toFixed(2)`

### Hook `useClientStats`

Verificar que `totalMwh` e `totalKwp` ja estao a ser calculados (foram adicionados na implementacao anterior).
