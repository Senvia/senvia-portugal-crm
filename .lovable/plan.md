

## Mover botão de ação para baixo dos seletores Ciclo/Ano

### Alteração em `PortalTotalLinkLayout.tsx`

Mover o botão de ação (Adicionar/Revisão) do bloco de filtros para dentro do header card, logo abaixo dos seletores Ciclo/Ano, alinhado à direita.

**Estrutura resultante:**
```text
┌─────────────────────────────────────────────────┐
│ Portal Total Link            [Ciclo ▾] · [Ano ▾]│
│ Descrição                        [+ Adicionar]  │
│ ┌─ Home ─ Contratos ─ IDs ─ Pendentes ─ ... ──┐│
└─────────────────────────────────────────────────┘
┌─ Filtros de pesquisa ──────────────────────────┐
│ ...                                             │
└─────────────────────────────────────────────────┘
```

**Concretamente:**
- Remover o botão do bloco `{!isHomeSection && ...}` (linhas 107-121)
- Adicionar o botão dentro do div dos seletores (linha 51-77), como um elemento extra abaixo dos selects, visível apenas quando `currentSection.action` existe
- O bloco de filtros fica sozinho sem o botão ao lado

**Ficheiro:** `PortalTotalLinkLayout.tsx` (editar)

