

## Hospedar Imagem no Supabase Storage

### Cores identificadas na imagem

| Elemento | Cor HEX |
|---|---|
| Fundo (azul escuro) | `#0B2545` |
| Texto / Contorno (creme) | `#E8D5B7` |
| Lâmpada (amarelo) | `#F5C542` |
| Cérebro (laranja) | `#E8943A` |
| Base da lâmpada (cinza) | `#6B7C8A` |

### Plano

1. Copiar a imagem para `public/` do projeto
2. Fazer upload para o bucket `organization-logos` (público) via migração SQL ou diretamente no código
3. A URL pública será: `https://zppcobirzgpfcrnxznwe.supabase.co/storage/v1/object/public/organization-logos/escolha-inteligente-logo.png`

Alternativa mais simples: copiar para `public/org-logos/escolha-inteligente-logo.png` — ficaria acessível via URL do projeto: `https://senvia-portugal-crm.lovable.app/org-logos/escolha-inteligente-logo.png`

### Alterações
- Copiar `user-uploads://image-133.png` para `public/org-logos/escolha-inteligente-logo.png`

