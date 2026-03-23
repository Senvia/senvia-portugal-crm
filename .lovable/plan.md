

## Mostrar link Google Maps na ficha do Lead (prospects convertidos)

### Situação actual
Quando um prospect é distribuído, o SQL já guarda `metadata` (com `google_maps_url`, redes sociais, etc.) dentro de `custom_data`. Porém, o `LeadDetailsModal` trata `custom_data` como pares simples chave/valor — o objecto `metadata` aparece como `[object Object]` ou é ignorado.

### Alterações

**Ficheiro: `src/components/leads/LeadDetailsModal.tsx`**

1. Extrair `google_maps_url` do `custom_data.metadata` (se existir)
2. Adicionar secção visual "Google Maps" na ficha do lead, com:
   - Ícone de mapa + link clicável que abre numa nova tab
   - Mostrado apenas se `google_maps_url` existir (leads vindos de prospects Apify)
3. Extrair e mostrar redes sociais do `metadata` (facebook, instagram, etc.) com ícones clicáveis — reutilizando o padrão já usado na página de Prospects
4. Na lógica de `customDataEntries`, ignorar a chave `metadata` (objecto nested) e chaves internas como `prospect_id`, `source_file_name` para não poluir a UI com dados técnicos

### Ficheiros alterados
| Ficheiro | Acção |
|----------|-------|
| `src/components/leads/LeadDetailsModal.tsx` | Extrair e mostrar Google Maps URL + redes sociais do metadata |

