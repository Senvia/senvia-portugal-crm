

# Corrigir Leitura de CSV com Separadores Europeus

## Problema

O parser de CSV actual usa `XLSX.read()` que assume virgula (`,`) como separador. Em Portugal e na Europa, o Excel e outros programas exportam CSVs com **ponto-e-virgula (`;`)** como separador. Resultado: os dados aparecem todos numa unica coluna em vez de separados correctamente.

Alem disso, ficheiros CSV podem ter encoding diferente (ex: ISO-8859-1 em vez de UTF-8), causando caracteres estranhos nos acentos.

## Solucao

Implementar um parser de CSV robusto que:
1. Detecta automaticamente o separador (`,` ou `;` ou `\t`)
2. Suporta campos entre aspas que contem o separador
3. Trata o encoding correctamente (UTF-8 e ISO-8859-1)

## Alteracoes

### `src/components/marketing/import/ImportStep1Upload.tsx`

1. **Detectar se o ficheiro e CSV** (extensao `.csv` ou `.txt`)
   - Se for CSV/TXT: usar parser customizado em vez de XLSX
   - Se for XLSX/XLS: manter o parser XLSX actual

2. **Parser CSV customizado**:
   - Ler o ficheiro como texto (com fallback de encoding)
   - Analisar a primeira linha para detectar o separador mais provavel (contar ocorrencias de `,`, `;` e `\t`)
   - Fazer split das linhas respeitando campos entre aspas
   - Converter para o mesmo formato `Record<string, string>[]` que o XLSX produz

3. **Encoding**:
   - Tentar ler como UTF-8 primeiro
   - Se detectar caracteres invalidos, tentar ISO-8859-1 (Latin-1), que e o encoding comum do Excel em Portugal

## Detalhes Tecnicos

A funcao `handleFile` sera actualizada para:

```text
Se extensao == .csv ou .txt:
  1. Ler como texto (TextDecoder UTF-8)
  2. Detectar separador na primeira linha
  3. Fazer parse linha a linha (com suporte a aspas)
  4. Se charset parecer errado, re-ler com ISO-8859-1
  5. Retornar headers + rows
Senao:
  Manter o XLSX.read actual
```

## Ficheiros a editar

- `src/components/marketing/import/ImportStep1Upload.tsx`

## Resultado

- CSVs exportados do Excel em PT funcionam correctamente (separador `;`)
- CSVs com separador `,` continuam a funcionar
- Ficheiros TSV (separador tab) tambem sao suportados
- Acentos portugueses (a, e, c, etc.) sao preservados
- Ficheiros XLSX continuam a usar o parser actual sem alteracoes
