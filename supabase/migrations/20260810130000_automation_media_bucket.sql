-- Bucket para anexos das automações (imagens/PDF/vídeo dos nós de WhatsApp).
--
-- O cliente faz upload no editor em vez de colar um URL. O caminho começa
-- sempre pelo id da organização (`{org_id}/{uuid}-{ficheiro}`), e as políticas
-- prendem a escrita a membros dessa organização. Leitura pública: a Evolution
-- API vai buscar o ficheiro por URL no momento do envio.

INSERT INTO storage.buckets (id, name, public)
VALUES ('automation-media', 'automation-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "automation media public read" ON storage.objects;
CREATE POLICY "automation media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'automation-media');

DROP POLICY IF EXISTS "automation media org upload" ON storage.objects;
CREATE POLICY "automation media org upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'automation-media'
    AND auth.role() = 'authenticated'
    AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "automation media org delete" ON storage.objects;
CREATE POLICY "automation media org delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'automation-media'
    AND auth.role() = 'authenticated'
    AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
