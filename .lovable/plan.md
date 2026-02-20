

## Corrigir Leads Orfaos (Status Desalinhado com Pipeline)

### Problema

A organizacao "Perfect2Gether" usa o template Telecom, onde a etapa final negativa tem a key `perdido`. No entanto, 2 leads (AD e Joaquim) tem o status `lost` -- que e a key do template generico, nao do Telecom.

Resultado: esses leads nao aparecem em nenhuma coluna do Kanban porque nenhuma etapa da pipeline tem key = `lost`.

**Leads afetados:**
- AD (`0ea11adc`)
- Joaquim (`510c10a6`)

### Causa Raiz

Existem pontos no codigo que usam valores hardcoded como `'lost'` ou `'won'` em vez de consultar as etapas dinamicas da pipeline (`is_final_negative` / `is_final_positive`). Quando o utilizador marca um lead como "Perdido" atraves de certas acoes (ex: LostLeadDialog, conversao automatica), o sistema escreve `lost` em vez de `perdido`.

### Solucao (2 Partes)

**Parte 1 -- Correcao de dados (SQL)**

Atualizar os 2 leads orfaos para usar a key correta da pipeline:

```sql
UPDATE leads 
SET status = 'perdido' 
WHERE organization_id = '96a3950e-31be-4c6d-abed-b82968c0d7e9' 
  AND status = 'lost';
```

**Parte 2 -- Correcao no codigo**

Auditar e corrigir todos os locais que usam `'lost'` ou `'won'` hardcoded, substituindo pela logica dinamica que consulta `pipeline_stages` com `is_final_positive` / `is_final_negative`. Os ficheiros principais a corrigir:

1. **LostLeadDialog.tsx** -- Quando marca um lead como perdido, deve usar a key da etapa `is_final_negative` da pipeline da organizacao, nao `'lost'` fixo.

2. **useLeads.ts** -- O `useLeadStats()` usa `l.status === 'new'`, `'won'`, `'lost'` hardcoded. Deve usar as keys da pipeline.

3. **KanbanBoard.tsx / KanbanTabs.tsx** -- Verificar se ha logica hardcoded para filtros de "won"/"lost".

4. **Conversao Lead->Cliente** -- O trigger ou funcao que converte leads ganhos em clientes CRM pode estar a verificar `status = 'won'` em vez de `is_final_positive`.

5. **Dashboard stats** -- Qualquer widget que conte leads por "won"/"lost" deve usar a pipeline dinamica.

### Detalhes Tecnicos

Para obter a key correta dinamicamente:

```typescript
// Em vez de hardcoded 'lost':
const lostStage = stages?.find(s => s.is_final_negative);
const lostKey = lostStage?.key || 'lost'; // fallback

// Em vez de hardcoded 'won':
const wonStage = stages?.find(s => s.is_final_positive);
const wonKey = wonStage?.key || 'won'; // fallback
```

Os fallbacks garantem compatibilidade com organizacoes que ainda nao tem pipeline configurada.
