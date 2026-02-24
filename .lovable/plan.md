
# Bloquear botao "Criar Lead" quando NIF duplicado

## Problema

O modal "Adicionar Lead" mostra um aviso quando o NIF ja existe como cliente, mas o botao "Criar Lead" continua ativo. O utilizador consegue criar o lead mesmo com NIF duplicado.

## Causa

O `AddLeadModal` usa uma funcao `searchExistingClient` que apenas mostra um banner informativo. Nao utiliza o hook `useNifValidation` e nao bloqueia a submissao.

## Solucao

Integrar o hook `useNifValidation` no `AddLeadModal` para o campo `company_nif` e desativar o botao "Criar Lead" quando for detetado um NIF duplicado na tabela `crm_clients`.

## Secao Tecnica

### Ficheiro: `src/components/leads/AddLeadModal.tsx`

1. Importar o hook `useNifValidation`
2. Chamar o hook com o valor do campo `company_nif` e o `organization?.id`
3. Mostrar mensagem de erro abaixo do campo NIF: "Ja existe um cliente com este NIF: [Codigo] - [Nome]" (texto vermelho, `text-xs text-destructive`)
4. Adicionar `nifValidation.isDuplicate` a condicao `disabled` do botao "Criar Lead" (linha 715)

Resultado: O botao fica desativado em tempo real enquanto o NIF digitado corresponder a um cliente existente, com feedback visual claro.

### Logica do botao (antes vs depois)

```text
Antes:  disabled={createLead.isPending}
Depois: disabled={createLead.isPending || nifValidation.isDuplicate}
```

### Ficheiros alterados

- `src/components/leads/AddLeadModal.tsx` -- unico ficheiro a alterar
