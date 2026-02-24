

## Adicionar bloco informativo na secao de Webhooks

### O que muda

Adicionar um bloco informativo (estilo azul, igual ao do WhatsApp) no topo do componente `WebhooksManager`, explicando de forma simples o que sao webhooks e para que servem no contexto do Senvia OS.

### Texto proposto

> **O que sao Webhooks?**
> Webhooks permitem notificar automaticamente sistemas externos (como CRMs, ferramentas de automacao ou o n8n) sempre que um novo lead e registado. Cada webhook configurado recebe um pedido HTTP POST com os dados do lead em tempo real, permitindo integrar o Senvia OS com qualquer plataforma.

### Detalhes tecnicos

**Ficheiro:** `src/components/settings/IntegrationsContent.tsx`

No componente `WebhooksManager`, substituir o paragrafo simples existente (linha 266-268) por um bloco informativo estilizado com fundo azul (`bg-blue-500/10`), mantendo a mesma linguagem visual usada no WhatsApp Business.

O texto atual "Cada webhook recebera um POST com os dados do lead..." sera movido para dentro do bloco informativo com mais contexto.

Nenhuma alteracao de base de dados ou logica -- apenas texto informativo na interface.

