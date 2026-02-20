

## Integrar Definicoes de Campos no AddLeadModal

### Problema

O formulario de criacao de leads (`AddLeadModal`) tem um schema Zod **fixo** (hardcoded) que exige sempre `name`, `company_nif`, `company_name`, `email` e `phone` como obrigatorios -- independentemente do que o administrador configure nas Definicoes de Campos de Leads.

As definicoes guardadas na tabela `organizations` (coluna `lead_fields_settings`) nao estao a ser lidas pelo modal.

### Solucao

Tornar o schema Zod **dinamico**, construido a partir das definicoes de campos (`useLeadFieldsSettings`), e esconder campos marcados como nao visiveis.

### Alteracoes

**Ficheiro: `src/components/leads/AddLeadModal.tsx`**

1. **Importar** `useLeadFieldsSettings` e os tipos necessarios de `field-settings.ts`.

2. **Remover o schema Zod estatico** (`addLeadSchema` nas linhas 58-75).

3. **Criar uma funcao `buildLeadSchema(settings)`** que constroi o schema Zod dinamicamente:
   - Para cada campo configuravel, se `required = true` aplica `.min(1, ...)` / `.min(2, ...)`, caso contrario usa `.optional()`.
   - Campos nao visiveis sao simplesmente `.optional()` (nao validados).
   - Campos fixos como `gdpr_consent` e `automation_enabled` mantêm-se inalterados.

4. **Usar `useMemo`** para recalcular o schema quando as definicoes mudarem:
   ```typescript
   const { data: fieldSettings } = useLeadFieldsSettings();
   const schema = useMemo(() => buildLeadSchema(fieldSettings), [fieldSettings]);
   ```

5. **Passar o schema dinamico ao `useForm`**:
   ```typescript
   const form = useForm({ resolver: zodResolver(schema), ... });
   ```

6. **Esconder campos no JSX**: Para cada campo configuravel, envolver o bloco JSX numa condicao:
   ```typescript
   {fieldSettings?.email?.visible !== false && (
     <FormField name="email" ... />
   )}
   ```

7. **Labels dinamicas**: Usar `fieldSettings?.name?.label ?? 'Nome'` em vez de strings fixas nos `FormLabel`.

8. **Indicador de obrigatorio**: Mostrar `*` junto ao label apenas se o campo estiver configurado como `required`.

### Campos afetados

| Campo | Key no settings | Comportamento atual | Novo comportamento |
|-------|----------------|---------------------|-------------------|
| NIF Empresa | `company_nif` | Sempre obrigatorio | Respeita settings |
| Nome Empresa | `company_name` | Sempre obrigatorio | Respeita settings |
| Nome | `name` | Sempre obrigatorio | Respeita settings |
| Email | `email` | Sempre obrigatorio | Respeita settings |
| Telefone | `phone` | Sempre obrigatorio | Respeita settings |
| Origem | `source` | Opcional fixo | Respeita visibilidade |
| Temperatura | `temperature` | Opcional fixo | Respeita visibilidade |
| Tipologia | `tipologia` | Opcional (telecom) | Respeita visibilidade |
| Consumo Anual | `consumo_anual` | Opcional (telecom) | Respeita visibilidade |
| Valor | `value` | Opcional fixo | Respeita visibilidade |
| Observacoes | `notes` | Opcional fixo | Respeita visibilidade |

Os campos `gdpr_consent`, `automation_enabled` e `assigned_to` nao fazem parte do sistema de campos configuraveis e mantêm-se inalterados.

