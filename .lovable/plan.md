

# Atualizar Pipeline Padrao de Telecomunicacoes

## Alteracao

O pipeline atual de Telecom tem 7 etapas:
Lead -> Contactado -> Agendado -> Proposta -> Instalacao -> Ativo -> Perdido

O novo pipeline tera 5 etapas:
Lead -> Contactado -> Agendado -> Ganho -> Perdido

## Ficheiro Alterado

**`src/lib/pipeline-templates.ts`** (linhas 83-90)

Substituir as stages do template `telecom` por:

```text
{ name: 'Lead',       key: 'new',        color: '#3B82F6', position: 1, is_final_positive: false, is_final_negative: false }
{ name: 'Contactado', key: 'contactado', color: '#A855F7', position: 2, is_final_positive: false, is_final_negative: false }
{ name: 'Agendado',   key: 'scheduled',  color: '#F59E0B', position: 3, is_final_positive: false, is_final_negative: false }
{ name: 'Ganho',      key: 'won',        color: '#22C55E', position: 4, is_final_positive: true,  is_final_negative: false }
{ name: 'Perdido',    key: 'perdido',    color: '#6B7280', position: 5, is_final_positive: false, is_final_negative: true  }
```

## Nota

Esta alteracao afeta apenas o template padrao para novas organizacoes Telecom ou ao reaplicar o template. Organizacoes existentes mantem o seu pipeline atual ate reaplicarem manualmente.
