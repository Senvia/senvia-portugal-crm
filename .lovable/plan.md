

# Substituir "Estado" por "Nivel Tensao" nos CPE/CUI

## Resumo
No contexto do nicho telecom, substituir o campo "Estado" (active/inactive/pending/returned) por "Nivel Tensao" com as opcoes **BTE**, **BTN** e **MT** nos formularios e listagem de CPE/CUI.

## O que muda

1. Nova coluna `nivel_tensao` na tabela `cpes` (text, nullable)
2. Nos formularios de criar e editar CPE (apenas para nicho telecom), o campo "Estado" e substituido por "Nivel Tensao" com 3 opcoes
3. Na listagem de CPEs, o badge de estado e substituido pelo badge de nivel de tensao (para telecom)
4. Nichos nao-telecom continuam a usar o campo "Estado" normalmente

## Alteracoes tecnicas

### 1. Migracao de Base de Dados
- Adicionar coluna `nivel_tensao` (text, nullable) na tabela `cpes`

### 2. `src/types/cpes.ts`
- Adicionar tipo `NivelTensao = 'BTE' | 'BTN' | 'MT'`
- Adicionar constantes `NIVEL_TENSAO_OPTIONS`, `NIVEL_TENSAO_LABELS` e `NIVEL_TENSAO_STYLES`
- Adicionar `nivel_tensao` na interface `Cpe`

### 3. `src/components/clients/CreateCpeModal.tsx`
- Se `isTelecom`: mostrar campo "Nivel Tensao" (BTE/BTN/MT) em vez de "Estado"
- Passar `nivel_tensao` no `createCpe.mutate`

### 4. `src/components/clients/EditCpeModal.tsx`
- Se `isTelecom`: mostrar campo "Nivel Tensao" em vez de "Estado"
- Carregar e guardar `nivel_tensao` do CPE existente

### 5. `src/components/clients/CpeList.tsx`
- Se `isTelecom`: mostrar badge de "Nivel Tensao" (BTE/BTN/MT) em vez do badge de "Estado"

### 6. `src/hooks/useCpes.ts`
- Adicionar `nivel_tensao` ao tipo `CreateCpeData`

## Ficheiros alterados
- 1 migracao SQL
- `src/types/cpes.ts`
- `src/hooks/useCpes.ts`
- `src/components/clients/CreateCpeModal.tsx`
- `src/components/clients/EditCpeModal.tsx`
- `src/components/clients/CpeList.tsx`

