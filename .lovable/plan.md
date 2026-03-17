
Objetivo

Ao reabrir uma campanha como rascunho, ela deve voltar com os destinatários já preparados, sem obrigar a:
- selecionar listas novamente
- carregar contactos manualmente
- refazer filtro
- voltar a escolher contactos individuais

O que confirmei no código

- O problema está no `CreateCampaignModal`:
  - quando edita uma campanha, ele só repõe `name`, `subject`, `template`, `html`, `settings` e `settings_data`
  - não repõe `selectionMode`, `selectedListIds`, `statusFilter` nem `selectedClients`
- O `useReopenCampaign` limpa apenas `email_sends` e métricas; não apaga `settings_data`
- Ou seja: a campanha volta a rascunho, mas a segmentação não está guardada de forma utilizável para reconstruir o modal

Decisão já confirmada

- Preservar tudo: listas, seleção individual e seleção por filtro

Abordagem recomendada

1. Guardar um “snapshot” dos destinatários dentro da própria campanha
- Aproveitar `settings_data` para guardar também metadados de audiência, por exemplo:
  - modo de seleção
  - ids das listas selecionadas
  - filtro de status
  - snapshot dos contactos selecionados
- Isto evita migration nova e funciona com o que já existe

2. Atualizar todos os pontos onde a campanha é guardada
- Sempre que fizer:
  - guardar campanha
  - enviar já
  - agendar envio
- incluir no `settings_data` os dados da audiência atual

3. Reidratar o modal ao reabrir
- No `useEffect` de edição do `CreateCampaignModal`, além dos campos atuais:
  - restaurar `selectionMode`
  - restaurar `selectedListIds`
  - restaurar `statusFilter`
  - restaurar `selectedClients`
- Resultado: ao abrir o rascunho, os contactos já aparecem prontos

4. Melhorar o modo “Lista”
- Se a campanha tiver listas guardadas:
  - mostrar as listas já selecionadas
  - preencher automaticamente os contactos sem exigir clique em “Carregar contactos”
- Opcionalmente fazer refresh silencioso dos membros dessas listas ao abrir, mantendo deduplicação por email

5. Manter o comportamento atual de reabrir
- Continuar a limpar `email_sends` e métricas ao reabrir, para não misturar históricos
- A diferença é que a audiência deixa de depender da fila antiga e passa a ser reconstruída do snapshot da campanha

Ficheiros a alterar

- `src/components/marketing/CreateCampaignModal.tsx`
  - guardar e restaurar a segmentação
  - auto-carregar listas ao reabrir
- `src/hooks/useCampaigns.ts`
  - garantir que create/update continuam a enviar `settings_data` com os novos metadados de audiência
- Opcional:
  - `src/types/marketing.ts`
    - documentar melhor os campos usados em `settings_data`

Resultado esperado

- Reabrir campanha como rascunho deixa tudo preparado
- Se foi criada por lista, a lista já vem marcada e os contactos já vêm carregados
- Se foi por filtro, o filtro volta aplicado
- Se foi seleção manual, os contactos voltam selecionados
- O utilizador só reabre, ajusta o que quiser e envia

Detalhe técnico

Estratégia de persistência sugerida dentro de `settings_data`:
```text
audience_mode
audience_status_filter
audience_list_ids
audience_selected_clients
```

Comportamento de reconstrução:
```text
Abrir campanha em edição
  -> ler settings_data
  -> restaurar modo/filtros/listas/contactos
  -> se houver listas, fazer auto-load silencioso
  -> deduplicar por email
```
