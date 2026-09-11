# Correções A02, A17 e A19

## A02: editor de e-mail

`src/lib/email-html.ts` concentra DOMPurify com lista permitida de tags/atributos e filtro de estilos. Remove conteúdo ativo, eventos, links inseguros, classes globais e imagens remotas. Preserva formatação de e-mail, marcadores de citação/assinatura e imagens raster em data URLs.

`EmailComposer.tsx` usa essa fronteira ao carregar respostas, responder a todos, encaminhar, abrir rascunhos e assinaturas, colar, salvar e enviar. Campos textuais do remetente são escapados antes da interpolação. `RichTextEditor.tsx` aplica a mesma proteção ao carregar, colar, inserir imagens e emitir HTML; bloqueia drop HTML e links com esquemas inseguros.

## A17: CSV

`src/lib/export-csv.ts` neutraliza células e cabeçalhos textuais com prefixos de fórmula/controle, preservando valores numéricos. Força aspas CSV para que CR, LF, separadores e aspas não abram novas células. O teste detectou CR a separar uma linha sem aspas; após a correção o roundtrip preserva o campo. Exportação XLSX mantém o fluxo existente de células tipadas.

## A19: cabeçalhos

`vercel.json` versiona nosniff, referrer policy e CSP. Proteção contra framing é aplicada ao CRM; `/f/...` e `/c/...` continuam incorporáveis em páginas HTTP/HTTPS. `object-src`, `base-uri` e `frame-ancestors` são enforced. A política de recursos é Report-Only para observar compatibilidade antes de enforcement de scripts, fontes, Meta e conexões. Não houve deploy nem inspeção de headers publicados.

## Evidência e limites

- `node --test src/lib/email-html.test.ts src/lib/export-csv.test.ts src/lib/security-headers.test.ts`: 9 testes passaram.
- Há controle positivo em JSDOM: o handler de erro da fixture executa sem sanitização e não executa após sanitização. Isso é teste DOM em Node, não execução em navegador real.
- Testes de CSV usam SheetJS real e verificam roundtrip de conteúdo, números, caracteres de controle e cabeçalhos.
- Testes de cabeçalhos verificam regras locais e separação das rotas, não o roteador da Vercel publicado.
- TypeScript strict dos helpers de produção, teste CSV e teste de cabeçalhos passou.
- TypeScript global possui erros fora deste conjunto. Após instalar `@types/jsdom`, o TypeScript strict do teste DOM também passou.
- Browser real não executado: a auditoria registrou bloqueio da revisão automática por limite de utilização. Não foi tentado contornar esse bloqueio.
- Nenhum arquivo de loja foi alterado neste conjunto.

## Compatibilidade com os novos limites do backend

`GenerateProspectsDialog.tsx` limita a interface e a validação antes do envio a 50 resultados, 10 perguntas, 50 enriquecimentos e 3 termos/URLs. Mensagens de validação indicam os limites; URLs seguem os hosts HTTPS permitidos pelo backend.

`useOttoChat.ts` valida a nova mensagem e o máximo de 5 anexos antes de adicionar a mensagem ou fazer uploads. `paid-client-input.ts` mantém o contexto mais recente dentro de 40 mensagens, 8000 caracteres por mensagem e 60 KiB de JSON UTF-8, reservando 4 KiB para o envelope e anexos. Mensagens vazias são omitidas e nomes de arquivos são limitados para manter os caminhos abaixo de 512 caracteres. O histórico exibido não é apagado.

`node --test src/lib/paid-client-input.test.ts`: 4 testes passaram, cobrindo histórico longo, UTF-8, conteúdo legado grande, mensagens vazias, validação antes de efeitos e limites de prospecção. TypeScript strict do helper e testes passou. Não houve teste browser do formulário devido ao bloqueio já registrado.
