
Objetivo

Corrigir os 2 problemas da importação de Prospects:
1. remover a duplicação de botões de importação;
2. corrigir o erro “Erro de politicas” sem enfraquecer a segurança.

O que encontrei

1. Há mesmo 2 botões a fazer a mesma coisa
- Em `src/components/marketing/import/ImportStep1Upload.tsx` existe o botão:
  - `Confirme seu arquivo`
- Em `src/components/prospects/ImportProspectsDialog.tsx` existe outro botão:
  - `Importar prospects`
- Ambos disparam o mesmo `handleImport`.

2. O erro de políticas vem do backend, não do parser do ficheiro
- A policy de `INSERT` da tabela `prospects` existe e está correta:
  - `WITH CHECK (public.is_org_member(auth.uid(), organization_id))`
- O problema é o utilizador atual da sessão:
  - está autenticado como `Thiago Sousa`
  - mas o registo dele pertence à organização `Senvia`
  - e não aparece como membro da organização `Perfect2Gether`
- Resultado:
  - a app tenta inserir prospects com `organization_id = Perfect2Gether`
  - a RLS verifica se o utilizador é membro dessa organização
  - como não é, o insert falha com “Erro de politicas”

3. Há ainda um aviso de React no modal
- `ImportStep1Upload` está a disparar um warning de `ref`.
- Não é a causa do erro de importação, mas vale a pena limpar já nesta correção.

Plano de correção

1. Simplificar o fluxo de importação para 1 único botão
- Remover o botão interno `Confirme seu arquivo` de `ImportStep1Upload`.
- Deixar o componente apenas com:
  - upload,
  - preview,
  - limpar ficheiro.
- Manter a ação final só no footer do modal:
  - `Importar prospects`
- Resultado: UX mais clara e sem ação duplicada.

2. Corrigir a causa real do “Erro de politicas”
- Não vou abrir a policy nem usar `WITH CHECK (true)`.
- A correção certa é alinhar acesso com pertença real à organização.
- Vou rever o fluxo que decide se o módulo Prospects aparece para o utilizador e garantir que:
  - só aparece se a organização ativa for `Perfect2Gether`
  - e se o utilizador for realmente membro ativo dessa organização
- Se necessário, o plano inclui corrigir a validação do lado da app para bloquear o import antes do submit e mostrar mensagem clara:
  - “A tua conta não tem acesso à organização Perfect2Gether”
  em vez de deixar rebentar como erro de políticas.

3. Endurecer a consistência multi-organização
- Rever o helper que ativa o módulo “exclusivo da Perfect2Gether”.
- Hoje ele está baseado só no ID da organização ativa.
- Vou ajustar para também validar membership real do utilizador, seguindo o padrão seguro já usado no projeto:
  - preferir pertença por `organization_members`
  - não confiar apenas em estado/metadados de sessão

4. Melhorar tratamento de erro na importação
- Em `useImportProspects`, interceptar erros de RLS e trocar a mensagem genérica por algo útil:
  - sem acesso à organização ativa
  - ou sem permissão para importar prospects
- Assim fica claro se é problema de acesso e não do ficheiro.

5. Limpeza adicional do modal
- Rever o warning de `ref` ligado a `ImportStep1Upload` para evitar ruído no console.
- Isto não muda a lógica de importação, mas deixa o modal estável.

Resultado esperado

- Fica só 1 botão de importação.
- O utilizador deixa de ver um erro técnico confuso.
- A importação só avança quando houver acesso válido à organização.
- O módulo continua seguro e exclusivo da Perfect2Gether, sem relaxar as políticas da base de dados.

Ficheiros que devem ser ajustados
- `src/components/marketing/import/ImportStep1Upload.tsx`
- `src/components/prospects/ImportProspectsDialog.tsx`
- `src/hooks/useProspects.ts`
- `src/pages/Prospects.tsx`
- possivelmente o helper de organização exclusiva:
  - `src/lib/perfect2gether.ts`

Nota importante
- Pelo estado atual dos dados, o utilizador autenticado não está configurado como membro da Perfect2Gether.
- Mesmo com a correção na app, se quiseres importar com essa conta, ela precisa mesmo de ter acesso a essa organização no backend. A app deve refletir isso claramente, não contornar a segurança.
