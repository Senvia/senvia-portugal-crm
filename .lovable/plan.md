
Objetivo

Evitar que valores longos como o `Facebook Click ID` rebentem o layout no detalhe da lead, mostrando uma versão curta sem perder o dado completo.

O que confirmei no código

- O campo aparece no modal de detalhe da lead em:
  - `src/components/leads/LeadDetailsModal.tsx`
- Hoje os dados de campanha são renderizados assim:
  - label em cima
  - valor completo em texto normal
- O bloco atual não tem truncation, wrap controlado nem ação de copiar, por isso um `fbclid` muito longo sai fora do cartão.

Abordagem recomendada

1. Truncar visualmente os identificadores longos
- Aplicar truncation/line clamp no valor mostrado dentro de “Dados de Campanha”.
- Para chaves técnicas longas como:
  - `fbclid`
  - `gclid`
  - `fbc`
  - `fbp`
- mostrar só uma versão curta, por exemplo início + `...` + fim.

2. Manter acesso ao valor completo
- Preservar o valor completo em tooltip ou `title` no elemento.
- Opcionalmente adicionar botão de copiar nos IDs técnicos, para não obrigar a mostrar tudo no ecrã.

3. Diferenciar campos normais de UTM de IDs técnicos
- `utm_source`, `utm_medium`, `utm_campaign` etc. podem continuar mais legíveis.
- Só os IDs/cookies técnicos devem ser encurtados automaticamente.

4. Proteger o layout
- Garantir `min-w-0` e classes de overflow/truncate no cartão para que nenhum valor empurre a grid para fora.

Ficheiro a alterar

- `src/components/leads/LeadDetailsModal.tsx`

Resultado esperado

- O `Facebook Click ID` deixa de sair fora do quadrado
- O utilizador vê apenas uma versão resumida do código
- O dado completo continua disponível para consulta/cópia quando necessário

Detalhe técnico

Implementação mais segura:
```text
if key in [fbclid, gclid, fbc, fbp]
  mostrar valor resumido
else
  mostrar valor normal

UI:
- texto com truncate
- title com valor completo
- opcional: botão copiar
```
