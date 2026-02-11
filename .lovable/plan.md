

## Unificar Faturas e Notas de Credito numa Lista Unica

### O que muda

Remover as sub-tabs "Faturas" e "Notas de Credito" dentro do separador Faturas. Em vez disso, mostrar todos os documentos (faturas + notas de credito) numa unica tabela unificada, tal como o InvoiceXpress faz na imagem de referencia. As notas de credito aparecem misturadas com as faturas, ordenadas por data, com a coluna "Tipo" a distingui-las.

### Alteracoes

**Ficheiro: `src/components/finance/InvoicesContent.tsx`**

1. **Remover sub-tabs**: Eliminar o wrapper `Tabs/TabsList/TabsTrigger/TabsContent` e o import de `CreditNotesContent`.

2. **Unificar dados**: Dentro de `InvoicesTable`, importar e usar tambem o hook `useCreditNotes` e `useSyncCreditNotes`. Ao montar, sincronizar ambos automaticamente (como ja acontece individualmente).

3. **Combinar numa unica lista**: Criar um array unificado que junta faturas e notas de credito, mapeando ambos para uma interface comum com campos: `id`, `reference`, `document_type`, `date`, `client_name`, `status`, `total`, `sale_id`, `payment_id`, `pdf_path`, `invoicexpress_id`, `credit_note_reference` (para faturas) ou `related_invoice_reference` (para notas de credito). Ordenar por data descendente.

4. **Adicionar "Nota de Credito" ao mapa de tipos**: Na funcao `getDocTypeLabel`, adicionar `credit_note: 'Nota de Credito'`.

5. **Ajustar coluna "N. Credito"**: Para notas de credito, mostrar a referencia da fatura origem em vez da nota de credito associada. O header pode mudar para "Doc. Relacionado" para cobrir ambos os casos.

6. **Sincronizar ambos**: O botao "Sincronizar" no header dispara ambas as mutacoes (faturas + notas de credito). O auto-sync no mount tambem dispara ambas.

7. **Clique na linha**: Para notas de credito, abrir o modal de detalhes com `document_type: 'credit_note'` (o modal ja suporta este tipo).

8. **Contagem e export**: Actualizar a contagem de resultados e a funcao de exportacao para incluir ambos os tipos.

**Ficheiros a limpar (opcional)**:
- `src/components/finance/CreditNotesContent.tsx` pode ser mantido mas deixa de ser importado. Pode ser removido para limpeza.

### Resultado

- Tab "Faturas" mostra todos os documentos fiscais numa unica lista
- Notas de credito aparecem com badge "Nota de Credito" na coluna Tipo
- Uma unica pesquisa e filtro de datas cobre todos os documentos
- Layout limpo sem sub-tabs desnecessarias

