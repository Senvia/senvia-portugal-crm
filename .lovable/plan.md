

# Bloquear Criacao de Lead quando NIF pertence a Cliente Existente

## Resumo

Quando o utilizador digita um NIF no modal "Adicionar Lead" e esse NIF ja pertence a um cliente existente (`crm_clients`), o formulario deve:

1. Mostrar os dados do cliente (ja acontece)
2. **Bloquear completamente** a criacao -- o botao "Criar Lead" fica desativado e aparece uma mensagem clara a explicar que nao e possivel criar um lead para um NIF que ja e cliente

## Logica

Se o NIF ja existe na tabela `crm_clients`, significa que essa entidade ja passou por um estado final da pipeline (ganho/perdido) e foi convertida em cliente. Criar um novo lead com o mesmo NIF nao faz sentido.

## Situacao Atual

- O hook `useNifValidation` ja deteta NIFs duplicados na `crm_clients` e bloqueia o botao
- Porem, o `searchExistingClient` (onBlur) preenche campos automaticamente e mostra um banner informativo que da a entender que e possivel continuar

## Alteracoes

### Ficheiro: `src/components/leads/AddLeadModal.tsx`

1. **Banner de cliente existente** -- Alterar o banner amarelo (`matchedClient`) para vermelho/destrutivo quando o NIF pertence a um cliente, com mensagem clara: "Este NIF ja pertence a um cliente existente. Nao e possivel criar um novo lead."

2. **Nao preencher campos automaticamente** -- Quando `nifValidation.isDuplicate` e verdadeiro, os campos do formulario nao devem ser preenchidos automaticamente (remover o auto-fill do `searchExistingClient` quando ha match)

3. **Botao "Criar Lead"** -- Ja esta bloqueado por `nifValidation.isDuplicate` (implementado anteriormente). Manter.

4. **Mensagem junto ao NIF** -- A mensagem vermelha abaixo do campo NIF ja existe. Reforcar com texto mais explicito: "Este NIF pertence ao cliente {codigo} - {nome}. Nao e possivel criar leads duplicados."

### Resultado esperado

- Utilizador digita NIF -> sistema verifica em tempo real (300ms debounce)
- Se NIF pertence a cliente: banner vermelho + mensagem no campo + botao bloqueado
- Campos do formulario NAO sao preenchidos automaticamente (para nao dar a impressao de que pode editar/submeter)

### Secao Tecnica

**Alteracoes no `searchExistingClient`:**
- Adicionar verificacao: se `nifValidation.isDuplicate`, nao fazer auto-fill dos campos
- Ou alternativamente, deixar o `searchExistingClient` preencher mas tornar todos os campos `disabled` quando ha duplicado (para mostrar os dados sem permitir edicao)

**Opcao escolhida:** Mostrar os dados preenchidos mas com todos os inputs `disabled` quando `nifValidation.isDuplicate === true`. Isto permite ao utilizador ver a quem pertence o NIF sem poder editar ou submeter.

**Logica concreta:**
- Quando `nifValidation.isDuplicate` e `true`, adicionar `disabled` a todos os inputs do formulario
- Alterar o banner de amarelo para vermelho com icone de alerta
- Alterar texto da mensagem abaixo do NIF para ser mais explicito sobre o bloqueio

### Ficheiros a alterar

- `src/components/leads/AddLeadModal.tsx` -- unico ficheiro

