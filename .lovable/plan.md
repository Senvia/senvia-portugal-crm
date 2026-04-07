
## Plano: Aviso de Manutenção de Servidores

### O que será feito
Inserir um novo anúncio na tabela `app_announcements` com aviso de manutenção programada para hoje (07/04/2026) das 20h às 21h. O sistema existente de "What's New" (`WhatsNewDialog`) já exibe automaticamente o popup a todos os utilizadores ao entrarem no sistema.

### Ação
1. **Inserir anúncio via migração SQL** na tabela `app_announcements`:
   - Título: "⚠️ Manutenção Programada"
   - Conteúdo: Aviso sobre manutenção dos servidores hoje das 20h às 21h (hora de Lisboa)
   - `is_active: true` — para que apareça imediatamente
   - Versão: nula (não é release de funcionalidade)

2. **Desativar após a manutenção** (opcional) — pode-se desativar manualmente o anúncio anterior de Prospects e este ficará visível. Como o sistema usa `localStorage` para marcar como visto, cada utilizador verá o popup apenas uma vez.

### Detalhes técnicos
- O anúncio anterior (Prospects v1.30.1) será mantido, mas o novo aparecerá por ser mais recente (`ORDER BY published_at DESC LIMIT 1`)
- Cada utilizador verá o popup ao entrar, e após clicar "Entendi" não verá novamente
- Nenhuma alteração de código necessária — apenas inserção de dados
