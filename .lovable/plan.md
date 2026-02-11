

## Valor Total com MWh e kWp no separador Propostas (Telecom)

### Resumo

Substituir o card "Valor Total" (moeda) por dois valores tecnico-energeticos -- **Consumo Total (MWh)** e **kWp Total** -- exclusivamente para organizacoes do nicho `telecom`. Nichos nao-telecom mantem o valor monetario atual.

### O que muda visualmente

O card "Valor Total" no topo da pagina de Propostas, para telecom:

```text
Antes:                    Depois:
+-----------------+       +-------------------+
| Valor Total     |       | Consumo / kWp     |
| 12.500,00 EUR   |       | 245,3 MWh         |
+-----------------+       | 128,5 kWp         |
                          +-------------------+
```

- Linha principal: Consumo Total em MWh (soma do `consumo_anual` de todos os CPEs de todas as propostas, dividido por 1000)
- Linha secundaria: kWp Total (soma do `kwp` das propostas do tipo servicos)

### Implementacao

**1. Novo hook `useTelecomProposalMetrics`** (ou inline na pagina)

- Query a `proposal_cpes` filtrada por `organization_id` (via join com proposals) para somar `consumo_anual`
- Query a `proposals` para somar `kwp` (onde `proposal_type = 'servicos'`)
- Retorna `{ totalMWh: number, totalKWp: number }`

**2. Alteracao em `src/pages/Proposals.tsx`**

- Importar `useAuth` para verificar `organization?.niche === 'telecom'`
- Renderizacao condicional no card "Valor Total":
  - Se telecom: mostrar MWh e kWp
  - Se nao: manter `formatCurrency(totalValue)`

### Secao Tecnica

**Hook de metricas telecom:**
- Agrega `consumo_anual` diretamente dos `proposal_cpes` ligados a propostas da organizacao (evita carregar todos os CPEs individualmente)
- Agrega `kwp` das propostas do tipo `servicos`
- Ambos os valores sao calculados sobre todas as propostas (sem filtro de status), consistente com o card "Total Propostas"

**Renderizacao condicional:**
```
isTelecom ? (
  <>
    <p className="text-2xl font-bold text-primary">{totalMWh.toFixed(1)} MWh</p>
    <p className="text-sm text-muted-foreground">{totalKWp.toFixed(1)} kWp</p>
  </>
) : (
  <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
)
```

**Ficheiros alterados:**
1. `src/pages/Proposals.tsx` -- logica condicional + calculo de metricas
