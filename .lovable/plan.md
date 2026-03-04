

## Plano: Dois botões no diálogo — "Marcar como Perdido" apenas para nichos não-telecom

### Contexto
O utilizador quer que no nicho **telecom**, o diálogo de recontacto **nunca** permita marcar como perdido diretamente — apenas agendar recontacto. Nos outros nichos, o diálogo deve ter as duas opções.

### Alterações

| Ficheiro | Ação |
|---|---|
| `src/components/leads/LostLeadDialog.tsx` | Adicionar prop `isTelecom`. Tornar `followUpDate` opcional na validação. No footer: mostrar botão "Marcar como Perdido" apenas se `!isTelecom`. Manter botão "Agendar Recontacto" sempre visível. |
| `src/pages/Leads.tsx` | Passar `isTelecom` como prop ao `LostLeadDialog` |

### Detalhe do LostLeadDialog

**Props**: Adicionar `isTelecom?: boolean`

**Validação**:
- "Marcar como Perdido": habilitado quando `lossReason` preenchido (envia `followUpDate: ""`)
- "Agendar Recontacto": habilitado quando `lossReason` E `followUpDate` preenchidos

**Footer (nichos genéricos)**:
```
[Cancelar]  [Marcar como Perdido]  [Agendar Recontacto]
```

**Footer (telecom)**:
```
[Cancelar]  [Agendar Recontacto]
```

- No telecom, a data de recontacto continua obrigatória (com asterisco)
- Nos outros nichos, a data perde o asterisco (é opcional — só necessária para agendar)

A lógica no `Leads.tsx` (`handleLostConfirm`) já está preparada: sem `followUpDate` → marca perdido; com `followUpDate` → move para "Agendado".

