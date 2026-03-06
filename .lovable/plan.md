

## Estrategia: Prospects → Leads + Reporting por Comercial

### Conceito

Existem **duas necessidades distintas**:

1. **Importação em massa de Prospects** -- carregar 10.000 contactos e ir convertendo-os em Leads conforme necessário
2. **Reporting de Leads** -- dashboard/relatório com métricas de geração, distribuição por comercial, e funil por etapa

---

### Parte 1: Base de Prospects

Atualmente o sistema já tem `marketing_contacts` (listas de marketing com importação XLSX/CSV). Podemos reutilizar essa infraestrutura ou criar uma tabela dedicada. A melhor abordagem:

**Opção A (recomendada): Usar `marketing_contacts` como base de Prospects**
- Já existe importação XLSX/CSV funcional (ImportContactsModal)
- Adicionar uma ação "Converter em Lead" (individual ou em bulk) que cria o registo na tabela `leads`
- Adicionar um status/tag "prospect" aos contactos de marketing
- Vantagem: zero tabelas novas, reutiliza tudo o que já existe

**Opção B: Tabela `prospects` dedicada**
- Tabela nova com campos (name, email, phone, company, status, assigned_to, organization_id)
- Importação dedicada
- Mais separação mas mais código duplicado

### Parte 2: Conversão Prospect → Lead

- Botão "Criar Lead" em cada contacto de marketing (individual)
- Ação bulk: selecionar N contactos → "Converter em Leads" → cria leads com dados mapeados
- Opção de atribuir automaticamente a um comercial na conversão (round-robin ou manual)
- Marcar o contacto como "convertido" para não duplicar

### Parte 3: Reporting de Leads

Criar uma secção de métricas na página de Leads (ou widget no Dashboard) com:

**Métricas Globais:**
- Total de Leads gerados (no período)
- Leads por fonte/origem

**Tabela por Comercial:**
| Comercial | Gerados | Entregues | Contactados | Agendados | Ganhas | Perdidas | Taxa Conv. |
|-----------|---------|-----------|-------------|-----------|--------|----------|------------|

- Dados calculados a partir da tabela `leads` agrupando por `assigned_to` e `status`
- Filtro por período (semana/mês/trimestre)
- Usa os `pipeline_stages` dinâmicos para determinar as colunas

---

### Alterações Técnicas

**Ficheiros a criar/editar:**

1. **`src/components/marketing/ConvertToLeadModal.tsx`** -- Modal para converter contactos em leads (individual e bulk)
2. **`src/hooks/useConvertProspectToLead.ts`** -- Hook de mutação que insere na tabela `leads` a partir de `marketing_contacts`
3. **`src/pages/marketing/Lists.tsx`** -- Adicionar botão/ação "Converter em Lead" na tabela de contactos
4. **`src/components/leads/LeadsReportPanel.tsx`** -- Painel com tabela de métricas por comercial
5. **`src/pages/Leads.tsx`** -- Adicionar tab ou secção para o relatório
6. **`src/hooks/useLeadReporting.ts`** -- Hook que calcula as métricas (leads por status, por comercial)

**Base de dados:**
- Adicionar coluna `converted_to_lead` (boolean, default false) à tabela `marketing_contacts` para evitar duplicações
- Nenhuma tabela nova necessária

---

### Resumo do Fluxo

```text
[CSV/XLSX 10k] → Importar → marketing_contacts (Prospects)
                                    │
                          [Converter em Lead] (bulk/individual)
                                    │
                                    ▼
                              leads (pipeline)
                                    │
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
                Agendado         Ganha          Perdida
                     
         Relatório: Total + Por Comercial
```

