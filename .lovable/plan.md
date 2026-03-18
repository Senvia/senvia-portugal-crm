

## Ciclo/Ano global + botões de ação reposicionados

### Problema
Os seletores de Ciclo e Ano só aparecem na tab Home. Os botões de ação (Adicionar, Revisão, Pesquisar) ocupam o mesmo espaço condicional. O utilizador quer Ciclo/Ano visíveis em **todas** as tabs.

### Alterações em `PortalTotalLinkLayout.tsx`

**Nova estrutura do header:**
- Linha do título: título à esquerda, **seletores Ciclo + Ano sempre visíveis** à direita (sem condição `isHomeSection`)
- Remover a condicional `isHomeSection ? ... : currentSection.action ? ...`
- O botão de ação da secção (quando existe) move-se para uma **linha separada entre os filtros e o conteúdo** — renderizado logo após o `<PortalTotalLinkFilters />`, alinhado à direita

**Layout resultante:**
```text
┌──────────────────────────────────────────────┐
│ Portal Total Link          [Ciclo ▾] · [Ano ▾] │
│ Descrição da secção atual                      │
│ ┌─ Home ─ Contratos ─ IDs ─ Pendentes ─ ... ─┐│
└──────────────────────────────────────────────┘
┌─ Filtros de pesquisa ─────────── [+ Adicionar]─┐
│ ...                                             │
└─────────────────────────────────────────────────┘
```

- Na Home (sem filtros), o botão não existe, portanto nada extra aparece
- Nas outras tabs, o botão de ação fica à direita, na mesma linha do cabeçalho dos filtros ou imediatamente acima do card de filtros

**Ficheiro:** `src/components/portal-total-link/PortalTotalLinkLayout.tsx` (editar)

