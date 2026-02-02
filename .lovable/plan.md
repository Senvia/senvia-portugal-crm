

## Corrigir Pipeline Telecomunicações

### Resumo
Adicionar a etapa "Agendado" que está em falta no pipeline de Telecomunicações e corrigir o lead com status `lost` para `perdido`.

---

### Problema Identificado

| Status do Lead | Etapa no Pipeline | Ação Necessária |
|----------------|-------------------|-----------------|
| `scheduled` (2 leads) | ❌ Não existe | Adicionar etapa "Agendado" |
| `lost` (1 lead) | ❌ Key errada (existe `perdido`) | Atualizar para `perdido` |

---

### Alterações Necessárias

#### 1. Adicionar Etapa "Agendado" ao Pipeline

Inserir nova etapa na tabela `pipeline_stages` para a organização de Telecomunicações:

| Campo | Valor |
|-------|-------|
| name | Agendado |
| key | scheduled |
| color | #F59E0B (amarelo/laranja) |
| position | 3 (entre Contactado e Proposta) |
| is_final_positive | false |
| is_final_negative | false |

**Nota:** Também será necessário ajustar a posição das etapas seguintes (+1).

#### 2. Corrigir Lead com Status `lost`

Atualizar o lead que tem status `lost` para `perdido` (a key correta da etapa final negativa).

#### 3. Atualizar Template de Telecomunicações

Adicionar a etapa "Agendado" ao template em `src/lib/pipeline-templates.ts` para que novas organizações de Telecomunicações já venham com esta etapa.

---

### Ficheiros a Modificar

1. **SQL (via ferramenta)** - Inserir etapa "Agendado" e reordenar posições
2. **SQL (via ferramenta)** - Atualizar lead `lost` → `perdido`
3. **`src/lib/pipeline-templates.ts`** - Adicionar etapa "Agendado" ao template telecom

---

### Pipeline Final de Telecomunicações

```text
1. Lead (new)
2. Contactado (contactado)
3. Agendado (scheduled)     ← NOVA ETAPA
4. Proposta (proposal)
5. Instalação (installation)
6. Ativo (active)           ← Final Positivo
7. Perdido (perdido)        ← Final Negativo
```

---

### Resultado Esperado

- "Sem Etapa" desaparece do Kanban
- Os 2 leads "scheduled" aparecem na nova etapa "Agendado"
- O lead "lost" aparece corretamente em "Perdido"
- Novas organizações de Telecomunicações já terão a etapa "Agendado" incluída

