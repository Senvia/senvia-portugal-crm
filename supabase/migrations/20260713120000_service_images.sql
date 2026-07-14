-- =====================================================
-- service_images: multi-image support for products & services
-- =====================================================
-- One product can have N images. First uploaded = is_primary by default.
-- This is separate from product_images (FK to ecommerce_products) and
-- powers the inbox product picker ("enviar com 1 clique").

CREATE TABLE IF NOT EXISTS public.service_images (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    alt_text        TEXT,
    position        INTEGER NOT NULL DEFAULT 0,
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the most common queries
CREATE INDEX IF NOT EXISTS idx_service_images_product_id_position
    ON public.service_images (product_id, position);

CREATE INDEX IF NOT EXISTS idx_service_images_organization_id
    ON public.service_images (organization_id);

-- =====================================================
-- RLS: multi-tenant isolation via is_org_member
-- =====================================================

ALTER TABLE public.service_images ENABLE ROW LEVEL SECURITY;

-- SELECT: any active org member can see images of their org's products
CREATE POLICY "service_images_select_org_member"
    ON public.service_images
    FOR SELECT
    USING (public.is_org_member(auth.uid(), organization_id));

-- INSERT: only admins can add images
CREATE POLICY "service_images_insert_org_admin"
    ON public.service_images
    FOR INSERT
    WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- UPDATE: only admins can change images (set primary, reorder)
CREATE POLICY "service_images_update_org_admin"
    ON public.service_images
    FOR UPDATE
    USING (public.is_org_member(auth.uid(), organization_id));

-- DELETE: only admins can remove images
CREATE POLICY "service_images_delete_org_admin"
    ON public.service_images
    FOR DELETE
    USING (public.is_org_member(auth.uid(), organization_id));
