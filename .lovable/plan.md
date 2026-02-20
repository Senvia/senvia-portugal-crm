

## Converter LeadDetailsModal para Full Screen

O modal que abre ao clicar num lead (detalhes/edicao) ainda usa o layout pequeno (`max-w-lg`). Precisa ser convertido para full screen, seguindo o mesmo padrao do resto do sistema.

### Alteracao

**Ficheiro:** `src/components/leads/LeadDetailsModal.tsx`

**Linha 264** - Trocar:
```
<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
```
Por:
```
<DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0">
```

**Reestruturar o layout interno:**

- Header fixo com borda inferior (titulo editavel + subtitulo "Lead criada em...")
- Conteudo scrollavel com container centrado (`max-w-5xl mx-auto`)
- Grid de 2 colunas em desktop (`lg:grid-cols-5`):
  - **Coluna esquerda (3/5):** Cards com os dados editaveis (Estado/Temperatura/Tipologia, Atribuicao, Valor/Consumo, Observacoes, Anexos, Campos customizados)
  - **Coluna direita (2/5, sticky):** Card de resumo com informacoes de contacto (telefone, email, data de criacao, origem), botoes de acao rapida (WhatsApp, Marcar evento), e footer com botoes Eliminar/Guardar

Toda a logica existente (editar campos inline, guardar alteracoes, eliminar lead, WhatsApp link, eventos, anexos, campos customizados) sera mantida intacta - apenas o layout visual muda.

