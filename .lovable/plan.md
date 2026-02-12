

# Separar Integrações de Faturação: InvoiceXpress e KeyInvoice

## Problema Atual
Existe um único accordion "Faturação" com um dropdown para escolher entre InvoiceXpress e KeyInvoice. Isto obriga a trocar de fornecedor para ver/editar credenciais, podendo perder dados. O utilizador quer manter ambas as configurações visíveis e independentes.

## Solução

Criar **dois AccordionItems separados** -- um para InvoiceXpress e outro para KeyInvoice -- cada um com o seu proprio switch de ativacao. Quando um e ativado, o outro e automaticamente desativado (mutuamente exclusivos).

### Alterações em `IntegrationsContent.tsx`

1. **Remover** o dropdown "Fornecedor de Faturação" (`billingProvider` / `setBillingProvider`)
2. **Dividir** o accordion "Faturação" em dois:
   - **"Faturação (InvoiceXpress)"** -- com switch `integrationsEnabled.invoicexpress`, campos Account Name + API Key
   - **"Faturação (KeyInvoice)"** -- com switch `integrationsEnabled.keyinvoice`, campos Email + Password + Company Code
3. **Configuração fiscal** (Taxa IVA + Motivo Isenção) aparece em **ambos** os accordions (partilhada, mesmos campos)
4. **Lógica de exclusividade**: quando o utilizador ativa um switch, o outro e automaticamente desativado. O `billing_provider` na BD e atualizado automaticamente com base em qual esta ativo

### Alterações em `Settings.tsx`

1. Adicionar estado `integrationsEnabled.keyinvoice`
2. Modificar `onToggleIntegration` para:
   - Se ativar `invoicexpress` -> desativar `keyinvoice` + set `billing_provider = 'invoicexpress'`
   - Se ativar `keyinvoice` -> desativar `invoicexpress` + set `billing_provider = 'keyinvoice'`
   - Se desativar qualquer um -> apenas desativa (ambos podem estar desativados)
3. Adicionar handler `handleSaveKeyInvoice` separado do `handleSaveInvoiceXpress`

### Alterações em `SaleFiscalInfo.tsx`

Atualizar `isInvoiceXpressActive` / `isBillingActive` para verificar qual integração está ativa via `integrations_enabled` em vez de apenas `billing_provider`:

```
Se integrations_enabled.invoicexpress === true E tem credenciais IX -> ativo
Se integrations_enabled.keyinvoice === true E tem credenciais KI -> ativo
```

### Alterações nas props de `IntegrationsContent`

- Remover: `billingProvider`, `setBillingProvider`
- Adicionar: `handleSaveKeyInvoice` (handler separado para guardar credenciais KeyInvoice)

---

## Detalhes Tecnicos

### Fluxo de Exclusividade

```text
Utilizador ativa KeyInvoice
  -> integrationsEnabled.keyinvoice = true
  -> integrationsEnabled.invoicexpress = false
  -> billing_provider = 'keyinvoice'
  -> Guardar na BD (integrations_enabled + billing_provider)

Utilizador desativa KeyInvoice
  -> integrationsEnabled.keyinvoice = false
  -> billing_provider permanece (nenhum ativo)
  -> Guardar na BD
```

### Ficheiros a modificar

| Ficheiro | Alteração |
|----------|-----------|
| `IntegrationsContent.tsx` | Dividir accordion, remover dropdown, dois blocos independentes |
| `Settings.tsx` | Logica de exclusividade nos switches, handler separado para KeyInvoice |
| `SaleFiscalInfo.tsx` | Verificar `integrations_enabled` para determinar provider ativo |
| `useOrganization.ts` | Sem alterações (já suporta todos os campos) |

