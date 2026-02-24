

# Validacao de NIF Duplicado ao Criar/Editar Cliente

## Problema

Atualmente, e possivel criar ou editar clientes com um NIF (pessoal ou de empresa) que ja existe noutro cliente da mesma organizacao. Nao ha qualquer alerta nem bloqueio.

## Solucao

Adicionar validacao em tempo real nos campos de NIF (cliente e empresa) que:
1. Verifica se ja existe outro cliente na mesma organizacao com o mesmo NIF
2. Mostra um alerta visual inline (texto vermelho abaixo do campo)
3. Bloqueia o botao de gravar enquanto houver conflito

A validacao sera feita no frontend com uma query ao banco de dados usando debounce para nao sobrecarregar.

## Secao Tecnica

### Novo hook: `src/hooks/useNifValidation.ts`

Hook reutilizavel que recebe o NIF, o tipo (`nif` ou `company_nif`), o `organizationId` e um `excludeClientId` opcional (para edicao).

- Usa `useQuery` com debounce (300ms) para pesquisar na tabela `crm_clients`
- Query: `SELECT id, name FROM crm_clients WHERE organization_id = X AND (nif = Y OR company_nif = Y) AND id != excludeId LIMIT 1`
- Retorna `{ isDuplicate: boolean, existingClientName: string | null }`
- So executa se o NIF tiver pelo menos 5 caracteres (NIFs portugueses tem 9)

### Ficheiros alterados

**`src/components/clients/CreateClientModal.tsx`**:
- Importar e usar `useNifValidation` para os campos `nif` e `companyNif`
- Abaixo de cada campo de NIF, mostrar mensagem de erro: "Ja existe um cliente com este NIF: [Nome do Cliente]"
- Adicionar condicao ao `isValid`: se `isDuplicate` for true para qualquer NIF, bloquear submit
- Estilo do alerta: `text-xs text-destructive mt-1`

**`src/components/clients/EditClientModal.tsx`**:
- Mesma logica, mas passando `excludeClientId = client.id` para ignorar o proprio cliente na validacao

### Fluxo do utilizador

1. Utilizador preenche o campo NIF (pessoal ou empresa)
2. Apos 300ms sem digitar, o sistema verifica se ja existe
3. Se existir, aparece: "Ja existe um cliente com este NIF: Joao Silva" em vermelho
4. O botao "Criar/Guardar" fica desativado
5. Se o utilizador corrigir o NIF, a mensagem desaparece e o botao volta a ficar ativo

### Validacao abrangida

- NIF do cliente (`nif`)
- NIF da empresa (`company_nif`)
- Ambos verificados contra ambos os campos (um NIF de empresa nao pode ser igual ao NIF pessoal de outro cliente e vice-versa)

