

## Adicionar campos em falta ao Editor de Campos de Leads

### Problema

O editor de campos de leads nas Definicoes (tab "Leads") so mostra 7 campos basicos (Nome, Email, Telefone, Origem, Temperatura, Valor, Observacoes), mas a tabela `leads` e o formulario `AddLeadModal` usam mais campos que tambem deviam ser configuraveis:

- **NIF Empresa** (`company_nif`)
- **Nome Empresa** (`company_name`)
- **Tipologia** (`tipologia`) - especifico Telecom
- **Consumo Anual** (`consumo_anual`) - especifico Telecom

### Solucao

Adicionar estes 4 campos ao sistema de configuracao de campos de leads.

### Alteracoes

**Ficheiro: `src/types/field-settings.ts`**

1. Expandir o tipo `LeadFieldKey` para incluir os novos campos:
   - Adicionar `'company_nif' | 'company_name' | 'tipologia' | 'consumo_anual'`

2. Adicionar os defaults no `DEFAULT_LEAD_FIELDS_SETTINGS`:
   - `company_nif: { visible: true, required: true, label: 'NIF Empresa' }`
   - `company_name: { visible: true, required: true, label: 'Nome Empresa' }`
   - `tipologia: { visible: true, required: false, label: 'Tipologia' }`
   - `consumo_anual: { visible: true, required: false, label: 'Consumo Anual (kWh)' }`

3. Atualizar `LEAD_FIELD_ORDER` para incluir os novos campos na ordem logica:
   - `['company_nif', 'company_name', 'name', 'email', 'phone', 'source', 'temperature', 'tipologia', 'consumo_anual', 'value', 'notes']`

**Ficheiro: `src/components/settings/LeadFieldsEditor.tsx`**

4. Adicionar icones para os novos campos no `FIELD_ICONS`:
   - `company_nif`: icone `FileText`
   - `company_name`: icone `Building2` (importar do lucide-react)
   - `tipologia`: icone `ClipboardList` (importar)
   - `consumo_anual`: icone `Zap` (importar)

Nenhuma outra alteracao necessaria -- o editor ja itera sobre `LEAD_FIELD_ORDER` dinamicamente, portanto os novos campos aparecerao automaticamente.

**Nota:** A integracao destes campos configuraveis com o `AddLeadModal` (respeitar visibilidade/obrigatoriedade) e um passo futuro separado. Este plano apenas garante que os campos aparecem no editor de definicoes para o administrador configurar.

