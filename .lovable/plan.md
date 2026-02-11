

## Traduzir todas as strings em Ingles para Portugues de Portugal (PT-PT)

### Problema identificado
Existem varias strings em ingles espalhadas pela aplicacao, principalmente em:
- Labels de formularios ("Password", "Email")
- Componentes UI base (Pagination: "Previous", "Next", "More pages")
- Textos de acessibilidade/sr-only ("Close", "Toggle Sidebar")
- Mensagens de erro internas ("No organization")
- Pagina Reset Password ("Password Alterada!", "Nova Password")
- Pagina InviteRegister ("Password")
- Settings/TeamTab ("Password", "Confirmar Password")
- Settings/GeneralContent ("Alterar Password", "Nova Password", "Confirmar Password")

### Traducoes a aplicar

| Ingles | Portugues PT-PT |
|--------|-----------------|
| Password | Palavra-passe |
| Email | Email (mantem-se, e universal) |
| Previous | Anterior |
| Next | Seguinte |
| More pages | Mais paginas |
| Close | Fechar |
| Toggle Sidebar | Alternar Menu |
| Go to previous page | Ir para pagina anterior |
| Go to next page | Ir para pagina seguinte |
| No organization | Sem organizacao |

### Ficheiros a editar

**1. `src/components/ui/pagination.tsx`**
- "Previous" -> "Anterior"
- "Next" -> "Seguinte"
- "More pages" -> "Mais paginas"
- "Go to previous page" -> "Ir para pagina anterior"
- "Go to next page" -> "Ir para pagina seguinte"

**2. `src/components/ui/dialog.tsx`**
- sr-only "Close" -> "Fechar"

**3. `src/components/ui/sheet.tsx`**
- sr-only "Close" -> "Fechar"

**4. `src/components/ui/sidebar.tsx`**
- sr-only "Toggle Sidebar" -> "Alternar Menu"
- Error "useSidebar must be used within a SidebarProvider." (manter em ingles, e tecnico/dev-only)

**5. `src/components/settings/GeneralContent.tsx`**
- "Alterar Password" -> "Alterar Palavra-passe"
- "Nova Password" -> "Nova Palavra-passe"
- "Confirmar Password" -> "Confirmar Palavra-passe"

**6. `src/components/settings/TeamTab.tsx`**
- Todas as labels "Password" -> "Palavra-passe"
- "Confirmar Password" -> "Confirmar Palavra-passe"
- "Nova Password" -> "Nova Palavra-passe"
- Toasts "As passwords nao coincidem" -> "As palavras-passe nao coincidem"
- "A password deve ter pelo menos 6 caracteres" -> "A palavra-passe deve ter pelo menos 6 caracteres"

**7. `src/pages/ResetPassword.tsx`**
- "Password Alterada!" -> "Palavra-passe Alterada!"
- "A sua password foi alterada com sucesso" -> "A sua palavra-passe foi alterada com sucesso"
- "Nova Password" -> "Nova Palavra-passe"
- "Introduza a sua nova password" -> "Introduza a sua nova palavra-passe"

**8. `src/pages/InviteRegister.tsx`**
- Label "Password" -> "Palavra-passe"

**9. `src/hooks/useSales.ts`**
- `throw new Error("No organization")` -> `throw new Error("Sem organizacao")`

### Nota
- "Email" mantem-se em ingles (e universalmente aceite em PT-PT)
- Mensagens de erro em componentes UI base (carousel, chart, form) mantemos em ingles pois sao mensagens de desenvolvimento, nunca vistas pelo utilizador final
- sr-only texts sao para leitores de ecra -- traduzir para acessibilidade em PT-PT

