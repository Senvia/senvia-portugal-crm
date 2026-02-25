

## Matriz de Comissoes Configuravel pela Empresa

### Objetivo

Redesenhar a pagina de Matriz de Comissoes nas Definicoes para que a empresa telecom possa inserir todos os dados da tabela (escaloes Solar, taxas de Baterias, percentagens, etc.) e o sistema calcule automaticamente as comissoes nas propostas com base nesses dados guardados.

### Estrutura de dados no JSONB `commission_matrix`

A coluna `organizations.commission_matrix` (ja existe) passara a guardar uma estrutura mais rica:

```text
{
  "Solar": {
    "method": "tiered_kwp",
    "tiers": [
      { "kwpMin": 0, "kwpMax": 1.2, "baseTransaccional": 0, "adicTransaccional": 0, "baseAas": 0, "adicAas": 0 },
      { "kwpMin": 1.2, "kwpMax": 4.1, "baseTransaccional": 42, "adicTransaccional": 0, "baseAas": 34, "adicAas": 0 },
      { "kwpMin": 4.1, "kwpMax": 15, "baseTransaccional": 42, "adicTransaccional": 10, "baseAas": 34, "adicAas": 14 },
      ...
    ]
  },
  "Carregadores/Baterias": {
    "method": "base_plus_per_kwp",
    "base": 10,
    "ratePerKwp": 2
  },
  "Condensadores": {
    "method": "percentage_valor",
    "rate": 5
  },
  "Coberturas": {
    "method": "percentage_valor",
    "rate": 5
  }
}
```

Nao ha migracao SQL necessaria — a coluna `commission_matrix` (jsonb) ja existe.

### Alteracoes por ficheiro

**1. `src/hooks/useCommissionMatrix.ts`** — Redesenho dos tipos e calculo

- Novos tipos de regras:
  - `tiered_kwp` — tabela de escaloes com colunas Transaccional e AAS (para Solar)
  - `base_plus_per_kwp` — valor base + taxa por kWp (para Baterias)
  - `percentage_valor` — percentagem do valor (mantido)
  - `per_kwp` — taxa fixa por kWp (mantido)
  - `fixed` — valor fixo (mantido)
  - `manual` — sem calculo (mantido)
- `calculateCommission` passa a aceitar `modeloServico?: 'transacional' | 'saas'` como terceiro parametro
- Logica `tiered_kwp`: encontra o escalao correto pelo kWp, aplica `Base + (kWp - kWpMin) × Adicional` usando a coluna correta (transaccional ou aas)
- Logica `base_plus_per_kwp`: `base + (ratePerKwp × kWp)`

**2. `src/components/settings/CommissionMatrixTab.tsx`** — Redesenho completo da UI

A pagina tera seccoes distintas para cada produto:

- **Solar** — Seccao com tabela editavel de escaloes:
  - Botao "Adicionar Escalao"
  - Cada linha: kWp Min, kWp Max, Base Transaccional (EUR), Adicional Transaccional (EUR/kWp), Base AAS (EUR), Adicional AAS (EUR/kWp)
  - Botao para remover linha
  - Preview da formula: "Comissao = Base + (kWp - kWpMin) × Adicional"

- **Carregadores/Baterias** — Dois campos:
  - Valor Base (EUR): ex. 10
  - Taxa por kWp (EUR): ex. 2
  - Preview: "Comissao = 10€ + (2€ × kWp)"

- **Condensadores** — Um campo:
  - Percentagem (%): ex. 5
  - Preview: "Comissao = Valor × 5%"

- **Coberturas** — Um campo:
  - Percentagem (%): ex. 5
  - Preview: "Comissao = Valor × 5%"

Cada produto tem um selector de metodo de calculo (dropdown) para que a empresa possa escolher o tipo de formula. Quando seleciona "Escaloes por kWp" aparece a tabela; quando seleciona "Base + Taxa/kWp" aparecem os dois campos; etc.

Todos os dados sao guardados no `organizations.commission_matrix` ao clicar "Guardar Matriz".

**3. `src/components/proposals/CreateProposalModal.tsx`** — Passar `modeloServico`

Alterar a chamada:
```
calculateCommission(produto, detail)
```
para:
```
calculateCommission(produto, detail, modeloServico)
```

Onde `modeloServico` e o valor seleccionado na proposta (transacional/saas).

**4. `src/components/proposals/EditProposalModal.tsx`** — Mesma alteracao

Passar `modeloServico` ao `calculateCommission`.

### Fluxo do utilizador

```text
1. Admin vai a Definicoes > Matriz de Comissoes
2. Para Solar: adiciona os escaloes kWp com os valores Base e Adicional para cada modelo
3. Para Baterias: define o valor base e a taxa por kWp
4. Para Condensadores/Coberturas: define a percentagem
5. Clica "Guardar Matriz"
6. Ao criar/editar uma proposta de Outros Servicos, as comissoes sao calculadas automaticamente com base nos dados inseridos
```

### Detalhes tecnicos

- A tabela de escaloes Solar sera renderizada com componente responsivo (cards empilhados em mobile, tabela em desktop)
- Validacao: kWp Max de um escalao deve ser igual ao kWp Min do seguinte (continuidade)
- Se a matriz nao estiver configurada, o campo comissao fica em modo manual (comportamento atual)
- O calculo do Solar depende do `modeloServico` da proposta — se nao houver modelo seleccionado, usa Transaccional por defeito

