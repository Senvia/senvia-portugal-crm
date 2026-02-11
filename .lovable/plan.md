

## Prevenir faturas duplicadas com proprietary_uid

### Contexto
A documentacao do endpoint de criacao do InvoiceXpress revela o campo `proprietary_uid`, que serve para prevenir pedidos duplicados. Isto resolve o problema identificado na auditoria onde dois pagamentos ficaram com a mesma referencia de fatura.

### Alteracoes

**1. Edge function `issue-invoice`**

Adicionar o campo `proprietary_uid` ao payload de criacao do documento. O valor sera um UUID deterministico baseado no `payment_id` (para faturas por pagamento) ou no `sale_id` (para faturas legacy). Isto garante que se a mesma fatura for pedida duas vezes, o InvoiceXpress rejeita a segunda com 409.

Tambem guardar o `permalink` da resposta de criacao como fallback para quando o PDF nao esta disponivel.

Logica:
```text
1. Gerar proprietary_uid:
   - Per-payment: "senvia-pay-{payment_id}"
   - Legacy: "senvia-sale-{sale_id}"
2. Incluir no payload: { proprietary_uid: "senvia-pay-xxx-xxx" }
3. Tratar resposta 409 como "fatura ja existe" (nao erro)
4. Guardar permalink da resposta como fallback
```

**2. Guardar permalink na base de dados**

Quando o PDF nao esta pronto apos o polling, guardar o `permalink` no campo `invoice_file_url` para que o utilizador tenha sempre acesso ao documento (mesmo que seja via browser do InvoiceXpress).

### Resumo tecnico

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/issue-invoice/index.ts` | Adicionar `proprietary_uid` ao payload, tratar 409, guardar `permalink` como fallback |

### Notas
- Nao e necessaria migracao de base de dados
- O `proprietary_uid` e determinisitco (baseado no ID do pagamento/venda), nao aleatorio, para garantir idempotencia
- O tratamento do 409 evita erros ao utilizador se clicar duas vezes no botao de emitir

