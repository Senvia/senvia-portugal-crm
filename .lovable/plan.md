

## Adicionar "Prospects" na barra de navegação inferior (mobile)

### Problema
O separador Prospects só aparece no menu lateral (`MobileMenu.tsx`) mas falta na barra de navegação inferior (`MobileBottomNav.tsx`), que é a navegação principal no mobile.

### Solução

**Ficheiro: `src/components/layout/MobileBottomNav.tsx`**

1. Importar `Search` de `lucide-react`
2. Na secção `perfect2GetherItems` (linha ~60), adicionar o item Prospects antes do Portal:
   ```ts
   const perfect2GetherItems: NavItem[] = hasPerfect2GetherModuleAccess
     ? [
         { to: "/prospects", icon: Search, label: "Prospects" },
         { to: "/portal-total-link", icon: Building2, label: "Portal" },
       ]
     : [];
   ```

### Ficheiros alterados
- `src/components/layout/MobileBottomNav.tsx` — adicionar item Prospects para P2G

