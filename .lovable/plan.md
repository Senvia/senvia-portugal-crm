

## Auditoria Completa da Emissao de Faturas - Todos os Problemas

Fiz uma investigacao profunda ao fluxo inteiro. Aqui estao **todos os problemas** que encontrei, do mais grave ao menos grave:

---

### Problema 1 (CRITICO): `tax_config` nao esta a ser guardado na base de dados

**O que acontece:** Quando vais a Definicoes -> Integracoes -> InvoiceXpress e mudas a taxa para 0%, o valor **NAO e guardado** na base de dados. A tua organizacao continua com `tax_value: 23`.

**Causa raiz:** A interface `UpdateOrganizationData` em `useOrganization.ts` nao inclui os campos `tax_config` nem `integrations_enabled`. O codigo usa `as any` para contornar o TypeScript, mas o Supabase client pode estar a ignorar campos que nao correspondem aos tipos gerados.

**Correcao:** Adicionar `tax_config` e `integrations_enabled` a interface `UpdateOrganizationData`.

---

### Problema 2 (CRITICO): Produto "Pacote Iniciante Web" tem `tax_value: 0` mas `tax_exemption_reason: NULL`

**O que acontece:** O teu produto principal esta configurado como isento (tax_value=0), mas nao tem motivo de isencao preenchido. Quando a edge function tenta emitir a fatura, ela **bloqueia** com o erro "Configure o motivo de isencao de IVA".

**Causa raiz:** O modal de criacao/edicao de produto nao obriga o preenchimento do motivo de isencao quando `tax_value = 0`.

**Correcao:**
- Adicionar validacao que impeca guardar um produto com `tax_value = 0` sem `tax_exemption_reason`
- Nos modais de criacao e edicao de produto, tornar o campo obrigatorio quando isento

---

### Problema 3 (GRAVE): Faturas de pagamento individual ignoram a taxa do produto

**O que acontece:** Quando emites uma fatura para um pagamento especifico (que e o fluxo principal), a edge function cria um item generico "Servico" com a taxa da **organizacao** (23%), ignorando completamente a taxa dos produtos da venda.

**Causa raiz:** No bloco `if (payment_id && payment_amount)` da edge function (linha 194-200), o codigo nao consulta os `sale_items` -- cria diretamente um item com a taxa global.

**Correcao:** No fluxo per-payment, consultar os `sale_items` da venda para determinar a taxa correta. Se todos os items tiverem a mesma taxa, usar essa. Se tiverem taxas mistas, proporcionar o valor.

---

### Problema 4 (GRAVE): Dois pagamentos com a mesma referencia de fatura

Na base de dados, os pagamentos `62f769e3` e `0ba7995c` da venda 0003 tem ambos `invoice_reference: FR ATSIRE01FR/3`. Isto sugere que a mesma referencia foi atribuida a dois pagamentos diferentes -- possivel duplicacao.

---

### Problema 5 (MODERADO): O InvoiceDraftModal nao mostra dados reais para vendas com items

**O que acontece:** O modal mostra sempre a taxa global da organizacao. Se a venda tem produtos com taxas diferentes (ex: um isento e outro a 23%), o modal nao reflete isso.

**Correcao:** Passar informacao dos items da venda para o modal, para mostrar a taxa real que sera enviada.

---

### Plano de Correcoes

**1. `src/hooks/useOrganization.ts`** - Adicionar campos em falta a interface

```text
interface UpdateOrganizationData {
  ...campos existentes...
  + tax_config?: Json;
  + integrations_enabled?: Json;
}
```

**2. `src/pages/Settings.tsx`** - Remover `as any` no handleSaveInvoiceXpress

Agora que a interface suporta `tax_config`, remover o cast.

**3. `src/components/settings/CreateProductModal.tsx`** - Validacao obrigatoria

Quando `tax_value = 0`, bloquear o botao de guardar se `tax_exemption_reason` estiver vazio.

**4. `src/components/settings/EditProductModal.tsx`** - Mesma validacao

**5. `supabase/functions/issue-invoice/index.ts`** - Corrigir fluxo per-payment

No bloco de pagamento individual:
- Consultar os `sale_items` da venda com JOIN na tabela `products`
- Se houver items, usar a taxa dos produtos (ponderada ou unica)
- Se nao houver items, usar a taxa da organizacao como fallback

```text
Logica corrigida:
1. Buscar sale_items com products.tax_value
2. Se todos os items tiverem a mesma taxa -> usar essa taxa
3. Se taxas mistas -> criar items proporcionais ao pagamento
4. Se sem items -> fallback para taxa da org
```

**6. `src/components/sales/InvoiceDraftModal.tsx`** - Mostrar taxa real

Adicionar prop opcional `saleItems` para mostrar as taxas reais dos produtos quando disponivel.

---

### Resumo das alteracoes por ficheiro

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useOrganization.ts` | Adicionar `tax_config` e `integrations_enabled` a interface |
| `src/pages/Settings.tsx` | Remover `as any` no save do InvoiceXpress |
| `src/components/settings/CreateProductModal.tsx` | Validacao: motivo obrigatorio quando isento |
| `src/components/settings/EditProductModal.tsx` | Mesma validacao |
| `supabase/functions/issue-invoice/index.ts` | Per-payment: usar taxa dos produtos da venda |
| `src/components/sales/InvoiceDraftModal.tsx` | Mostrar taxa real dos items |
| `src/components/sales/SalePaymentsList.tsx` | Passar items da venda ao modal |

### Nota importante
Apos a correcao, precisas:
1. Ir a Definicoes -> Integracoes -> InvoiceXpress e guardar com taxa 0% + motivo M10
2. Ir a Definicoes -> Produtos -> editar "Pacote Iniciante Web" e preencher o motivo de isencao (M10)
3. Fazer o mesmo para "Trafego Pago" e "Servidor" se forem isentos

