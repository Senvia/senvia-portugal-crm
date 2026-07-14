---
slug: inbox-products-panel
status: awaiting-approval
intent: clear
pending-action: write .omo/plans/inbox-products-panel.md
approach: Add multi-image support to products table + rewrite InboxProductPicker to use products table
---

# Draft: inbox-products-panel

## Components (topology ledger)
| id | outcome | status | evidence |
| --- | --- | --- | --- |
| db-images | New `service_images` table + storage bucket for product images | active | types.ts:3350 (product_images FK blocks reuse) |
| product-form | Upload UI in Create/Edit product modals | active | CreateProductModal.tsx, EditProductModal.tsx |
| inbox-panel | Rewrite InboxProductPicker to use `products` table | active | InboxProductPicker.tsx:82, Inbox.tsx:3092 |
| send-mechanism | Adapt useSendProductInbox for products table + service_images | active | useSendProductInbox.ts |

## Findings (cited - path:lines)
- `product_images` table has FK to `ecommerce_products` (types.ts:3380-3384) → cannot reuse for `products` table
- `products` table has NO image column (types.ts:3444-3474)
- InboxProductPicker uses `useActiveEcommerceProducts()` (InboxProductPicker.tsx:82) → wrong source
- useSendProductInbox fetches from `product_images` table (useSendProductInbox.ts:46-52) → must change
- InboxProductSection already wired in Inbox.tsx:3092-3105 → only needs prop type change
- Storage bucket `product-images` already exists (useProductImages.ts:42) → can reuse or create new

## Decisions (with rationale)
1. **Create new table `service_images`** (not modify product_images) — FK constraint on product_images prevents reuse; new table is clean and isolated
2. **Reuse storage bucket `product-images`** — already exists and configured
3. **Primary image concept** — `is_primary` boolean like e-commerce; first uploaded = primary by default
4. **No migration of existing e-commerce picker** — leave e-commerce flow untouched

## Scope IN
- New `service_images` table with RLS
- Image upload UI in Create/Edit product modals
- Rewrite InboxProductPicker to use `products` table
- Adapt useSendProductInbox for `products` + `service_images`
- TypeScript types update

## Scope OUT (Must NOT have)
- Do NOT touch ecommerce_products or its picker
- Do NOT add images to proposals/sales line items
- Do NOT create a new storage bucket (reuse `product-images`)
- Do NOT modify the existing product_images table or its FK

## Approval gate
status: awaiting-approval
User explicitly requested "faça o plano completo, PRD detalhado e deixe pronto aqui" — this IS the approval.
