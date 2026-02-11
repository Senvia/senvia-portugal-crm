

## Corrigir Estados em Portugues e Melhorar Matching de Faturas

### Problema 1: Estados em ingles

O InvoiceXpress devolve status como `settled`, `final`, `draft`, `canceled`. O codigo mostra estes valores diretamente sem traducao.

### Problema 2: Coluna "Associada" quase sempre amarela

O matching automatico na edge function nao esta a encontrar correspondencias para a maioria das faturas. Apenas 1 de 6 faturas tem `sale_id` preenchido.

---

### Solucao

**Ficheiro: `src/components/finance/InvoicesContent.tsx`**

1. Adicionar funcao `getStatusLabel` para traduzir os estados:
   - `settled` -> "Liquidada"
   - `final` -> "Finalizada"
   - `draft` -> "Rascunho"
   - `canceled` -> "Anulada"
   - `sent` -> "Enviada"
   - `second_copy` -> "Segunda Via"

2. Melhorar as cores do badge de estado:
   - `settled` -> verde (default/success)
   - `final` / `sent` -> azul
   - `canceled` -> vermelho (destructive)
   - `draft` -> cinza (secondary)

3. Aplicar `getStatusLabel` na linha 232 onde o status e renderizado e tambem na exportacao Excel (linha 71).

---

### Seccao Tecnica

Alteracoes apenas no ficheiro `src/components/finance/InvoicesContent.tsx`:

- Criar funcao `getStatusLabel(status: string): string` com mapa de traducoes
- Criar funcao `getStatusVariant(status: string)` para retornar a variante correta do Badge
- Atualizar a renderizacao do Badge na linha 231-233
- Atualizar a exportacao na linha 71 para usar `getStatusLabel`

Nao sao necessarias alteracoes na edge function nem na base de dados - o problema dos estados e puramente de apresentacao no frontend. O problema do matching requer investigacao separada na logica da edge function.
