

## Correção: datas em formato serial do Excel quebram o filtro mensal

### Problema
Os valores de data no `raw_row` (ex: `"Linha de Contrato: Data de inicio": 45802`) são **números seriais do Excel**, não strings formatadas como `dd/MM/yyyy`. O filtro mensal (linhas 231-248 do `useCommissionAnalysis.ts`) tenta fazer parse de strings de data e falha em todos os items → resultado: lista vazia → "Sem dados para mostrar".

### Solução

**Ficheiro: `src/hooks/useCommissionAnalysis.ts`**

Na função de filtragem por mês (linhas 231-248), adicionar suporte para **Excel serial numbers**:

1. Detectar quando o valor de `dataInicio` é um número (ou string numérica pura como `"45802"`)
2. Converter serial do Excel para data JS: `new Date(Date.UTC(1899, 11, 30) + serial * 86400000)`
3. Manter os parsers existentes para formatos `dd/MM/yyyy`, `yyyy-MM-dd`, `dd-MM-yyyy` como fallback
4. Aplicar a mesma lógica de comparação ano+mês

Também aplicar a mesma conversão no `parseRawRow()` para exibir as datas formatadas na tabela (em vez de mostrar `45802` ao utilizador).

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — adicionar conversão de Excel serial dates no filtro e no display

