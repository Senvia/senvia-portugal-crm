

## Plano: Calcular duração do contrato automaticamente a partir das datas

O código já tem lógica parcial para isto, mas o campo "Duração" ainda aparece como editável manualmente. A alteração torna as datas (início/fim) o input principal e a duração passa a ser auto-calculada e read-only.

### Ficheiro: `src/components/proposals/ProposalCpeSelector.tsx`

**1. CPEs já adicionados (grid de edição, linhas 299-387):**
- Mover os campos "Início Contrato" e "Fim Contrato" para a mesma linha do Consumo/DBL (substituindo a posição da Duração)
- Tornar o campo "Duração (anos)" read-only (`disabled`) com estilo `bg-muted`, auto-calculado a partir das datas
- Layout: `Consumo | Início Contrato | Fim Contrato | DBL` na primeira linha, `Duração (auto) | Margem (auto) | Comissão` na segunda

**2. Formulário de adicionar CPE (linhas 467-516):**
- Mover os campos de data para antes dos campos de energia (acima do Consumo/DBL)
- Tornar `updateDuracaoContrato` read-only com estilo auto
- Já existe o `useEffect` (linhas 100-110) que calcula a duração quando `contrato_fim` muda — mantê-lo

**3. Lógica `handleUpdateCpeField` (linhas 166-211):**
- Quando `contrato_inicio` ou `contrato_fim` muda, calcular `duracao_contrato` automaticamente (já existe nas linhas 192-207)
- Remover a lógica que calcula `contrato_fim` a partir de `duracao_contrato` (linhas 183-190), pois agora a duração é derivada, não o contrário
- Tornar o campo de duração read-only nos CPEs adicionados

**4. Formulário de adicionar CPE — `useEffect` (linhas 88-98):**
- Remover o efeito que calcula `contrato_fim` a partir de `inicio + duração` (linhas 88-98), pois o fluxo agora é inverso
- Manter o efeito que calcula `duração` a partir das datas (linhas 100-110)

Nenhuma alteração de base de dados necessária — `duracao_contrato` continua a ser guardado na tabela `proposal_cpes` como valor numérico.

