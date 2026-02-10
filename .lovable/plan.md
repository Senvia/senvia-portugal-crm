

## Corrigir template de impressao: Dados de Energia so para Telecom

### Problema

No template de impressao da proposta (`ProposalDetailsModal.tsx`, linhas 421-441), a seccao "CPEs / Pontos de Consumo" com dados de energia (consumo, DBL, margem, comissao, etc.) e mostrada para **todos os nichos**. Deveria aparecer apenas para o nicho `telecom`.

Alem disso, para nichos nao-telecom, o template de impressao nao mostra os **produtos/servicos** da proposta (com precos editados), que e a informacao relevante para esses nichos.

### Solucao

1. Envolver a seccao de CPEs no template de impressao com a condicao `orgData?.niche === 'telecom'`
2. Adicionar uma seccao de produtos/servicos no template de impressao para nichos nao-telecom, usando os dados de `proposalProducts`

### Detalhes tecnicos

**Ficheiro: `src/components/proposals/ProposalDetailsModal.tsx`**

1. **Linha 422**: Alterar `${proposalCpes.length > 0 ?` para `${orgData?.niche === 'telecom' && proposalCpes.length > 0 ?` -- isto garante que CPEs com dados de energia so aparecem no template de impressao para telecom.

2. **Apos linha 441**: Adicionar bloco para nichos nao-telecom que mostra os produtos/servicos da proposta:
```html
${orgData?.niche !== 'telecom' && proposalProducts.length > 0 ? `
  <div class="cpes">
    <h3>Produtos / Servicos</h3>
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #eee;">
          <th style="text-align:left; padding:8px;">Produto</th>
          <th style="text-align:center; padding:8px;">Qtd</th>
          <th style="text-align:right; padding:8px;">Preco Unit.</th>
          <th style="text-align:right; padding:8px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${proposalProducts.map(item => `
          <tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:8px;">${item.product?.name || 'Produto'}</td>
            <td style="text-align:center; padding:8px;">${item.quantity}</td>
            <td style="text-align:right; padding:8px;">${formatCurrency(item.unit_price)}</td>
            <td style="text-align:right; padding:8px;">${formatCurrency(item.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
` : ''}
```

| Ficheiro | Alteracao |
|---|---|
| `src/components/proposals/ProposalDetailsModal.tsx` | Guardar seccao CPEs do template de impressao com condicao telecom; adicionar tabela de produtos para nao-telecom |
