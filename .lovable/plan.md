

## Etapa Inicial do Lead na Criação do Formulário

### O que será feito

Adicionar na **criação e edição** do formulário um campo para selecionar a etapa da pipeline onde o lead vai cair automaticamente. O nome do formulário é adicionado às notas do lead.

### Alterações

**1. Migration: nova coluna `target_stage` na tabela `forms`**
```sql
ALTER TABLE public.forms ADD COLUMN target_stage text DEFAULT NULL;
```

**2. `src/types/index.ts`** — adicionar `target_stage?: string | null` ao interface `Form`

**3. `src/hooks/useForms.ts`** — incluir `target_stage` no `transformForm`, `CreateFormData` e `UpdateFormData`

**4. `src/components/settings/CreateFormModal.tsx`**
- Importar `usePipelineStages` e `Select`
- Adicionar campo "Etapa Inicial do Lead" com as etapas da pipeline como opções
- Opção default "Primeira etapa (padrão)" = null
- Passar `target_stage` no `createForm.mutate()`

**5. `src/components/settings/FormEditor.tsx`**
- Adicionar o mesmo Select na secção de configuração do formulário (Accordion)
- Guardar `target_stage` no `handleSave`

**6. `supabase/functions/submit-lead/index.ts`**
- No select do form (linha 134), adicionar `target_stage` aos campos
- Guardar em `formSettings.target_stage`
- Na inserção do lead (linha 251): `status: formSettings.target_stage || 'new'`
- Nas notes: adicionar `Formulário: ${formSettings.form_name}` quando existe form_name

### Ficheiros
- Migration: coluna `target_stage` em `forms`
- `src/types/index.ts`
- `src/hooks/useForms.ts`
- `src/components/settings/CreateFormModal.tsx`
- `src/components/settings/FormEditor.tsx`
- `supabase/functions/submit-lead/index.ts`

