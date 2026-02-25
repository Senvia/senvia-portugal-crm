

## Corrigir Pipeline Telecom: Exactamente 5 Estados

### Situação Actual

A organização Telecom ("Perfect2Gether") tem **7 etapas** na base de dados:

```text
1. Lead (new)
2. Contactado (contactado)
3. Agendado (scheduled)
4. Proposta (proposal)       ← REMOVER
5. Instalação (installation) ← REMOVER
6. Ativo (active)            ← REMOVER (is_final_positive)
7. Perdido (perdido)         ← MANTER (is_final_negative)
```

O utilizador quer **apenas 5**:

```text
1. Lead
2. Contactado
3. Agendado
4. Ganha (is_final_positive) ← renomear de "Ativo" para "Ganha", key "won"
5. Perdido (is_final_negative)
```

### Leads Afectados

Existem **2 leads com status `active`** (Nuno Dias, totallink) que precisam ser migrados para o novo status `won` (Ganha). Nenhum lead tem status `proposal` ou `installation`.

---

### Plano de Alterações

#### 1. Base de Dados — Migração SQL

- **Eliminar** as etapas `proposal`, `installation` e `active` da tabela `pipeline_stages` para a org Telecom
- **Inserir** (ou actualizar) a etapa "Ganha" com key `won`, position 4, `is_final_positive = true`
- **Actualizar** a position do "Perdido" para 5
- **Migrar** os 2 leads com `status = 'active'` para `status = 'won'`

Concretamente:
```sql
-- 1. Migrar leads de 'active' para 'won'
UPDATE leads SET status = 'won' WHERE organization_id = '<telecom_org_id>' AND status = 'active';

-- 2. Eliminar etapas removidas
DELETE FROM pipeline_stages WHERE organization_id = '<telecom_org_id>' AND key IN ('proposal', 'installation', 'active');

-- 3. Inserir etapa "Ganha"
INSERT INTO pipeline_stages (organization_id, key, name, color, position, is_final_positive, is_final_negative)
VALUES ('<telecom_org_id>', 'won', 'Ganha', '#22C55E', 4, true, false);

-- 4. Actualizar position do Perdido
UPDATE pipeline_stages SET position = 5 WHERE organization_id = '<telecom_org_id>' AND key = 'perdido';
```

#### 2. Template — `src/lib/pipeline-templates.ts`

Actualizar o template `telecom` para reflectir exactamente os 5 estados, para que novas organizações Telecom sejam criadas com o pipeline correcto:

```typescript
// telecom stages
stages: [
  { name: 'Lead', key: 'new', color: '#3B82F6', position: 1, is_final_positive: false, is_final_negative: false },
  { name: 'Contactado', key: 'contactado', color: '#A855F7', position: 2, is_final_positive: false, is_final_negative: false },
  { name: 'Agendado', key: 'scheduled', color: '#F59E0B', position: 3, is_final_positive: false, is_final_negative: false },
  { name: 'Ganha', key: 'won', color: '#22C55E', position: 4, is_final_positive: true, is_final_negative: false },
  { name: 'Perdido', key: 'perdido', color: '#6B7280', position: 5, is_final_positive: false, is_final_negative: true },
],
```

#### 3. Memory — Pipeline Telecom

Actualizar a referência para "5 etapas: Lead, Contactado, Agendado, Ganha, Perdido" (em vez da descrição anterior).

---

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| Base de dados (migração) | Eliminar 3 etapas, inserir "Ganha", migrar 2 leads |
| `src/lib/pipeline-templates.ts` | Actualizar template telecom para 5 etapas |

### Nota

Como o sistema já usa flags dinâmicas (`is_final_positive`/`is_final_negative`) em vez de strings hardcoded, o Kanban, dashboard e conversão de leads vão funcionar automaticamente com o novo pipeline sem necessidade de alterar mais ficheiros.

