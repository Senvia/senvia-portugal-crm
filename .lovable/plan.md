

## Botao fixo "Abrir Ticket de Suporte" no Otto

### O que muda

Adicionar um botao permanente na zona de input do Otto (acima do campo de texto) que, ao ser clicado, envia automaticamente a mensagem "Preciso de abrir um ticket de suporte" ao Otto, iniciando o fluxo de recolha de dados do ticket.

### Alteracao

**Ficheiro: `src/components/otto/OttoChatWindow.tsx`**

- Adicionar um botao com icone `Headset` (ou `LifeBuoy`) e texto "Abrir Ticket de Suporte" entre a area de mensagens e o input
- O botao fica sempre visivel, acima do campo de texto, dentro da zona de input
- Ao clicar, chama `sendMessage("Preciso de abrir um ticket de suporte")`
- Fica desativado enquanto o Otto esta a processar (`isLoading`)
- Estilo: botao `outline` com cor de destaque, `rounded-full`, tamanho pequeno

### Detalhe tecnico

Adicionar na `div` do input (linha 126), antes do campo de texto, uma linha com o botao:

```tsx
<Button
  variant="outline"
  size="sm"
  className="w-full rounded-full gap-2 text-xs"
  onClick={() => handleQuickAction("Preciso de abrir um ticket de suporte")}
  disabled={isLoading}
>
  <LifeBuoy className="w-3.5 h-3.5" />
  Abrir Ticket de Suporte
</Button>
```

Import adicional: `LifeBuoy` do `lucide-react`.

