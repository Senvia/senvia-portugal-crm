

## Bug: Nome da empresa continua a ir para o campo "Nome" do cliente

### Causa raiz

O problema está na linha 284-286 do `src/pages/Leads.tsx`. A correção anterior tem um erro lógico:

```typescript
name: lead.company_name && lead.name === lead.company_name 
  ? lead.company_name   // ← BUG: continua a passar o company_name como nome!
  : lead.name,
```

Quando `lead.name === lead.company_name` (o que acontece sempre em Telecom porque o `AddLeadModal` faz `name: data.company_name || data.name`), o código deveria usar um nome genérico ou vazio, mas em vez disso passa `lead.company_name` como nome do cliente.

### Correção

**`src/pages/Leads.tsx`** (linhas 282-291):

Quando `lead.name === lead.company_name`, significa que não há um nome de contacto separado. Nesse caso, o `name` do cliente deve ser o `company_name` (porque é obrigatório ter nome), mas o campo `company` também deve ser preenchido. A lógica actual já preenche `company`, mas o `name` continua igual.

A solução real: o campo `name` do cliente é obrigatório, portanto se o único dado que temos é o nome da empresa, temos de o usar como `name`. O verdadeiro problema é que o `company` não estava a ser passado (já corrigido) e agora está correto.

Contudo, se o utilizador quer que quando `lead.name === lead.company_name`, o nome do cliente fique vazio e só a empresa fique preenchida, isso não é possível porque `name` é NOT NULL na tabela `crm_clients`.

A melhor abordagem é manter o nome da empresa no campo `name` quando não existe nome de contacto separado, mas garantir que `company` também é preenchido. Isso já está a acontecer na linha 289.

**Verificação adicional**: O problema pode estar no `AddLeadModal` (linha 202) que, para Telecom, grava `company_name` no campo `name` da lead. Quando a lead é convertida, ambos os campos são iguais e não há forma de distinguir.

### Solução proposta

Alterar a lógica para que, quando existem ambos `company_name` e `name` na lead e são diferentes, use o `name` real. Quando são iguais (fallback do Telecom), use o `company_name` como nome mas sinalize que é empresa:

```typescript
// Se lead.name é diferente de company_name, temos nome real do contacto
// Se são iguais, é o fallback do Telecom - usar company_name como nome
name: (lead.name && lead.name !== lead.company_name) 
  ? lead.name 
  : (lead.company_name || lead.name),
company: lead.company_name || undefined,
```

Isto é essencialmente o que já está implementado. O comportamento correto é: o campo `name` terá o nome da empresa quando não há contacto separado (inevitável com dados Telecom), mas o campo `company` agora também estará preenchido.

Se o que pretende é que o campo "Nome" do cliente fique com o nome do contacto (pessoa) e nunca com o nome da empresa, a correção deve ser feita no **AddLeadModal** para forçar a separação dos campos e nunca fazer o fallback `name = company_name`.

### Plano final

1. **`src/components/leads/AddLeadModal.tsx`** (linha 202): Remover o fallback que copia `company_name` para `name` em Telecom. Passar o `name` real (pode ser vazio se não preenchido)
2. **`src/pages/Leads.tsx`** (linha 284): Ajustar para usar `lead.name` quando é diferente de `company_name`, e fallback para `company_name` apenas quando `name` está vazio

```typescript
// AddLeadModal.tsx linha 202
name: data.name || data.company_name || '',

// Leads.tsx linha 284-286
name: (lead.name && lead.name !== lead.company_name) 
  ? lead.name 
  : (lead.company_name || lead.name || 'Sem nome'),
company: lead.company_name || undefined,
```

Alteração em 2 ficheiros, ~4 linhas modificadas.
