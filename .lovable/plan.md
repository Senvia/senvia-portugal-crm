

## Plano: Adicionar coluna "Serviços" no detalhe de comissões

Os serviços estão no campo `servicos_produtos` (string[]) da tabela `proposals`. Cada proposta pode ter múltiplos serviços.

### Alterações

**1. `src/hooks/useLiveCommissions.ts`**
- Adicionar `servicos_produtos` ao select da query de proposals (linha 109)
- Criar um map `proposalServicosMap` para mapear proposal_id → servicos_produtos
- Adicionar campo `servicos` ao interface `CpeDetail`
- Passar os serviços para cada CPE detail

**2. `src/components/finance/CommissionsTab.tsx`**
- Adicionar `<TableHead>Serviços</TableHead>` no header do detalhe expandido
- Renderizar os serviços como badges ou texto separado por vírgulas em cada linha de CPE

### Ficheiros afetados
- `src/hooks/useLiveCommissions.ts`
- `src/components/finance/CommissionsTab.tsx`

