

## O prefixo [EE] / [Serviços] já está implementado — o problema é que não há propostas disponíveis

### Diagnóstico

Verifiquei o código e a base de dados. A alteração na linha 702 do `CreateSaleModal.tsx` está correta:

```typescript
label: `[${proposal.proposal_type === 'servicos' ? 'Serviços' : 'EE'}] ${proposal.client?.name || ...}`
```

**Porém, todas as propostas aceites deste cliente (e de todos os outros) já têm vendas associadas.** O filtro `has_sale` exclui-as corretamente do dropdown, resultando em apenas "Venda direta" visível.

Para ver o prefixo, é necessário ter uma proposta com status "accepted" que **não** tenha uma venda associada.

### Opções

1. **Testar com dados reais** — Aceitar uma nova proposta (que ainda não tenha venda) e abrir o modal "Nova Venda". O prefixo `[EE]` ou `[Serviços]` aparecerá no dropdown.

2. **Nenhuma alteração de código é necessária** — A funcionalidade já está implementada e funcional. O dropdown simplesmente não tem propostas disponíveis para mostrar.

