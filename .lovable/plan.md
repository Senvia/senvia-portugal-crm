

# Igualar Regra "Vendas Concluídas" à Regra "Vendas Entregues"

## Problema Atual
A regra "Bloquear edição de vendas concluídas" bloqueia SEMPRE utilizadores não-admin, independentemente da definição estar ativa ou não. Já a regra "Vendas entregues" só bloqueia quando a definição está ativada, e apenas para não-admins.

## Solução
Tornar ambas as regras iguais: só bloqueiam quando a definição está ativada, e apenas para utilizadores sem perfil de administrador.

---

## Secção Técnica

### 1. SalesSettingsTab - Atualizar descrição (linha 66)

Alterar a descrição de:
```
Vendas com estado "Concluída" não podem ser editadas.
```
Para:
```
Vendas com estado "Concluída" não podem ser editadas por utilizadores sem perfil de administrador.
```

### 2. SaleDetailsModal - Usar setting `lockDeliveredSales` (linha 106)

Alterar:
```typescript
const isDeliveredAndLocked = sale?.status === 'delivered' && !isAdmin;
```
Para:
```typescript
const isDeliveredAndLocked = lockDeliveredSales && sale?.status === 'delivered' && !isAdmin;
```

### 3. EditSaleModal - Usar setting e permitir admins (linha 100)

Atualmente não consulta a definição. Alterar:
```typescript
const isDeliveredLocked = sale?.status === 'delivered' && !isAdmin;
```
Para:
```typescript
const { data: orgData } = useOrganization();
const salesSettings = (orgData?.sales_settings as { lock_delivered_sales?: boolean }) || {};
const isDeliveredLocked = !!salesSettings.lock_delivered_sales && sale?.status === 'delivered' && !isAdmin;
```

### Ficheiros a alterar:
- `src/components/settings/SalesSettingsTab.tsx` (descrição)
- `src/components/sales/SaleDetailsModal.tsx` (lógica)
- `src/components/sales/EditSaleModal.tsx` (lógica + import hook)

