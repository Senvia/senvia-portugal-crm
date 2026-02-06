

## Simplificar ProposalCpeSelector - Apenas Selecionar Existente

### Pedido do Cliente

No template de telecomunicações, os CPE/CUI já são criados na **ficha do cliente**. Na proposta, o utilizador deve apenas **selecionar CPEs existentes** - não criar novos.

---

### Alteracao Proposta

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/proposals/ProposalCpeSelector.tsx` | Remover aba "Novo CPE" e mostrar apenas o seletor de existentes |

---

### Comportamento Atual vs Novo

| Aspecto | Atual | Novo |
|---------|-------|------|
| Abas visíveis | "Novo CPE" + "Selecionar Existente" | Apenas formulário de seleção (sem tabs) |
| Tab por defeito | "Novo CPE" | N/A - só há uma opção |
| Fluxo | Escolher entre criar ou selecionar | Selecionar cliente → Ver CPEs → Preencher dados energia → Adicionar |

---

### Detalhes Tecnicos

Remover completamente:
- O estado `activeTab`
- O componente `Tabs`, `TabsList`, `TabsTrigger`
- O conteúdo `TabsContent value="new"` (todo o formulário de criar novo CPE)
- As funções e estados relacionados com "new CPE" (`handleAddNewCpe`, `resetNewForm`, etc.)

Manter apenas:
- O formulário de selecionar CPE existente (que está em `TabsContent value="existing"`)
- A lista de CPEs já adicionados (com os campos de energia editáveis)

---

### Interface Final

```text
┌─────────────────────────────────────────────────┐
│ CPE/CUI (Pontos de Consumo)                     │
├─────────────────────────────────────────────────┤
│ [Lista de CPEs já adicionados com dados energia]│
├─────────────────────────────────────────────────┤
│ Selecionar CPE/CUI do Cliente                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Dropdown com CPEs do cliente]              │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Dados de Energia                                │
│ Consumo: [____] Duração: [__] DBL: [____]       │
│ Margem: [auto] Comissão: [____]                 │
│ Início: [____] Fim: [auto]                      │
│                                                 │
│           [+ Adicionar à Proposta]              │
└─────────────────────────────────────────────────┘
```

---

### Nota

Se não existirem CPEs criados para o cliente selecionado, aparecerá uma mensagem a indicar que deve primeiro adicionar CPEs na ficha do cliente.

**Total: 1 ficheiro modificado**

