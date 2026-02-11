

## Exibir o Documento Real do InvoiceXpress

### O que muda

Em vez de reconstruir o layout com dados da API, o modal vai mostrar o **documento real do InvoiceXpress** num iframe, exactamente como aparece no site deles. O `permalink` que a API já devolve é um link público para o documento formatado.

O modal fica com duas tabs:
- **Documento** — iframe com o permalink do InvoiceXpress (o documento real, tal como o vês)
- **Dados** — a vista actual com os dados estruturados (emitente, cliente, itens, sumário)

Os botões de acção (Download PDF, Enviar, Nota de Crédito, Anular) mantêm-se no footer.

### Seccao Tecnica

**Ficheiro: `src/components/sales/InvoiceDetailsModal.tsx`**

1. Adicionar `Tabs` do Radix UI com duas tabs: "Documento" e "Dados"
2. Na tab "Documento": renderizar um `iframe` com `src={details.permalink}` que ocupa toda a altura disponível do modal
3. Na tab "Dados": mover todo o conteúdo actual (emitente, cliente, itens, sumário, QR code, etc.)
4. Quando não houver `permalink` disponível, mostrar apenas a tab "Dados"
5. O modal mantém o mesmo tamanho (`max-w-2xl`) mas a tab do documento pode ser expandida para `max-w-4xl` para melhor visualização

**Apenas 1 ficheiro a editar:**
- `src/components/sales/InvoiceDetailsModal.tsx`
