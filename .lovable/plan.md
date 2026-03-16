
Objetivo

Corrigir o fluxo de distribuição para funcionar assim:
1. selecionas os prospects na lista
2. clicas em “Distribuir leads”
3. no modal podes digitar quantos desses selecionados queres realmente distribuir
4. o sistema distribui apenas essa quantidade, usando os primeiros prospects da seleção

O que está errado hoje

- A seleção manual já existe na tela.
- O botão já só ativa quando há prospects elegíveis selecionados.
- Mas o modal atual distribui sempre todos os selecionados.
- Falta exatamente o campo para escrever a quantidade parcial.

Abordagem que vou implementar

1. Ajustar o modal de distribuição
- Adicionar um campo numérico no modal: “Quantidade a distribuir”.
- Preencher esse campo por defeito com o total selecionado.
- Mostrar claramente:
  - quantidade selecionada
  - quantidade que será distribuída
  - lista de comerciais elegíveis

2. Validar a quantidade
- A quantidade só poderá ser entre `1` e `selectedCount`.
- Se o utilizador selecionar 150 e escrever 40, o modal vai confirmar que serão distribuídos 40.
- O botão principal passa a refletir isso, por exemplo: `Distribuir 40 leads`.

3. Manter a lógica de seleção atual na tela
- A página `Prospects` continua com a seleção manual dos prospects.
- O botão “Distribuir leads” continua a abrir o modal apenas quando houver selecionados elegíveis.
- Não preciso mudar o comportamento da lista, só o modal e a chamada da distribuição.

4. Atualizar a chamada ao backend
- O payload da distribuição passará a enviar:
  - `prospectIds`
  - `quantity`
- Assim o backend sabe que a seleção total pode ser 150, mas só deve processar 40.

5. Atualizar a função de backend
- Ajustar a função `distribute_prospects_round_robin` que hoje recebe apenas os IDs selecionados.
- Ela passará a aceitar também `p_quantity`.
- Como definiste “Primeiros selecionados”, a função vai respeitar a ordem dos IDs recebidos e limitar aos primeiros `p_quantity`.

Resultado esperado

Exemplo:
- selecionas 150 prospects
- clicas em “Distribuir leads”
- no modal aparece “150 selecionados”
- escreves `40`
- ao confirmar, apenas 40 são distribuídos
- serão os primeiros 40 dentro da ordem da seleção enviada pela tela

Ficheiros a ajustar

- `src/components/prospects/DistributeProspectsDialog.tsx`
- `src/hooks/useProspects.ts`
- `src/types/prospects.ts`
- migration para atualizar a função `distribute_prospects_round_robin(...)`

Detalhe técnico

- No modal:
  - novo estado local `quantity`
  - valor inicial = `selectedCount`
  - validação com `min=1` e `max=selectedCount`
- No tipo:
  - `DistributeProspectsPayload` passa a incluir `quantity: number`
- No hook:
  - enviar `p_prospect_ids` + `p_quantity`
- No backend:
  - manter `unnest(p_prospect_ids) WITH ORDINALITY`
  - aplicar limite pelos primeiros `p_quantity`
  - continuar a ignorar prospects que entretanto já tenham sido atribuídos/convertidos

Nota importante

A ordem usada será a dos IDs enviados pela interface. Isso encaixa com o que escolheste: distribuir os “primeiros selecionados”.
