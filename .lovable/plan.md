

## Adicionar botoes "Renovar" e "Alterar Comercializador" na ficha do cliente

### Problema

Na ficha do cliente (drawer de detalhes), a lista de CPE/CUI so tem botoes de "Editar" e "Remover". Nao existe forma de renovar um CPE ou alterar o comercializador diretamente a partir da ficha do cliente -- essas acoes so estao disponiveis no widget do dashboard.

### Solucao

Adicionar botoes de acao rapida nos cartoes de CPE dentro do `CpeList.tsx`, especialmente quando a fidelizacao esta proxima de expirar ou ja expirou. Reutilizar os modais `RenewCpeModal` e `SwitchComercializadorModal` que ja existem.

### Alteracoes

**Ficheiro: `src/components/clients/CpeList.tsx`**

1. Importar `RenewCpeModal` e `SwitchComercializadorModal`
2. Adicionar estados `renewCpe` e `switchCpe` para controlar a abertura dos modais
3. Para CPEs com fidelizacao proxima de expirar (<=30 dias) ou ja expirada, mostrar botoes de acao:
   - Botao "Renovar" (icone de refresh) -- abre o `RenewCpeModal`
   - Botao "Alterar Comercializador" (icone de troca) -- abre o `SwitchComercializadorModal`
4. Os botoes aparecem junto aos botoes de Editar/Remover, com destaque visual (cor primaria para Renovar, outline para Alterar)
5. Para CPEs que ja foram renovados ou tiveram o comercializador alterado (`renewal_status = 'renewed'` ou `'switched'`), mostrar um badge indicativo

### Resultado esperado

O utilizador pode renovar ou alterar o comercializador de um CPE diretamente na ficha do cliente, sem precisar de ir ao dashboard ou usar o modal de edicao generico.

