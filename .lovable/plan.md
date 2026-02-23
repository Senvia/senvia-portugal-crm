

# Adicionar Botao "Voltar" no Modal de Detalhes do Lead

## Problema
O modal de detalhes do lead (tela cheia) so tem o pequeno "X" no canto superior direito para fechar. Falta um botao "Voltar" visivel e acessivel, especialmente em mobile.

## Solucao
Adicionar um botao "Voltar" no header fixo do modal e tambem na coluna lateral direita, acima do botao "Eliminar Lead".

## Alteracoes

### `src/components/leads/LeadDetailsModal.tsx`

1. **Header fixo (linha ~242)**: Adicionar um botao com icone `ArrowLeft` + texto "Voltar" no inicio do header, antes do titulo do lead. Ao clicar, fecha o modal (`onOpenChange(false)`).

2. **Coluna lateral direita (linha ~605)**: Adicionar um botao "Voltar" com `variant="outline"` e icone `ArrowLeft` logo acima do botao "Eliminar Lead (RGPD)", para que o utilizador consiga fechar o modal tambem a partir do fundo da pagina.

### Detalhes tecnicos
- Importar `ArrowLeft` do lucide-react
- O botao no header sera: `<Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}><ArrowLeft /> Voltar</Button>`
- O botao na sidebar sera: `<Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}><ArrowLeft /> Voltar</Button>`
- Ambos os botoes chamam `onOpenChange(false)` para fechar o dialog

