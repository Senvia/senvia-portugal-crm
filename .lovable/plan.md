

## Melhorias na Página de Comissões

### 1. Adicionar soma de comissão nos totalizadores

Os cards "Totalizador EE" e "Totalizador Serviços" mostram apenas volume (MWh e kWp) mas não mostram quanto vale em comissão. Vamos adicionar o valor total de comissão em cada totalizador.

Para isso, o hook precisa separar a comissão total em duas partes: comissão de energia e comissão de serviços. Atualmente tudo está num único `totalCommission`.

**`src/hooks/useLiveCommissions.ts`**:
- Adicionar `globalEnergyCommission` e `globalServicosCommission` ao `LiveCommissionsData`
- No loop de cálculo, separar comissão por `proposal_type` (energia vs serviços)
- Manter `totalCommission` como soma dos dois

**`src/components/finance/CommissionsTab.tsx`**:
- No card EE: mostrar `formatCurrency(globalEnergyCommission)` 
- No card Serviços: mostrar `formatCurrency(globalServicosCommission)`
- Manter o badge "Total" com a soma geral

### 2. Filtrar comissões por utilizador (visibilidade)

Comerciais com `data_scope: 'own'` devem ver apenas as suas próprias comissões. Admins vêem tudo.

**`src/hooks/useLiveCommissions.ts`**:
- Receber `effectiveUserIds` (do `useTeamFilter`) como parâmetro ou usar internamente
- Após agrupar por comercial, filtrar os resultados: se `effectiveUserIds` não é `null`, manter apenas entradas cujo `userId` está na lista
- Os totalizadores globais devem refletir apenas os dados visíveis (recalcular após filtro)

**`src/components/finance/CommissionsTab.tsx`**:
- Importar `useTeamFilter` e passar o contexto de visibilidade
- Esconder o campo de pesquisa por comercial quando o utilizador só vê os seus dados (não faz sentido pesquisar)
- Opcionalmente mostrar o `TeamMemberFilter` para admins filtrarem por comercial

### Detalhe técnico

No hook, a separação de comissões por tipo será feita no loop final (linhas 210-227) onde já temos acesso ao `proposal_type` de cada CPE:

```typescript
// Por cada CommercialEntry
let energyFinal = 0;
let servicosFinal = 0;
for (const cpe of entry.cpes) {
  // ... cálculo existente ...
  if (cpe.proposal_type === 'energia') energyFinal += cpe.comissao_final;
  else servicosFinal += cpe.comissao_final;
}
```

Para a visibilidade, o filtro será aplicado no final do `queryFn` antes de retornar os dados, usando o `user.id` e `dataScope` do contexto de autenticação.

