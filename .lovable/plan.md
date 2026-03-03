

## Separar variáveis do editor de email em dois grupos

Organizar as variáveis de template em duas secções claras para facilitar a utilização.

### Alterações

**1. `src/types/marketing.ts`** — Reorganizar `TEMPLATE_VARIABLES` em dois arrays agrupados:

- **Contacto / Cliente**: `{{nome}}`, `{{email}}`, `{{telefone}}`, `{{empresa}}`
- **Organização / Comercial**: `{{organizacao}}`, `{{vendedor}}`, `{{data}}`

**2. `src/components/marketing/TemplateEditor.tsx`** — Renderizar os dois grupos com labels separadas em vez de uma lista única:

```
Contacto / Cliente
[{{nome}}] [{{email}}] [{{telefone}}] [{{empresa}}]

Organização / Comercial  
[{{organizacao}}] [{{vendedor}}] [{{data}}]
```

Cada grupo terá um label descritivo (`text-xs text-muted-foreground`) e os botões agrupados abaixo.

### Resultado
- Visualmente claro qual variável pertence ao cliente e qual pertence à empresa/organização
- Nenhuma alteração funcional — apenas reorganização visual

