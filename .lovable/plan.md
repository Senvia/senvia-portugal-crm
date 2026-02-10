

## Obrigar agendamento de follow-up ao mover lead para "Perdido"

### Conceito

Quando um lead é movido para a coluna "Perdido" (por drag-and-drop no Kanban, ou pelo select no modal de detalhes), interceptar a acao e abrir um dialog que obriga a agendar um follow-up futuro antes de confirmar a perda. A ideia e: nenhum lead e verdadeiramente perdido -- e sempre possivel recupera-lo com uma chamada ou reuniao daqui a 30, 60 ou 90 dias.

### Fluxo do utilizador

```text
1. Utilizador arrasta lead para "Perdido"
2. Abre um dialog: "Agendar Recontacto"
   - Motivo da perda (select): Preco, Concorrencia, Sem resposta, Timing, Outro
   - Notas (textarea opcional)
   - Data de recontacto (obrigatoria): botoes rapidos "30 dias", "60 dias", "90 dias" + input de data
   - Tipo de evento: Chamada (default) ou Reuniao
3. Ao confirmar:
   - O lead move para "Perdido"
   - O motivo e guardado nas notas/campo do lead
   - Um evento e criado no calendario para a data de recontacto
4. Se cancelar: o lead fica onde estava
```

### Alteracoes tecnicas

**1. Novo componente: `src/components/leads/LostLeadDialog.tsx`**

Dialog modal com:
- Select para "Motivo da perda" (Preco, Concorrencia, Sem resposta, Timing, Outro)
- Textarea para notas adicionais (opcional)
- 3 botoes rapidos de data (30d, 60d, 90d) que preenchem automaticamente o date input
- Input de data obrigatorio
- Select de tipo de evento (Chamada / Follow-up)
- Botoes Cancelar e "Confirmar e Agendar"

**2. `src/pages/Leads.tsx`**

- Adicionar funcao `isLostStage(stageKey)` seguindo o padrao existente de `isScheduledStage` e `isProposalStage` (procura por keywords como "perdido", "lost")
- No `handleStatusChange`, interceptar quando `isLostStage(newStatus)` e true:
  - Guardar o lead pendente e o status destino
  - Abrir o `LostLeadDialog`
- Handler `handleLostConfirm`:
  - Atualizar o lead com o status "lost" e guardar motivo da perda nas notas
  - Criar evento no calendario com a data e tipo escolhidos (usando `useCreateEvent`)
  - Limpar estados

**3. `src/components/leads/LeadDetailsModal.tsx`**

- Interceptar a mudanca de status no Select (linha 292) quando o novo valor corresponde a um "lost stage"
- Em vez de chamar `onStatusChange` diretamente, delegar para o parent (Leads.tsx) que ja tem a logica de intercecao

### Resultado

- Nenhum lead vai para "Perdido" sem um follow-up agendado
- O vendedor e obrigado a registar porque perdeu o lead (dados valiosos para analise)
- O evento aparece automaticamente no calendario, garantindo que o lead sera recontactado

| Ficheiro | Acao |
|---|---|
| `src/components/leads/LostLeadDialog.tsx` | Novo componente - dialog de perda com agendamento |
| `src/pages/Leads.tsx` | Adicionar intercecao para "lost stages" no handleStatusChange |
| Nenhuma alteracao necessaria no LeadDetailsModal | O onStatusChange ja delega para o Leads.tsx |
