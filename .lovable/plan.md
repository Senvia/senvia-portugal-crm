

# Redesign dos Modais de Clientes para Full-Page

## Situacao actual

Existem 3 componentes de detalhe/edicao de clientes:

1. **CreateClientModal** -- Dialog pequeno (`max-w-lg`) com formulario simples
2. **EditClientModal** -- Dialog pequeno (`max-w-lg`) identico ao Create com dados pre-preenchidos
3. **ClientDetailsDrawer** -- Sheet lateral (`sm:max-w-xl`) com tabs (Resumo, CPEs, Notas, Historico, Propostas, Vendas)

Ha tambem um **ClientDetailsModal** (Dialog simples) que parece nao estar em uso na pagina principal -- o fluxo actual usa o Drawer.

## Objectivo

Converter os 3 componentes para layout full-page (identico ao padrao dos modais de Vendas e Propostas), com grid de 2 colunas em desktop (60/40) e coluna direita sticky.

## Alteracoes por componente

### 1. CreateClientModal

**De**: `DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"`
**Para**: `DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0"`

Layout:
- **Coluna esquerda** (lg:col-span-3):
  - Card "Informacoes Basicas" (Nome, Email, Telefone, Empresa, NIF)
  - Card "Morada" (campos de endereco, se visivel nas settings)
  - Card "Notas"
- **Coluna direita** (lg:col-span-2, sticky):
  - Card "Classificacao" (Tipologia/Status, Origem, Vendedor Responsavel)
  - Botao "Criar Cliente"

### 2. EditClientModal

**De**: `DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"`
**Para**: `DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0"`

Layout identico ao Create com dados pre-preenchidos e botao "Guardar Alteracoes".

### 3. ClientDetailsDrawer -> ClientDetailsModal (full-page)

**De**: `Sheet` / `SheetContent` lateral
**Para**: `Dialog` / `DialogContent variant="fullScreen"`

Este e o mais complexo. O conteudo actual das tabs sera redistribuido:

- **Header**: Nome do cliente + Codigo + Badge de status + botao Editar
- **Coluna esquerda** (lg:col-span-3):
  - Card "Dados do Cliente" (codigo, tipologia/status, origem, data de criacao)
  - Card "Contacto" (email, telefone, WhatsApp)
  - Card "Empresa" (empresa, NIF) -- se existir
  - Card "Morada" -- se existir
  - Card "CPEs" (apenas telecom)
  - Card "Notas" (editavel inline)
  - Card "Historico/Timeline" (com botao "Registar Contacto")
- **Coluna direita** (lg:col-span-2, sticky):
  - Card "Metricas" (Propostas, Vendas, Valor Total)
  - Card "Accoes rapidas" (Ligar, WhatsApp, Email, Nova Proposta, Nova Venda, Agendar)
  - Card "Vendedor Responsavel"
  - Lista resumida de Propostas e Vendas recentes

As tabs serao eliminadas -- todo o conteudo ficara acessivel por scroll na coluna esquerda, com a coluna direita sticky a mostrar metricas e accoes.

## Estrutura HTML comum

```text
DialogContent variant="fullScreen"
  +-- DialogHeader (border-b, px-6, py-4)
  +-- div.flex-1.overflow-y-auto
       +-- div.max-w-6xl.mx-auto.p-4.sm:p-6
            +-- div.grid.grid-cols-1.lg:grid-cols-5.gap-6
                 +-- div.lg:col-span-3.space-y-4  (conteudo principal)
                 +-- div.lg:col-span-2            (resumo sticky)
                      +-- div.lg:sticky.lg:top-0.space-y-4
```

## Ajuste na pagina Clients.tsx

- Substituir `ClientDetailsDrawer` por `ClientDetailsModal` full-page (ou renomear o componente)
- Manter as mesmas props (`client`, `open`, `onOpenChange`, `onEdit`, `onNewProposal`, `onNewSale`, `onScheduleMeeting`)

## Mobile

Em mobile as colunas empilham naturalmente. As accoes rapidas e metricas ficam abaixo do conteudo principal.

## Ficheiros alterados
- `src/components/clients/CreateClientModal.tsx`
- `src/components/clients/EditClientModal.tsx`
- `src/components/clients/ClientDetailsDrawer.tsx` (redesign completo para full-page Dialog)
- `src/pages/Clients.tsx` (ajustar import se necessario)

## Nota
Toda a logica de negocio, hooks e callbacks permanecem inalterados. Apenas o layout JSX e reestruturado.

