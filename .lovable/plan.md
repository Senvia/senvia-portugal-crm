
## Correção imediata — saldo de férias do Thiago (P2G)

Já validei no backend e o problema está confirmado:

- Pedido aprovado: `ccdb9dd3-a7de-4946-8ddc-834a1347dfd3`
- Tipo: `vacation`
- Dias aprovados no período: **6**
- Saldo atual do Thiago Sousa (`504a57df...`) em 2026: `total_days = 22`, `used_days = 0` (incorreto)

## O que vou aplicar

### 1) Reconciliar o saldo do Thiago agora (correção de dados)
Executar atualização direta de dados (sem migration de schema) para alinhar `rh_vacation_balances.used_days` com a soma real dos períodos aprovados em `rh_absences/rh_absence_periods`.

Resultado esperado para Thiago em 2026:
- `used_days` de `0` → **`6`**
- saldo disponível passa de `22` → **`16`**

### 2) Reconciliar todos os saldos da P2G (evitar outros casos escondidos)
Aplicar a mesma lógica para todos os utilizadores da organização P2G e ano corrente, para garantir que não existe mais nenhum saldo divergente (atualiza apenas quando houver diferença).

### 3) Validação final
Confirmar com queries:
- `expected_used` (calculado a partir das férias aprovadas) = `used_days` (saldo)
- Verificar especificamente o Thiago e devolver os valores finais.

## Detalhes técnicos
- Não haverá alterações de UI nem de hooks neste passo.
- É uma **correção de dados** (UPDATE/UPSERT), portanto será feita com operação de dados no backend.
- A trigger de desconto já existe; este ajuste corrige a inconsistência histórica já gravada.

