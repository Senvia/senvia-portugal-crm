

## Adicionar texto informativo na integração WhatsApp Business

### O que muda

Adicionar um bloco informativo no formulário do WhatsApp Business (componente `WhatsAppForm` dentro de `IntegrationsContent.tsx`) com duas mensagens:

1. **Proposito atual**: Explicar que a integracao serve para enviar uma mensagem automatica de recepcao ao novo lead.
2. **Futuro**: Informar que novas funcionalidades estao a caminho.

### Detalhes tecnicos

**Ficheiro:** `src/components/settings/IntegrationsContent.tsx`

No componente `WhatsAppForm`, substituir o bloco amarelo existente (que diz "Dados de conexao da Instancia do WhatsApp deste cliente") por dois blocos:

- Um bloco azul/informativo com o texto:
  > "Atualmente, a integracao do WhatsApp Business tem como unico proposito enviar uma mensagem de recepcao ao novo Lead que acabou de subscrever. Exemplo: 'Ola, seja bem-vindo! Recebemos os seus dados e em breve um agente vai entrar em contacto.'"

- Um segundo bloco (ou continuacao) com:
  > "Em breve vamos adicionar novas funcionalidades a esta integracao."

Nenhuma alteracao de base de dados ou logica -- apenas texto informativo na interface.

