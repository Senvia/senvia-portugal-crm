

# Melhorar Validacao de NIF -- Mostrar Codigo do Cliente

## Situacao Atual

A validacao de NIF duplicado **ja funciona em tempo real** com debounce de 300ms. Enquanto o utilizador digita, apos parar 300ms o sistema verifica automaticamente se o NIF ja existe. Se existir, bloqueia o botao de gravar e mostra uma mensagem.

Porem, a mensagem atual so mostra o **nome** do cliente. O utilizador quer ver tambem o **codigo** do cliente para identificar mais facilmente.

## Alteracoes

### 1. Hook `src/hooks/useNifValidation.ts`

- Adicionar `code` ao SELECT: `.select("id, name, code")`
- Retornar `existingClientCode` no resultado

### 2. Mensagem de alerta nos modais

Atualizar a mensagem em `CreateClientModal.tsx` e `EditClientModal.tsx` de:

```text
Ja existe um cliente com este NIF: Joao Silva
```

Para:

```text
Ja existe um cliente com este NIF: CLI-0042 - Joao Silva
```

Se o codigo for nulo, mostra apenas o nome como antes.

### Ficheiros alterados

- `src/hooks/useNifValidation.ts` -- adicionar `code` ao select e ao retorno
- `src/components/clients/CreateClientModal.tsx` -- atualizar mensagem de alerta
- `src/components/clients/EditClientModal.tsx` -- atualizar mensagem de alerta

