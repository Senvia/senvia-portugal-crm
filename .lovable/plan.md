

## Reorganizar modal de detalhes da proposta

### Problema

1. O campo "Valor Total" no topo e editavel diretamente no modal de detalhes -- deveria ser apenas de leitura (so editavel via "Editar Proposta")
2. A ordem dos elementos nao corresponde ao pretendido

### Ordem atual vs pretendida

```text
ATUAL                          PRETENDIDO
--------------------------     --------------------------
Valor/Consumo + Data           Proposta (codigo + data)
Cliente                        Cliente
Status                         Status
Tipo (telecom)                 Produtos/Servicos
CPEs (telecom)                 Valor Total (read-only)
Servicos (telecom)             Observacoes
Produtos
Observacoes
```

### Solucao

**Ficheiro: `src/components/proposals/ProposalDetailsModal.tsx`**

1. **Bloco do topo (linhas 555-600)**: Remover o Input editavel do valor. Substituir por um bloco simples com codigo da proposta + data. Para telecom, manter o resumo de consumo MWh neste bloco.

2. **Mover "Cliente" para logo apos o bloco de proposta** (ja esta na posicao correta, linhas 602-632)

3. **Mover "Status" para apos cliente** (ja esta na posicao correta, linhas 634-652)

4. **Mover secao de Produtos/Servicos (linhas 802-821) + CPEs telecom (linhas 669-758) + Servicos telecom (linhas 760-800) para apos o status**

5. **Adicionar bloco "Valor Total" read-only apos os produtos**: Mostrar `formatCurrency(proposal.total_value)` como texto simples, sem Input

6. **Observacoes ficam no final** (ja esta na posicao correta, linhas 824-834)

7. **Remover `handleValueBlur` e `editValue` state** -- ja nao sao necessarios pois o valor so e editavel via EditProposalModal

### Detalhes tecnicos

**Alteracoes no bloco do topo (linhas 555-600):**
- Remover a branch nao-telecom com o `<Input>` editavel
- Para telecom: manter resumo de consumo MWh
- Para nao-telecom: mostrar apenas codigo da proposta e data (sem valor)

**Novo bloco "Valor Total" (apos produtos, antes de observacoes):**
```tsx
<div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
  <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
  <p className="text-2xl font-bold text-primary">
    {formatCurrency(proposal.total_value)}
  </p>
</div>
```

**Remover:**
- State `editValue` (linha 75)
- `setEditValue` no useEffect (linha 99)
- Funcao `handleValueBlur` (linhas 151-156)

**Nova ordem dos elementos no JSX:**
1. Header com codigo + data (+ consumo MWh se telecom)
2. Cliente
3. Status
4. Tipo badge (telecom only)
5. CPEs (telecom only)
6. Servicos telecom (telecom only)
7. Produtos/Servicos (todos os nichos)
8. Valor Total (read-only)
9. Observacoes

| Ficheiro | Alteracao |
|---|---|
| `src/components/proposals/ProposalDetailsModal.tsx` | Remover edicao inline do valor; reorganizar ordem dos blocos; adicionar valor total read-only |

