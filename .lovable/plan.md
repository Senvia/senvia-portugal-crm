

# Corrigir Parsing do Saldo Inicial (Formato Europeu)

## Problema
O campo "Saldo Inicial" usa `parseFloat()` que nao suporta o formato numerico portugues (ex: "1.376,59" ou "1 376,59"). O `parseFloat` para de ler ao encontrar um espaco ou um segundo ponto, resultando em valores errados (1 EUR em vez de 1.376,59 EUR).

## Solucao
Criar uma funcao `parseLocalizedNumber()` que:
1. Remove espacos e pontos usados como separador de milhares
2. Converte a virgula decimal para ponto
3. So entao faz o `parseFloat`

## Ficheiros a alterar

### 1. `src/lib/format.ts`
- Adicionar funcao `parseLocalizedNumber(value: string): number`
- Logica: detectar automaticamente se a virgula ou o ponto e o separador decimal (baseado na posicao — o ultimo separador e o decimal)

### 2. `src/components/finance/CreateBankAccountModal.tsx`
- Substituir `parseFloat(initialBalance.replace(',', '.'))` por `parseLocalizedNumber(initialBalance)`

### 3. Corrigir o valor actual na base de dados
- Depois de implementar, o utilizador pode editar a conta existente e corrigir o saldo, ou eliminar e recriar

## Detalhes Tecnicos

```text
parseLocalizedNumber("1.376,59")  => 1376.59
parseLocalizedNumber("1 376,59")  => 1376.59
parseLocalizedNumber("1,376.59")  => 1376.59
parseLocalizedNumber("1376.59")   => 1376.59
parseLocalizedNumber("1376,59")   => 1376.59
parseLocalizedNumber("0,00")      => 0
```

A funcao detecta o formato automaticamente: o ultimo separador (virgula ou ponto) e tratado como decimal, os restantes sao removidos como separadores de milhares.

