

# Transformar Modal de Perfil em Pagina Full-Screen

## Objetivo
Substituir o Dialog atual de criar/editar perfil por uma vista de pagina inteira, seguindo o padrao do projeto (mobile: ecra completo, desktop: layout de 2 colunas 60/40).

## Alteracao

### Ficheiro: `src/components/settings/ProfilesTab.tsx`

**Remover**: O `Dialog` / `DialogContent` que envolve o formulario (linhas 252-416).

**Substituir por**: Navegacao condicional dentro do proprio componente:
- Quando `isOpen === false`: mostra a listagem de perfis (Card atual com a lista)
- Quando `isOpen === true`: mostra a pagina de edicao/criacao em ecra inteiro

**Layout da pagina de edicao (desktop)**:
- Header com botao Voltar (ArrowLeft) + titulo "Criar Perfil" / "Editar Perfil"
- Grid de 2 colunas (`grid-cols-1 lg:grid-cols-5`)
  - Coluna esquerda (lg:col-span-3): Campos basicos (Nome, Role Base, Visibilidade) + Accordion de permissoes por modulo
  - Coluna direita (lg:col-span-2, sticky): Seccao Dashboard Personalizado + Botoes de acao (Guardar / Cancelar)

**Layout mobile**: Tudo em coluna unica, scroll natural, botoes fixos no fundo.

### Detalhes tecnicos

1. Remover imports de `Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle`
2. Importar `ArrowLeft` de lucide-react
3. O estado `isOpen` passa a controlar qual vista e visivel (lista vs formulario)
4. O botao "Cancelar" e o botao de voltar fazem `setIsOpen(false)`
5. Manter toda a logica existente (toggleAction, setModuleAll, handleSave, etc.) sem alteracoes

### Estrutura visual

```text
Desktop (isOpen = true):
+------------------------------------------+
| <- Voltar   Criar Perfil                 |
+------------------------------------------+
| [Nome do Perfil]        | Dashboard      |
| [Role Base]             | [x] Widget A   |
| [Visibilidade]          | [x] Widget B   |
|                         |                |
| v Leads                 | [Cancelar]     |
|   [x] Ver  [x] Criar   | [Guardar]      |
| v Vendas                |                |
|   [x] Ver              |                |
+------------------------------------------+

Mobile (isOpen = true):
+------------------+
| <- Criar Perfil  |
+------------------+
| Nome do Perfil   |
| Role Base        |
| Visibilidade     |
| v Leads          |
|   [x] Ver        |
| Dashboard        |
| [x] Widget A     |
+------------------+
| [Cancel] [Save]  |
+------------------+
```

### Ficheiros a editar
- `src/components/settings/ProfilesTab.tsx` (unico ficheiro)

