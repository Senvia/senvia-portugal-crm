

## Corrigir botão "Importar" na página de Análise de Comissões

### Problemas
1. O botão na página principal já diz "Importar ficheiro" — está OK
2. Dentro do dialog, o botão de submit diz "Importar chargebacks" — deve ser apenas **"Importar"**
3. O título do dialog diz "Importar chargebacks" — deve ser apenas **"Importar"**
4. O botão pode estar inacessível (tapado ou deslocado no layout)

### Alterações

**Ficheiro: `src/components/finance/ImportChargebacksDialog.tsx`**

1. Linha 168: `DialogTitle` de "Importar chargebacks" → **"Importar"**
2. Linha 286: Texto do botão de "Importar chargebacks" → **"Importar"**
3. Verificar se o footer com o botão está visível — o layout usa `flex h-full flex-col` com `flex-1 overflow-y-auto` para o conteúdo e `shrink-0` para o footer, o que deve funcionar. Vou confirmar se não há overflow a esconder o botão.

