

## Melhorar o Botão WhatsApp do Otto — Mais Visual e Claro

### Problema

O botão WhatsApp actual é pequeno (`text-xs`, `py-2 px-4`, `rounded-full`) e parece um link discreto dentro da conversa. O utilizador não percebe que é para clicar e enviar.

### Solução

Transformar o botão WhatsApp num **card de acção destacado** com:
- Largura total (`w-full`)
- Ícone WhatsApp grande e reconhecível
- Texto principal a bold ("Enviar via WhatsApp")
- Subtexto explicativo ("Toca para abrir o WhatsApp e enviar o ticket")
- Fundo verde WhatsApp com padding generoso
- Animação subtil de pulso para chamar atenção

### Alteração — `src/components/otto/OttoMessage.tsx`

Substituir o render dos `waLinks` (linhas 133-149) por um card mais proeminente:

```tsx
{waLinks.length > 0 && !isStreaming && (
  <div className="flex flex-col gap-2 w-full">
    {waLinks.map((wa, i) => (
      <button
        key={i}
        onClick={() => window.open(wa.url, '_blank')}
        className="w-full flex items-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] 
          text-white rounded-xl p-3.5 transition-all duration-200 
          hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
          animate-[pulse_2s_ease-in-out_1]"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="font-semibold text-sm">{wa.label}</p>
          <p className="text-[11px] text-white/80">
            Toca para abrir o WhatsApp e enviar
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-white/60 flex-shrink-0" />
      </p>
    ))}
  </div>
)}
```

### Resultado

Em vez de um botãozinho discreto, o utilizador vê um **card verde grande** com ícone do WhatsApp, texto explicativo e uma seta — impossível não perceber que é para clicar.

### Ficheiro a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/otto/OttoMessage.tsx` | Substituir botão WhatsApp por card de acção destacado |

