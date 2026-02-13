
# Configuracoes Adicionais da Campanha - Funcionais via Brevo API

## Situacao Actual

Os checkboxes de "Configuracoes adicionais" existem na UI mas sao apenas guardados como JSON. Nenhuma dessas opcoes e realmente aplicada ao enviar o email via Brevo.

## O que vai mudar

Cada checkbox vai ganhar campos de input contextuais (quando necessario) e o edge function vai aplicar essas configuracoes na chamada a API da Brevo.

## Mapeamento das Configuracoes

### PERSONALIZACAO
| Opcao | Implementacao |
|-------|--------------|
| Personalizar "Enviar para" | Usa o nome do destinatario no campo `to.name` (ja funciona parcialmente, mas vai ser melhorado com formatacao "Nome - Empresa") |

### ENVIO E RASTREAMENTO
| Opcao | Implementacao |
|-------|--------------|
| Endereco de resposta diferente | Campo de input para email de reply-to. Enviado como `replyTo` na API Brevo |
| Rastreio Google Analytics | Campo para UTM Campaign. Adiciona `?utm_source=brevo&utm_medium=email&utm_campaign=X` a todos os links no HTML |
| Adicionar anexo | Upload de ficheiro (base64). Enviado como `attachment` na API Brevo |
| Atribuir tag | Campo de input para nome da tag. Enviado como `tags` na API Brevo |
| Data de expiracao | Nota informativa (Brevo nao suporta expiracao nativa em transacional; opcao guardada como metadata) |

### ASSINATURA
| Opcao | Implementacao |
|-------|--------------|
| Pagina de cancelamento personalizada | Campo para URL. Substitui o link `{{ unsubscribe }}` no HTML por esse URL |
| Formulario de actualizacao de perfil | Nota informativa (requer integracao Brevo Contacts avancada; guardado como metadata) |

### CRIACAO
| Opcao | Implementacao |
|-------|--------------|
| Editar cabecalho padrao | Campo textarea para HTML do cabecalho. Inserido antes do conteudo principal |
| Editar rodape padrao | Campo textarea para HTML do rodape. Inserido apos o conteudo principal |
| Link "Ver no navegador" | Nota informativa (requer hosting do email como pagina web; guardado como metadata para futuro) |

## Alteracoes por Ficheiro

### 1. `src/components/marketing/CreateCampaignModal.tsx`

- Transformar `CAMPAIGN_SETTINGS_GROUPS` para incluir o tipo de input de cada opcao (`toggle_only`, `text`, `email`, `textarea`, `file`)
- Quando um checkbox e activado e tem um tipo de input, mostrar o campo correspondente abaixo do checkbox
- Guardar os valores extras num novo state `settingsData` (Record de string para string)
- Passar `settingsData` junto com `settings` ao criar a campanha e ao enviar

### 2. `src/hooks/useCampaigns.ts`

- Actualizar `CreateCampaignData` para aceitar `settings_data?: Record<string, string>` com os valores extras (reply-to email, tag name, UTM, etc.)

### 3. `supabase/functions/send-template-email/index.ts`

- Receber `settings` e `settingsData` no body do request
- Aplicar as configuracoes na chamada a API Brevo:
  - `replyTo`: se `different_reply_to` activo, usar o email fornecido
  - `tags`: se `tag` activo, incluir a tag no array
  - `attachment`: se `attachment` activo, incluir o ficheiro em base64
  - GA tracking: se `ga_tracking` activo, percorrer o HTML e adicionar UTM params aos links
  - Custom header/footer: se activos, concatenar ao HTML antes/depois do conteudo
  - Custom unsubscribe: se activo, substituir placeholder no HTML

### 4. Migracao SQL (se necessario)

- Adicionar coluna `settings_data` (JSONB) a tabela `email_campaigns` para guardar os valores dos campos extras

## Opcoes que ficam como metadata (sem implementacao funcional imediata)

Algumas opcoes nao tem equivalente directo na API transacional da Brevo. Estas ficam guardadas na base de dados para futura implementacao:
- "Configurar data de expiracao"
- "Usar formulario de actualizacao de perfil"
- "Habilitar link Ver no navegador"

Estas opcoes terao uma nota `(Em breve)` ao lado do checkbox.

## Resultado

Os utilizadores poderao configurar reply-to, tags, GA tracking, anexos, cabecalho/rodape personalizado e pagina de cancelamento -- e tudo sera efectivamente aplicado ao enviar a campanha via Brevo.
