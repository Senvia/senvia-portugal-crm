1. Confirmar a causa exacta no domínio que o utilizador está mesmo a usar
- Validar o comportamento em `app.senvia.pt/leads` e comparar com o domínio publicado oficial `senvia-portugal-crm.lovable.app/leads`.
- Partir do que já foi confirmado no código: o botão `Importar` existe em `src/pages/Leads.tsx` e não está escondido por permissões nessa view.
- Partir também do que a captura mostra: o utilizador está a abrir `app.senvia.pt`, não o domínio publicado do projecto.

2. Ajustar a estratégia de publish/domínio
- Verificar se o fluxo actual está a publicar apenas para `senvia-portugal-crm.lovable.app` enquanto o utilizador continua a operar em `app.senvia.pt`.
- Se `app.senvia.pt` estiver a servir uma shell/bundle antigo ou independente, alinhar a app para não apontar cegamente produção para esse domínio quando o bundle activo do projecto está noutro host.
- Rever `src/lib/constants.ts`, porque hoje `PRODUCTION_URL` está hardcoded para `https://app.senvia.pt`, o que pode estar a mascarar a origem real da versão live e a confundir links/embeds.

3. Fortalecer a limpeza de sessões antigas/PWA no host real em uso
- Manter o kill-switch actual, mas garantir cobertura total do host que os utilizadores realmente usam.
- Validar se é preciso servir também um kill-switch compatível com caminhos/nome alternativos já usados anteriormente (`/service-worker.js` além de `/sw.js`, se aplicável).
- Adicionar uma guarda explícita em `src/main.tsx` para desregistrar qualquer service worker antigo em preview/iframe e em cenários conhecidos de shell presa.

4. Adicionar prova visual inequívoca da versão activa
- Substituir a versão hardcoded actual (`APP_VERSION = '1.30.1'`) por um identificador de build gerado no build ou derivado do bundle activo.
- Mostrar esse identificador no login/sidebar para que se veja imediatamente se `app.senvia.pt` e `senvia-portugal-crm.lovable.app` estão na mesma versão.
- Opcionalmente expor também o host actual junto da versão em ambientes administrativos, para eliminar dúvida sobre “qual live” está aberto.

5. Validar o botão no host certo e em sessão autenticada
- Testar novamente a rota `/leads` autenticada no host que o utilizador usa (`app.senvia.pt`) e confirmar visualmente se o cabeçalho mostra `Importar` + `Adicionar`.
- Se o host continuar sem o botão apesar do código correcto, isolar se o problema é:
  - deploy diferente entre hosts,
  - shell antiga persistida,
  - ou um frontend separado nesse domínio.

6. Entrega esperada após implementação
- O domínio live usado pelo utilizador passa a servir a mesma versão nova do frontend.
- O botão `Importar` aparece ao lado de `Adicionar` em Leads > Pipeline.
- A app mostra um identificador de build real para confirmar a versão em produção.
- O risco de ficar preso em bundle antigo por service worker reduz drasticamente.

Detalhes técnicos
- Ficheiros mais prováveis para alteração:
  - `src/lib/constants.ts`
  - `src/main.tsx`
  - `public/sw.js`
  - possivelmente `public/service-worker.js`
  - `src/components/layout/AppSidebar.tsx`
  - `src/components/layout/MobileMenu.tsx`
  - eventualmente `vite.config.ts` para injectar build id
- Observações confirmadas nesta análise:
  - `src/pages/Leads.tsx` renderiza sempre o botão `Importar` quando `activeTab === 'pipeline'`.
  - A captura do utilizador mostra `app.senvia.pt/leads`, não o domínio publicado do projecto.
  - O projecto publicado oficial continua a ser `https://senvia-portugal-crm.lovable.app`.
  - `PRODUCTION_URL` está fixo para `https://app.senvia.pt`, o que merece correcção/alinhamento.

Quando aprovares, eu implemento esta correcção focada no domínio live real que estás a usar, em vez de assumir que o problema está só no domínio publicado padrão.