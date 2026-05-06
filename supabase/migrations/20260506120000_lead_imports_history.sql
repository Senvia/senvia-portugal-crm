-- Tabela de histórico de operações de importação de leads
CREATE TABLE lead_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  imported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  import_code TEXT NOT NULL,
  file_name TEXT,
  stage_key TEXT NOT NULL,
  assignee_ids UUID[] NOT NULL DEFAULT '{}',
  total_inserted INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  first_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, import_code)
);

-- Ligar cada lead ao seu lote de importação
ALTER TABLE leads ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES lead_imports(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX idx_lead_imports_org ON lead_imports(organization_id);
CREATE INDEX idx_lead_imports_code ON lead_imports(import_code);
CREATE INDEX idx_leads_import_id ON leads(import_id);

-- RLS
ALTER TABLE lead_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view their imports"
  ON lead_imports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can insert imports"
  ON lead_imports FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
