## Problema

O Daniel (Escolha Inteligente) não vê o botão "Importar" na página de Leads, embora o código esteja correto. A causa é o Service Worker (PWA) a servir uma versão antiga em cache. O `src/sw.ts` já tem `skipWaiting()` + `clients.claim()`, mas isso só ativa a nova versão **após** a próxima navegação completa — utilizadores com a app aberta há horas/dias continuam a ver a versão antiga indefinidamente.

## Solução

Adicionar um mecanismo de deteção de atualizações em runtime que avisa o utilizador quando há nova versão e força reload limpo.

### 1. Criar hook `src/hooks/usePWAUpdate.ts`

- Usa `virtual:pwa-register` do `vite-plugin-pwa` (já instalado) com `useRegisterSW`.
- Faz polling do SW a cada 60 minutos (`registration.update()`).
- Quando deteta `needRefresh`, expõe estado + função `updateServiceWorker(true)`.

### 2. Criar componente `src/components/pwa/PWAUpdateBanner.tsx`

- Toast persistente (sonner) no topo: "Nova versão disponível" + botão "Atualizar agora".
- Ao clicar: chama `updateServiceWorker(true)` que faz `skipWaiting` + reload.
- Aparece automaticamente quando o hook detecta atualização.

### 3. Montar banner globalmente em `src/App.tsx`

Adicionar `<PWAUpdateBanner />` ao lado do `<Toaster />` para estar disponível em qualquer rota.

### 4. Ajustar `vite.config.ts`

Mudar `injectRegister: 'auto'` para `injectRegister: false` (vamos registar manualmente via hook). Manter `registerType: 'autoUpdate'`.

### 5. Bumpar `SW_VERSION` em `src/sw.ts`

De `1.2.0` → `1.3.0` para garantir que o próximo deploy invalida caches antigos.

## Comunicação ao Daniel (mensagem manual)

Enquanto a fix nova não chega ao device dele, instruir:
- **Browser**: `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac).
- **PWA instalado**: fechar app completamente e reabrir; se persistir, desinstalar e reinstalar.

## Resultado

Depois deste deploy, sempre que houver uma nova versão da Senvia OS, todos os utilizadores (incluindo PWA instalada) verão automaticamente um banner a pedir update — sem necessidade de hard refresh manual nem suporte case-by-case.
