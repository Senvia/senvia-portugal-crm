

## Corrigir membros em falta na organização Telecom

### Problema

Além do Thiago (já corrigido), há mais 3 utilizadores com perfil na Telecom que não estão na tabela `organization_members`, logo não aparecem na lista da equipa:

- **Filipe Coelho** (salesperson)
- **Ana Calado** (viewer)
- **Amt** (salesperson)

### Solução

Executar uma migração SQL para inserir os 3 registos em falta:

```sql
INSERT INTO organization_members (user_id, organization_id, role, is_active, joined_at)
VALUES 
  ('76300665-aff2-4b54-be78-b1123356e6ce', '96a3950e-31be-4c6d-abed-b82968c0d7e9', 'salesperson', true, now()),
  ('f96eca52-5546-45d5-839b-bb2a255f9549', '96a3950e-31be-4c6d-abed-b82968c0d7e9', 'viewer', true, now()),
  ('f54baad9-0482-4f73-8040-f4d1cf370f84', '96a3950e-31be-4c6d-abed-b82968c0d7e9', 'salesperson', true, now())
ON CONFLICT DO NOTHING;
```

### Impacto

Após a migração, os 3 membros ficam imediatamente visíveis na lista de equipa da Telecom. Não é necessária nenhuma alteração de código -- a edge function já foi corrigida no passo anterior para que futuros membros sejam inseridos automaticamente.

### Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| Nova migração SQL | INSERT dos 3 registos em falta em `organization_members` |

