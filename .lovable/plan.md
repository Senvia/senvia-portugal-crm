

# Refazer Criacao de Campanhas -- Fiel ao Brevo

## Fluxo Completo (4 Steps)

### Step 1 -- Tipo de Campanha (NOVO)
- Titulo: "Criar uma campanha"
- Seccao "Padrao" com 3 cards visuais lado a lado:
  - **E-mail** (icone Mail, clicavel)
  - **SMS** (icone MessageSquare, badge "Em breve", desactivado, opacity-60)
  - **WhatsApp** (icone Phone, badge "Em breve", desactivado, opacity-60)
- Ao clicar no E-mail, avanca para Step 2

### Step 2 -- Nome da Campanha
- Titulo: "Criar uma campanha de e-mail"
- Toggle "Regular" (unico disponivel)
- Campo "Nome da campanha" com contador 0/128
- Footer: "Cancelar" + "Criar campanha" (desactivado ate ter nome)

### Step 3 -- Stepper com 4 seccoes
Header: nome da campanha + badge "Rascunho"

**Seccao 1 - Remetente:** Pre-preenchido com org (sempre completo)

**Seccao 2 - Destinatarios:** Tabs Individual/Filtro/Lista (igual ao actual)

**Seccao 3 - Assunto:** Campo editavel para o subject do email. Pre-preenchido se um template for escolhido, mas sempre editavel manualmente.

**Seccao 4 - Conteudo:** Duas opcoes via tabs:
- **"Usar Template"**: Selector de template existente (como esta agora)
- **"Criar email"**: Editor inline (usando o componente `TemplateEditor` que ja existe) -- o conteudo NAO e guardado como template, e usado apenas para esta campanha

---

**Configuracoes adicionais** (seccao colapsavel, antes dos botoes):
Baseado no print do Brevo, com checkboxes agrupados:

**Personalizacao:**
- Personalizar o campo "Enviar para"

**Envio e rastreamento:**
- Usar um endereco de resposta diferente
- Ativar rastreio do Google Analytics
- Adicionar anexo
- Atribuir tag
- Configurar data de expiracao

**Assinatura:**
- Utilizar pagina de cancelamento personalizada
- Usar formulario de atualizacao de perfil

**Criacao:**
- Editar cabecalho padrao
- Editar rodape padrao
- Habilitar link "Ver no navegador"

Cada checkbox guarda o valor no estado local (para futuro uso). Botao "Guardar" fecha a seccao.

---

**Footer com 2 botoes:**
- **"Agendar envio"**: Abre um date/time picker para escolher data e hora de envio (guarda na campanha com status `scheduled`)
- **"Enviar campanha"**: Avanca para Step 4 (confirmacao de envio imediato)

Ambos so ficam activos quando todas as seccoes estao completas (nome + destinatarios + assunto + conteudo).

### Step 4 -- Confirmacao
Resumo com: nome, assunto, conteudo (template ou custom), destinatarios. Botoes "Voltar" e "Enviar Campanha" / "Agendar".

## Logica de envio

- Se o utilizador escolheu "Usar Template": envia com `templateId` como antes
- Se o utilizador escolheu "Criar email": envia com o `html_content` e `subject` directamente (sem template)
- O hook `useSendTemplateEmail` precisa de ser ajustado (ou criar um novo `useSendCampaignEmail`) para aceitar HTML directo alem de templateId

## Alteracoes na tabela (migracao SQL)

Adicionar campos a `email_campaigns`:
```
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS html_content TEXT;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
```
- `subject`: assunto custom (quando nao usa template)
- `html_content`: conteudo HTML custom (quando nao usa template)
- `scheduled_at`: data/hora de envio agendado (null = envio imediato)
- `settings`: configuracoes adicionais (checkboxes do Brevo)

## Ficheiros a editar

| Ficheiro | Accao |
|----------|-------|
| Migracao SQL | Adicionar `subject`, `html_content`, `scheduled_at`, `settings` a `email_campaigns` |
| `src/components/marketing/CreateCampaignModal.tsx` | Refazer completo: 4 steps com tipo, nome, stepper (com editor inline + config adicionais + agendar) |
| `src/components/marketing/CampaignsTable.tsx` | Corrigir metricas falsas, mostrar status "Agendada" |
| `src/types/marketing.ts` | Adicionar `CampaignChannel`, actualizar `EmailCampaign` com novos campos |
| `src/hooks/useCampaigns.ts` | Ajustar `useCreateCampaign` para aceitar novos campos |

## Detalhes tecnicos

- O `TemplateEditor` (tiptap) ja existe e sera reutilizado no tab "Criar email" da seccao Conteudo
- O `handleSend` e ajustado: se `contentMode === 'template'` usa templateId, se `contentMode === 'custom'` usa `subject` + `html_content` directos
- As "Configuracoes adicionais" sao guardadas como JSON no campo `settings` -- por agora so guardam o estado dos checkboxes para futuro uso
- O agendamento guarda `scheduled_at` na campanha com status `scheduled` -- o envio real sera implementado depois com um cron/edge function
- Mobile-first: cards de tipo empilhados, seccoes colapsaveis, footer fixo com botoes

