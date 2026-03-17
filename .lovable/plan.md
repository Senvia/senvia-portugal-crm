
Objetivo

Criar um módulo separado chamado `Portal Total Link`, exclusivo da Perfect2Gether, que consulta o PHC CS por NIF e mostra os dados no ecrã sem sincronizar nada com o CRM.

O que confirmei no projeto
- Já existe controlo de acesso exclusivo para Perfect2Gether em `src/lib/perfect2gether.ts`.
- A navegação principal está em:
  - `src/components/layout/AppSidebar.tsx`
  - `src/components/layout/MobileBottomNav.tsx`
- As rotas protegidas estão em `src/App.tsx`.
- O projeto já usa integrações externas via backend functions para faturação, o que é o padrão certo para PHC CS também.
- As definições atuais de integrações estão centradas em faturação/comunicações; PHC CS ainda não existe no projeto.

Escopo fechado
- Não é integração de faturação.
- Não vai escrever nada no CRM.
- Vai funcionar como “app separada” dentro do produto.
- A primeira ação é: introduzir NIF e consultar informação no PHC CS via API oficial.

Plano de implementação

1. Criar o módulo/rota Portal Total Link
- Adicionar nova página protegida, por exemplo `/portal-total-link`.
- Mostrar na navegação desktop e mobile apenas quando:
  - a organização ativa for Perfect2Gether
  - o utilizador tiver acesso à organização
- Manter o módulo isolado do resto do CRM.

2. Construir a UI inicial do portal
- Página simples e focada:
  - título do módulo
  - campo NIF
  - botão “Consultar”
  - estados de loading, erro e vazio
- Resultado em layout de consulta, não de edição:
  - cards/tabelas por secção conforme o PHC devolver
  - botão de nova pesquisa
- Nada desta página grava dados no sistema.

3. Criar backend function para consultar o PHC CS
- Criar uma backend function dedicada, algo como `phc-cs-lookup`.
- O frontend chama essa função; nunca chama PHC diretamente.
- A função deve:
  - validar autenticação
  - validar acesso à Perfect2Gether
  - validar e normalizar o NIF
  - chamar a API oficial do PHC CS
  - devolver apenas os dados necessários para o portal

4. Definir credenciais e segurança
- Guardar credenciais do PHC CS no backend seguro, não no frontend.
- Como o módulo é exclusivo da Perfect2Gether, a integração pode começar como configuração única desse portal.
- Se fizer sentido operacional, depois pode evoluir para configuração por organização.
- Também vou proteger o acesso no backend, para que a exclusividade não dependa só da UI.

5. Modelar a resposta para o portal
- Criar um mapper entre a resposta do PHC CS e um formato interno estável.
- Isso evita acoplar a UI ao formato bruto da API.
- Exemplo de estrutura:
```text
search(nif) -> backend function -> PHC CS
                          -> normaliza resposta
                          -> devolve:
                             cliente
                             contactos
                             documentos/resumo
                             observações/outros blocos
```

6. Preparar evolução futura
- Estruturar o portal para crescer depois sem mexer no CRM:
  - histórico de consultas opcional
  - múltiplos separadores dentro do portal
  - mais pesquisas além de NIF
  - ações específicas do Portal Total Link

Ficheiros mais prováveis
- `src/App.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- novo ficheiro em `src/pages/PortalTotalLink.tsx`
- novo hook em `src/hooks/...`
- nova backend function em `supabase/functions/phc-cs-lookup/index.ts`

Detalhes técnicos
- Reutilizar `hasPerfect2GetherAccess(...)` para esconder/mostrar o portal.
- O acesso real deve ser validado novamente no backend function.
- A UI deve ser read-only nesta fase.
- A integração depende de confirmar os detalhes da API do PHC CS:
  - URL base
  - método de autenticação
  - endpoint de pesquisa por NIF
  - formato da resposta

Resultado esperado
- Surge um novo módulo “Portal Total Link”.
- Só a Perfect2Gether o vê.
- O utilizador introduz um NIF.
- O sistema consulta o PHC CS e apresenta a informação no portal.
- Nenhum dado é sincronizado para Leads, Clientes, Propostas ou Vendas.

Validação
- Utilizador fora da Perfect2Gether:
  - não vê o módulo
- Utilizador Perfect2Gether:
  - vê e abre o portal
- NIF válido com registo no PHC:
  - dados aparecem corretamente
- NIF inválido ou sem registo:
  - mensagem clara de erro/sem resultados
- Confirmar que nada é criado ou atualizado no CRM
