## O que encontrei
- No código, o botão **Importar** existe em `src/pages/Leads.tsx` e **não está protegido por permissão**.
- No preview, entrando na organização **Escolha Inteligente**, o botão aparece normalmente.
- No published live, o frontend já está a servir o bundle novo: a rede mostrou `PWAUpdateBanner` e o bundle JS publicado contém a string **"Importar"**.
- Portanto, o problema mais provável **não é publish falhado** nem falta de código. O problema é um **shell antigo preso em cache por Service Worker/PWA** em alguns dispositivos/sessões live.

## Plano
1. **Parar a origem do problema de cache**
   - Remover a estratégia atual de PWA cache agressivo, ou reduzir para uma configuração segura.
   - Como o objetivo principal é instalar o app e não offline complexo, migrar para uma abordagem mais segura para não continuar a servir bundles velhos.

2. **Enviar um kill-switch para limpar os devices já afetados**
   - Publicar um `sw.js` de limpeza no mesmo caminho do service worker atual.
   - Esse worker vai:
     - assumir controlo imediato,
     - apagar caches antigos,
     - forçar reload das janelas abertas,
     - fazer `unregister()`.
   - Manter esse cleanup por pelo menos um ciclo de release para desalojar instalações antigas.

3. **Blindar o app contra repetição do problema**
   - Adicionar proteção em `src/main.tsx` para **nunca** registar service worker em preview/iframe.
   - Se o PWA continuar ativo, configurar navegação HTML com estratégia segura e sem prender shell antigo.
   - Se offline não for essencial, deixar apenas manifest/installability sem SW persistente.

4. **Adicionar prova visível de versão/build**
   - Mostrar uma identificação curta de build no login ou no rodapé/sidebar.
   - Assim dá para confirmar imediatamente se Daniel está no build novo ou num shell velho, sem adivinhação.

5. **Validar nos dois cenários críticos**
   - Confirmar no preview e no published live que:
     - `Escolha Inteligente > Leads` mostra o botão **Importar**,
     - um navegador “limpo” funciona,
     - uma sessão com cache antigo é forçada a atualizar.

## Resultado esperado
Depois desta correção, o live deixa de ficar preso numa versão antiga e o botão **Importar** passa a aparecer de forma consistente para ti e para o Daniel, sem depender de republicar várias vezes ou mandar hard refresh manual.

## Detalhes técnicos
- Ficheiros prováveis a mexer:
  - `vite.config.ts`
  - `src/main.tsx`
  - `src/sw.ts` ou substituição por kill-switch estático
  - eventual ponto visual de versão no layout/login
- Validação principal:
  - published `/leads` com sessão autenticada
  - device/sessão com cache antigo previamente registado no PWA