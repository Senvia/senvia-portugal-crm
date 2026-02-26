

## Plano: Aplicar cálculo automático de duração nas Vendas (telecom energia)

A mesma lógica das Propostas: o utilizador preenche **Início** e **Fim do Contrato**, e a **Duração** é calculada automaticamente (read-only). Afeta 3 ficheiros.

---

### 1. `src/components/sales/EditSaleModal.tsx` — CPEs editáveis

**Secção CPEs (linhas 768-793):** Adicionar campos `contrato_inicio` e `contrato_fim` (inputs `type="date"`) ao grid de cada CPE. Adicionar campo `duracao_contrato` read-only (`disabled`, `bg-muted`) auto-calculado. Quando `contrato_inicio` ou `contrato_fim` muda, calcular `duracao_contrato` automaticamente:
```
days = (fim - inicio) / 86400000; duracao = (days / 365).toFixed(3)
```

**Secção "Dados de Energia" (linhas 657-677):** Tornar o campo "Anos de Contrato" read-only (`disabled`, `bg-muted`), pois a duração agora vem dos CPEs ou é derivada das datas.

### 2. `src/components/sales/CreateSaleModal.tsx` — CPEs (read-only preview)

**Secção CPE/CUI (linhas 837-918):** Já mostra `contrato_inicio` e `contrato_fim` — sem alteração de lógica necessária, apenas garantir que `duracao_contrato` aparece como auto.

**Secção "Dados de Energia" (linhas 750-835):** Os dados energia são read-only neste modal (vêm da proposta). Sem alteração necessária.

### 3. `src/components/sales/SaleDetailsModal.tsx` — Visualização

**Secção CPEs (linhas 410-460 aprox.):** Já mostra `contrato_inicio`, `contrato_fim` e `duracao_contrato`. Sem alteração necessária — apenas exibe dados.

**Secção "Dados de Energia" (linhas 430-445):** Mostra `sale.anos_contrato`. Sem alteração — é read-only.

---

### Resumo de alterações concretas

Apenas o **EditSaleModal.tsx** precisa de alterações:
1. Adicionar inputs `contrato_inicio` e `contrato_fim` ao grid de cada CPE editável
2. Adicionar campo `duracao_contrato` disabled/auto-calculado ao grid de cada CPE
3. Calcular `duracao_contrato` quando datas mudam (handler inline no `onChange`)
4. Tornar o campo "Anos de Contrato" na secção de dados de energia read-only com estilo `bg-muted`

Nenhuma alteração de base de dados necessária.

