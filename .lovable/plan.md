

# Editar Contactos na Lista + Preparar para WhatsApp

## Problema Actual
- O modal de detalhes da lista so permite adicionar e remover contactos -- nao ha forma de editar os dados de um contacto (nome, email, telefone)
- Nao ha forma de editar o nome/descricao da propria lista (o hook `useUpdateContactList` existe mas nunca e usado)
- Nao ha campo de WhatsApp nos contactos

## Solucao

### 1. Editar nome e descricao da lista

No `ListDetailsModal`, tornar o nome e descricao editaveis:
- Adicionar um botao de edicao (icone Pencil) no header ao lado do nome da lista
- Ao clicar, os campos tornam-se editaveis inline (Input para nome, Textarea para descricao)
- Botao "Guardar" chama o hook `useUpdateContactList` que ja existe

### 2. Editar dados de um contacto da lista

Cada contacto no card da lista passa a ter um botao de edicao (alem do botao de remover):
- Ao clicar no Pencil, abre um pequeno formulario inline ou um mini-dialog com os campos: Nome, Email, Telefone
- Usa o hook existente de clientes (o contacto e um `crm_client`, portanto usa-se o update de clientes)
- Guardar chama a mutacao de update do cliente e invalida as queries

### 3. Preparar campo WhatsApp (futuro)

Adicionar coluna `whatsapp` na tabela `crm_clients`:
- Nova coluna `whatsapp TEXT` (nullable) na tabela `crm_clients`
- Mostrar o campo WhatsApp nos cards dos membros da lista (quando preenchido)
- Incluir campo WhatsApp no formulario de edicao do contacto
- Preparar a infraestrutura para futuras funcionalidades de envio via WhatsApp

## Alteracoes

### Migracao SQL
```
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS whatsapp TEXT;
```

### Ficheiro: `src/components/marketing/ListDetailsModal.tsx`

1. Importar `useUpdateContactList` e o hook de update de clientes
2. Adicionar estado de edicao da lista (`editingList`) com campos nome/descricao editaveis no header
3. Adicionar estado de edicao de contacto (`editingMemberId`) -- ao clicar no Pencil de um contacto, os campos tornam-se editaveis inline (nome, email, telefone, whatsapp)
4. Mostrar campo WhatsApp nos cards (quando preenchido, com icone verde do WhatsApp)
5. Botoes de acao por contacto: Pencil (editar) + UserMinus (remover)

### Ficheiro: `src/hooks/useClients.ts` (verificar)
- Confirmar que o hook de update de clientes suporta os campos necessarios (incluindo whatsapp)

### Ficheiros a editar

| Ficheiro | Acao |
|----------|------|
| Migracao SQL | Adicionar coluna `whatsapp` a `crm_clients` |
| `src/components/marketing/ListDetailsModal.tsx` | Adicionar edicao de lista + edicao de contacto + campo WhatsApp |
| `src/hooks/useClients.ts` | Verificar/ajustar se necessario para incluir campo whatsapp |

### Detalhes tecnicos

- A edicao de contacto usa o update de `crm_clients` (o membro da lista e uma referencia a um cliente existente)
- Campo WhatsApp: string livre com placeholder "+351 9XX XXX XXX"
- O `useUpdateContactList` ja existe no `useContactLists.ts` -- so precisa ser importado e usado
- Apos edicao, invalidar queries `contact-list-members` e `clients` para refrescar os dados
- Layout mobile-first: formulario de edicao inline dentro do card do contacto
