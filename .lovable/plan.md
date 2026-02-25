

## Importar Escaloes via Excel/CSV

### O que muda

Adicionar um botao **"Importar Escaloes"** (com icone FileSpreadsheet) ao lado do botao "Adicionar Linha" no `TieredTableEditor`. Ao clicar, o utilizador seleciona um ficheiro `.xlsx`, `.xls` ou `.csv` e as linhas sao automaticamente convertidas em escaloes na tabela.

### Como funciona

1. O utilizador clica em "Importar Escaloes"
2. Abre o file picker nativo (aceita `.xlsx`, `.xls`, `.csv`)
3. O ficheiro e lido com a biblioteca `xlsx` (ja instalada no projecto)
4. O sistema procura colunas pelo nome (case-insensitive, com mapeamento flexivel):
   - `kWp Min` / `kwpmin` / `kwp_min` → `kwpMin`
   - `kWp Max` / `kwpmax` / `kwp_max` → `kwpMax`
   - `Base Trans` / `base_transaccional` → `baseTransaccional`
   - `Adic Trans` / `adic_transaccional` → `adicTransaccional`
   - `Base AAS` / `base_aas` → `baseAas`
   - `Adic AAS` / `adic_aas` → `adicAas`
5. Cada linha do ficheiro vira uma nova linha na tabela (adicionada as existentes)
6. Toast de sucesso: "X escaloes importados"
7. Se nenhuma coluna for reconhecida, toast de erro com instrucoes

### Ficheiro alterado

**`src/components/settings/CommissionMatrixTab.tsx`**

- Importar `FileSpreadsheet` do lucide e `XLSX` (ja usado no projecto em `ImportStep1Upload.tsx`)
- Adicionar funcao `handleImportTiers` dentro do `TieredTableEditor`:
  - Le o ficheiro com `XLSX.read()`
  - Mapeia colunas para os campos do `SolarTier`
  - Faz `onChange({ ...rule, tiers: [...tiers, ...importedTiers] })`
- Adicionar `<input type="file" ref={...} className="hidden">` e botao "Importar Escaloes" ao lado de "Adicionar Linha"

### Formato esperado do Excel

```text
| kWp Min | kWp Max | Base Trans. | Adic. Trans. | Base AAS | Adic. AAS |
|---------|---------|-------------|--------------|----------|-----------|
| 0       | 3,5     | 200         | 50           | 150      | 40        |
| 3,5     | 7       | 300         | 45           | 250      | 35        |
| 7       | 15      | 400         | 40           | 350      | 30        |
```

Nenhuma dependencia nova necessaria — `xlsx` ja esta instalado.

