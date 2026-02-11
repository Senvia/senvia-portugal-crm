

## Corrigir "Configurações" para "Definições" em toda a aplicação

### Problema
A página de Settings já usa o título correto "Definições", mas os menus de navegação (sidebar, mobile menu, bottom nav) ainda mostram "Configurações" ou "Config". Existem também algumas mensagens toast que usam "configurações" em vez de "definições".

### Traduções a aplicar

| Atual | Correto (PT-PT) |
|-------|-----------------|
| Configurações (nav labels) | Definições |
| Config (bottom nav) | Definições |
| Configurações de campos atualizadas | Definições de campos atualizadas |
| Não foi possível atualizar as configurações | Não foi possível atualizar as definições |
| As configurações de campos abaixo... | As definições de campos abaixo... |
| Erro ao guardar configurações | Erro ao guardar definições |
| Guardar Configurações | Guardar Definições |
| Usa as configurações Brevo | Usa as definições Brevo |

### Ficheiros a editar

**1. `src/components/layout/AppSidebar.tsx`**
- label: "Configurações" -> "Definições"

**2. `src/components/layout/MobileMenu.tsx`**
- label: "Configurações" -> "Definições"

**3. `src/components/layout/MobileBottomNav.tsx`**
- label: "Config" -> "Definições"

**4. `src/hooks/useClientFieldsSettings.ts`**
- "Configurações de campos atualizadas com sucesso." -> "Definições de campos atualizadas com sucesso."
- "Não foi possível atualizar as configurações." -> "Não foi possível atualizar as definições."

**5. `src/components/settings/FormCustomizationSection.tsx`**
- "As configurações de campos abaixo aplicam-se apenas ao modo tradicional." -> "As definições de campos abaixo aplicam-se apenas ao modo tradicional."

**6. `src/components/settings/FidelizationAlertsSettings.tsx`**
- "Configurações de alertas guardadas" -> "Definições de alertas guardadas"
- "Erro ao guardar configurações" -> "Erro ao guardar definições"
- "Guardar Configurações" -> "Guardar Definições"
- "Usa as configurações Brevo da organização" -> "Usa as definições Brevo da organização"

### Nota
- A página Settings.tsx já usa "Definições" no titulo -- está correto
- As referências em edge functions (Supabase) que dizem "Definições → Integrações" já estão corretas
- Total: 6 ficheiros a editar, todas as alterações são simples substituições de texto
