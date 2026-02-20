

## Converter AddLeadModal para Pagina Full Screen

### Objetivo

Transformar o modal de adicionar lead de um dialogo pequeno (`max-w-md`) para pagina full screen, usando o mesmo padrao ja implementado no sistema (CreateSaleModal, CreateProposalModal, CreateClientModal, etc.).

### Alteracao

**Ficheiro:** `src/components/leads/AddLeadModal.tsx`

**1. Usar variant fullScreen no DialogContent**

O componente Dialog ja suporta `variant="fullScreen"`. Basta trocar:
- De: `<DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">`
- Para: `<DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0">`

**2. Reestruturar o layout seguindo o padrao do projeto**

- Header fixo com borda inferior (`px-6 pr-14 py-4 border-b border-border/50 shrink-0`)
- Conteudo scrollavel (`flex-1 overflow-y-auto`)
- Container centrado com largura maxima (`max-w-6xl mx-auto p-4 sm:p-6`)
- Grid de 2 colunas em desktop (`grid grid-cols-1 lg:grid-cols-5 gap-6`)

**3. Coluna Esquerda (3/5 = 60%) - Formulario Principal**

Organizado em Cards tematicos:
- Card "Empresa": NIF + Nome da Empresa (com banner de cliente existente)
- Card "Contacto": Nome, Email, Telefone
- Card "Detalhes": Origem, Temperatura, Tipologia (telecom), Valor/Consumo, Atribuicao
- Card "Observacoes": Notas + Anexos (telecom)

**4. Coluna Direita (2/5 = 40%, sticky) - Resumo e Acoes**

- Card com resumo dos dados preenchidos ate ao momento (nome, email, telefone, origem, temperatura, valor)
- Checkboxes RGPD e Automacao
- Botoes Cancelar / Criar Lead

**5. Manter toda a logica existente**

- Schema Zod inalterado
- Pesquisa NIF com auto-preenchimento
- Campos condicionais (telecom)
- Upload de ficheiros (telecom)
- Atribuicao de equipa (admins)

### Resultado

- Experiencia consistente com o resto do sistema (Vendas, Propostas, Clientes)
- Desktop: formulario organizado em 2 colunas com resumo sticky
- Mobile: tela cheia com scroll natural
- Sem impacto na logica de negocio

