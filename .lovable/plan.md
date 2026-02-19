
# Indicacao de Tipo (Energia/Servicos) na Listagem de Propostas

## Objetivo
Adicionar um badge visual em cada proposta na pagina principal que indica se e do tipo "Energia" ou "Outros Servicos". Propostas sem tipo definido (nichos nao-telecom) nao mostram badge.

## Alteracao

### Ficheiro: `src/pages/Proposals.tsx`

Na listagem de cada proposta (linha ~191-202), adicionar um badge de tipo entre o badge de status e o codigo:

- **Energia**: Badge com fundo azul/indigo (ex: `bg-indigo-500/20 text-indigo-400`) com icone Zap
- **Servicos**: Badge com fundo violeta (ex: `bg-violet-500/20 text-violet-400`) com icone Wrench
- **Sem tipo**: Nao mostra badge (comportamento atual para nichos nao-telecom)

Usa os labels ja existentes em `PROPOSAL_TYPE_LABELS` do `src/types/proposals.ts`.

### Resultado visual por proposta

```text
[Aceite] [Energia] #P-001  12 Jan 2025
Cliente XYZ
                                    1.500,00 EUR
```

### Detalhes tecnicos
- Importar `PROPOSAL_TYPE_LABELS` de `@/types/proposals`
- Condicional: so renderiza o badge se `proposal.proposal_type` existir
- Cores: Energia = indigo, Servicos = violet (para distinguir visualmente do badge de status)
- Apenas 1 ficheiro editado: `src/pages/Proposals.tsx`
