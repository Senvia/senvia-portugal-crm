
# Auto-preencher Lead com dados de Cliente existente

## Objetivo
Ao criar uma lead manualmente, quando o utilizador preenche o email ou telefone, o sistema verifica se ja existe um cliente (`crm_clients`) com esses dados e, se sim, preenche automaticamente os campos restantes (nome, email, telefone, notas) e mostra um aviso visual.

## Como funciona

1. O utilizador comeca a preencher o campo **email** ou **telefone**
2. Ao sair do campo (on blur), o sistema faz uma pesquisa na tabela `crm_clients` por email ou telefone correspondente
3. Se encontrar um cliente existente:
   - Mostra um banner informativo: "Cliente existente encontrado: [Nome]"
   - Preenche automaticamente os campos vazios (nome, email, telefone, notas)
   - O utilizador pode editar qualquer campo preenchido
4. Se nao encontrar, nada muda

## Alteracoes

### Ficheiro: `src/components/leads/AddLeadModal.tsx`

1. **Importar** `supabase` e `useAuth` (ja importado) para fazer a pesquisa
2. **Adicionar estado** `matchedClient` para guardar o cliente encontrado e `isSearching` para loading
3. **Criar funcao `searchClient`** que:
   - Recebe email ou telefone
   - Pesquisa na tabela `crm_clients` com `organization_id` filtrado
   - Se encontrar, faz `form.setValue` nos campos vazios
4. **Adicionar `onBlur`** nos campos de email e telefone para disparar a pesquisa
5. **Mostrar banner** com icone e nome do cliente quando encontrado, com botao para limpar a associacao

### Detalhe tecnico

```
Fluxo:
  Email/Phone onBlur
       |
       v
  Query crm_clients WHERE email = X OR phone = X
       |
       v
  [Match found?]
    Sim -> setValue(name, email, phone, notes) + mostrar banner
    Nao -> nada
```

**Nova funcao no componente:**
```typescript
const searchExistingClient = async (field: 'email' | 'phone', value: string) => {
  if (!value || !organization?.id) return;
  
  const { data } = await supabase
    .from('crm_clients')
    .select('id, name, email, phone, notes')
    .eq('organization_id', organization.id)
    .eq(field, value)
    .limit(1)
    .maybeSingle();
  
  if (data) {
    setMatchedClient(data);
    // Auto-fill empty fields
    if (!form.getValues('name')) form.setValue('name', data.name);
    if (!form.getValues('email') && data.email) form.setValue('email', data.email);
    if (!form.getValues('phone') && data.phone) form.setValue('phone', data.phone);
  }
};
```

**Banner visual (acima dos campos do formulario):**
- Fundo amarelo/amber suave com icone de utilizador
- Texto: "Cliente existente: [Nome]"
- Botao X para descartar a associacao

### Resultado
- 1 ficheiro alterado (`src/components/leads/AddLeadModal.tsx`)
- 0 alteracoes de base de dados
- A pesquisa usa os dados ja carregados ou faz query direta (mais preciso)
- Nao bloqueia a criacao da lead - apenas preenche campos como sugestao
