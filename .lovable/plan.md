

# Corrigir Importacao de Contactos para Listas

## Problema Identificado
A importacao criou 12 clientes na tabela `crm_clients` com sucesso, mas **0 membros** foram adicionados a `client_list_members`. A chamada `addMembers.mutateAsync()` falhou silenciosamente -- o erro foi apanhado pelo `catch` generico sem feedback ao utilizador.

## Causa Raiz
1. O upsert de todos os `clientIds` de uma vez pode falhar com muitos registos
2. O erro e "engolido" pelo `catch` generico que apenas mostra "Erro na importacao" sem detalhe
3. O `result` nunca e definido quando `addMembers` falha, deixando o utilizador sem feedback claro

## Solucao

### Ficheiro: `src/components/marketing/ImportContactsModal.tsx`

**1. Dividir o upsert em batches de 100 registos**
Em vez de enviar todos os `clientIds` de uma vez, dividir em lotes de 100 para evitar timeouts ou limites de payload.

**2. Melhorar o tratamento de erros**
- Separar o erro de `addMembers` do erro de criacao de clientes
- Se a criacao de clientes funcionar mas `addMembers` falhar, ainda mostrar o resultado parcial com aviso
- Adicionar `console.error` para facilitar o debug futuro

**3. Garantir que o resultado e sempre mostrado**
Definir `result` antes de chamar `addMembers`, e atualizar se houver erro na associacao.

### Logica actualizada (pseudo-codigo):
```text
1. Criar lista (se nova)
2. Loop: criar clientes -> recolher clientIds
3. Definir resultado parcial (clientes criados)
4. Upsert membros em batches de 100
   - Se falhar: mostrar toast de aviso mas manter resultado dos clientes
5. Mostrar ecra de sucesso com contagens finais
```

### Alteracoes concretas no codigo:
- Adicionar funcao `chunkArray` para dividir arrays em lotes
- Mover `setResult` para antes do `addMembers` 
- Envolver `addMembers` num try/catch separado com toast de aviso
- Substituir o upsert unico por um loop de batches de 100

## Ficheiros a editar
- `src/components/marketing/ImportContactsModal.tsx` -- unica alteracao necessaria
