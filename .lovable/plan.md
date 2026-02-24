

# Corrigir Cards de Clientes -- MWh e kWp como subtexto (estilo Propostas)

## Problema

Os cards de MWh e kWp foram criados como cards separados, mas o utilizador quer que essa informacao apareca **dentro do card de Comissao**, como subtexto -- exatamente como funciona na pagina de Propostas.

Na pagina de Propostas, o padrao e:

```text
Valor Total
25.000,00 EUR        <-- valor principal
12.5 MWh . 8.3 kWp   <-- subtexto pequeno
```

## Solucao

### Ficheiro: `src/pages/Clients.tsx`

1. **Reverter a grid** para `grid-cols-2 md:grid-cols-5` (remover a logica condicional de 7 colunas)
2. **Remover os 2 cards separados** de MWh e kWp
3. **No card de Comissao (telecom)**, adicionar uma linha de subtexto abaixo do valor:

```text
Comissao Total
1.234,56 EUR
12.50 MWh . 8.30 kWp   <-- nova linha (text-xs text-muted-foreground)
```

4. Para nichos nao-telecom, manter o card "Valor Total" sem alteracoes

### Resultado visual

```text
Antes (7 cards):
[Total] [Ativos] [VIP] [Inativos] [Comissao] [MWh] [kWp]

Depois (5 cards, como Propostas):
[Total] [Ativos] [VIP] [Inativos] [Comissao Total]
                                    1.234,56 EUR
                                    12.5 MWh . 8.3 kWp
```

### Detalhe tecnico

Apenas 1 ficheiro alterado: `src/pages/Clients.tsx`

- Remover import `Zap` (ja nao e necessario nos cards de stats)
- Grid volta a ser fixa: `grid-cols-2 md:grid-cols-5 gap-4`
- Card telecom fica com estrutura:

```tsx
<p className="text-2xl font-bold">{formatCurrency(stats.totalComissao)}</p>
<p className="text-xs text-muted-foreground">Comissao Total</p>
<p className="text-xs text-muted-foreground mt-1">
  {stats.totalMwh.toFixed(1)} MWh . {stats.totalKwp.toFixed(1)} kWp
</p>
```

