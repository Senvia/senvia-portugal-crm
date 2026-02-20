

## Corrigir validacao de campo de identificacao de Leads

### Problema

A validacao atual exige que o campo **Nome** esteja sempre visivel e obrigatorio. Na realidade, basta que **pelo menos um** dos seguintes campos de identificacao esteja visivel e obrigatorio:

- Nome (`name`)
- Nome Empresa (`company_name`)
- NIF Empresa (`company_nif`)

### Alteracoes

**Ficheiro: `src/components/settings/LeadFieldsEditor.tsx`**

1. **Linha 32-34** - Atualizar a logica `hasIdentificationField` para verificar se pelo menos um dos tres campos de identificacao esta visivel E obrigatorio:

```typescript
const hasIdentificationField = useMemo(() => {
  return (
    (settings.name.visible && settings.name.required) ||
    (settings.company_name.visible && settings.company_name.required) ||
    (settings.company_nif.visible && settings.company_nif.required)
  );
}, [settings.name, settings.company_name, settings.company_nif]);
```

2. **Linha ~105** - Atualizar a mensagem de alerta de erro:

De: `O campo Nome deve ser visível e obrigatório para identificar o lead.`

Para: `Pelo menos um campo de identificação (Nome, Nome Empresa ou NIF Empresa) deve ser visível e obrigatório.`

3. **Linha ~110** - Atualizar a nota informativa no fundo:

De: `O campo Nome é necessário para identificar cada lead.`

Para: `Pelo menos um campo de identificação (Nome, Nome Empresa ou NIF) é necessário para identificar cada lead.`

Nenhuma outra alteracao necessaria. A logica do botao Guardar ja depende de `hasIdentificationField`, portanto continuara a bloquear caso nenhum campo de identificacao esteja configurado.

