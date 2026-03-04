

## Problema

O `LostLeadDialog` está a usar o variant `default` do `DialogContent` (modal centrado pequeno com `max-w-md`), mas o padrão do projeto é usar modais **fullScreen** que respeitam a sidebar no desktop.

## Solução

Converter o `LostLeadDialog` para usar o variant `fullScreen` com o padrão de layout do projeto: `DialogContent` com `variant="fullScreen" className="p-0 gap-0"`, e organizar o conteúdo com header fixo, corpo com scroll, e footer fixo.

### Alteração

| Ficheiro | Ação |
|---|---|
| `src/components/leads/LostLeadDialog.tsx` | Mudar `DialogContent` para `variant="fullScreen" className="p-0 gap-0 flex flex-col"`. Estruturar com header fixo (com padding), corpo scrollável (`flex-1 overflow-y-auto p-4 md:p-6`), e footer fixo (`border-t p-4`). Remover `max-w-md`. |

### Estrutura

```text
┌──────────────────────────────┐
│ Header (fixo, border-b, p-4)│
│  Título + Descrição          │
├──────────────────────────────┤
│ Corpo (scroll, p-4/p-6)     │
│  Motivo da perda             │
│  Notas                       │
│  Data de recontacto          │
│  Tipo de evento              │
│  Lembrete                    │
├──────────────────────────────┤
│ Footer (fixo, border-t, p-4)│
│  Cancelar / Perdido / Agendar│
└──────────────────────────────┘
```

