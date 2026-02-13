

# Suporte a Multiplas Listas na Campanha

## Problema

O selector de listas de transmissao na campanha usa um dropdown simples (`Select`) que so permite uma lista. Ao clicar "Carregar todos", os contactos anteriores sao substituidos em vez de acumulados.

## Solucao

Permitir seleccionar varias listas e acumular os contactos de todas elas, evitando duplicados por email.

## Alteracoes

### `src/components/marketing/CreateCampaignModal.tsx`

1. **Substituir `selectedListId` (string) por `selectedListIds` (string[])**
   - Usar checkboxes em vez de dropdown para permitir multipla seleccao de listas

2. **Botao "Carregar todos" passa a acumular**
   - Em vez de `setSelectedClients(clientsFromList)`, usar logica de merge:
   - Junta os contactos da lista seleccionada aos ja existentes
   - Remove duplicados baseando-se no email (contactos com o mesmo email nao sao adicionados duas vezes)

3. **UI actualizada**
   - Lista de listas com checkboxes (em vez de Select dropdown)
   - Cada lista seleccionada mostra a contagem de membros
   - Botao "Carregar contactos" que carrega todas as listas seleccionadas de uma vez
   - Indicador visual de quantos contactos ja foram carregados e de que listas

4. **Query de membros**
   - Buscar membros de todas as listas seleccionadas (nao apenas uma)
   - O hook `useListMembers` recebe um array de IDs em vez de um unico ID

## Resultado

O utilizador pode seleccionar 2 ou mais listas de transmissao, carregar os contactos de todas, e o sistema junta-os automaticamente sem duplicados.
