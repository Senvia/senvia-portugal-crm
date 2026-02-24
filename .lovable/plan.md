
# Inverter ordem nos Cards de Clientes (label em cima, valor em baixo)

## Problema

Nos cards da pagina de Propostas, o nome/label aparece **em cima** e o valor em baixo. Nos cards de Clientes, esta ao contrario (valor em cima, label em baixo). O utilizador quer uniformizar.

## Solucao

### Ficheiro: `src/pages/Clients.tsx`

Em todos os 5 cards de estatisticas (Total, Ativos, VIP, Inativos, Comissao/Valor Total), inverter a ordem dos elementos para:

```text
Antes:
  42          <-- valor (text-2xl font-bold)
  Total       <-- label (text-xs text-muted-foreground)

Depois (como Propostas):
  Total       <-- label (text-sm text-muted-foreground)
  42          <-- valor (text-2xl font-bold)
```

Tambem ajustar o tamanho do texto do label de `text-xs` para `text-sm` para ficar consistente com as Propostas.

Afeta os 5 cards + o card condicional telecom/generico. Apenas 1 ficheiro alterado.
