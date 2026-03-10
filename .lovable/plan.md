

## Plano: Reordenar colunas da tabela de Clientes (telecom only)

### Contexto

Ordem atual das colunas: **Cliente → Contacto → Empresa → Responsável → Tipologia → Data**

Ordem pretendida (só Perfect2Gether/telecom): **Empresa → Contacto → Cliente → Responsável → Tipologia → Data**

### Alterações

**1. `src/pages/Clients.tsx`** — Passar `isTelecom={showEnergy}` ao `ClientsTable`

**2. `src/components/clients/ClientsTable.tsx`** — Aceitar prop `isTelecom` e reordenar colunas condicionalmente:

- Adicionar `isTelecom?: boolean` à interface `ClientsTableProps`
- No `TableHeader`, quando `isTelecom` é true, renderizar: Empresa → Contacto → Cliente → Responsável → Tipologia → Data
- No `TableBody`, reordenar as `TableCell` na mesma ordem condicional
- Para orgs não-telecom, manter a ordem atual

A lógica será um simples condicional que troca a ordem dos blocos JSX do header e body.

### Resultado
- Perfect2Gether vê: Empresa, Contacto, Cliente, Responsável, Tipologia, Data
- Outras orgs mantêm a ordem original
- 2 ficheiros editados

