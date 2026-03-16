
Objetivo

Evitar que o Otto tape ações importantes no ecrã, especialmente em `Prospects`, sem perder o acesso rápido ao assistente.

Diagnóstico rápido

No código atual, o Otto fechado está:
- fixo no canto inferior direito
- com tamanho `h-14 w-14` (56px)
- com `z-[9999]`
- e ainda pode abrir uma bubble de ajuda de `200px`

Isto faz com que ele possa ficar por cima de botões importantes da página.

O que podemos fazer

Opção 1 — Ajuste rápido
- Reduzir o botão do Otto quando está fechado
- Ex.: desktop de `56px` para `44–48px`
- Reduzir também sombra e área visual da bubble

Vantagem:
- resolve logo boa parte da sobreposição

Opção 2 — Melhor equilíbrio
- Diminuir o Otto
- Esconder a bubble de ajuda em páginas operacionais como `/prospects`
- Aplicar posicionamento específico por página, por exemplo:
  - manter o Otto num canto menos intrusivo
  - ou deslocá-lo alguns pixels quando existir UI importante no canto inferior direito

Vantagem:
- mantém o Otto acessível
- reduz muito a sensação de “atrapalhar”

Opção 3 — Solução mais completa
- Tornar o Otto minimizável ou recolhível
- Adicionar estado “compacto” / “mostrar só um pequeno tab”
- Opcionalmente permitir arrastar o botão

Vantagem:
- mais flexível a longo prazo

Minha recomendação

Eu seguiria com a Opção 2:
1. reduzir o tamanho do FAB fechado;
2. remover/suavizar a bubble de ajuda em `Prospects`;
3. criar comportamento específico para páginas com ações importantes no canto inferior direito.

Assim resolves o problema sem esconder totalmente o Otto.

Implementação proposta

1. Ajustar o botão fechado do Otto
- Em `src/components/otto/OttoFAB.tsx`
- Reduzir dimensões do botão
- Ajustar posição e hit area para continuar fácil de clicar

2. Tornar a bubble menos intrusiva
- Desativar a bubble em `Prospects`
- Ou mostrar só 1 vez e nunca mais nessa página
- Ou diminuir largura e distância visual

3. Criar posicionamento por contexto
- Detectar a rota atual
- Em `/prospects`, aplicar versão mais discreta:
  - botão menor
  - sem bubble
  - possível reposicionamento
- Manter comportamento normal nas restantes páginas

4. Opcional: estado “ocultar por sessão”
- Pequeno “x” ou ação de recolher
- O Otto continua disponível, mas deixa de ocupar espaço até a próxima sessão

Ficheiros que eu ajustaria

- `src/components/otto/OttoFAB.tsx`
- possivelmente `src/components/layout/AppLayout.tsx` se eu centralizar regras por página
- eventualmente algum helper de rota, se quiser deixar isto limpo e reutilizável

Resultado esperado

- O Otto deixa de tapar botões importantes
- A página `Prospects` fica mais confortável para trabalhar
- O assistente continua acessível, mas mais discreto

Detalhe técnico

A correção mais limpa é fazer o Otto “context-aware”:
- tamanho menor por default
- bubble desativada em páginas críticas
- posição/estilo adaptados à rota atual

Se quiseres, no próximo passo eu posso implementar já a versão recomendada:
- Otto menor
- sem bubble em `Prospects`
- comportamento mais discreto nessa página
