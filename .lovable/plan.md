

## Corrigir navegação do widget de CPE/CUI para abrir o cliente correto

### Problema

Ao clicar num alerta de CPE/CUI a expirar no painel (dashboard), o sistema navega para `/clients?highlight=<client_id>`, mas a página de Clientes não lê esse parâmetro. Resultado: a página aparece sem nenhum cliente aberto.

### Solução

1. **Na página `Clients.tsx`**: Ler o query param `highlight` da URL e, quando presente, abrir automaticamente o drawer de detalhes do cliente correspondente.

2. **No widget `FidelizationAlertsWidget.tsx`**: Melhorar a navegação para usar um parâmetro mais claro (ex: `?openClient=<client_id>`).

### Detalhes técnicos

**Ficheiro: `src/pages/Clients.tsx`**

- Importar `useSearchParams` do React Router
- Adicionar um `useEffect` que:
  1. Lê o parâmetro `highlight` (ou `openClient`) da URL
  2. Procura o cliente correspondente na lista de `clients`
  3. Se encontrado, chama `handleView(client)` para abrir o drawer de detalhes (que já mostra a secção de CPE/CUI)
  4. Limpa o parâmetro da URL para não re-abrir em navegações futuras

```text
URL: /clients?highlight=fd837074-...
         |
         v
  useEffect detecta param
         |
         v
  Encontra cliente na lista
         |
         v
  Abre ClientDetailsDrawer
  (já mostra a secção CPE/CUI)
         |
         v
  Limpa param da URL
```

**Ficheiro: `src/components/dashboard/FidelizationAlertsWidget.tsx`**

- Sem alterações necessárias (o `navigate(/clients?highlight=...)` já está correto, só faltava o receptor na página de Clientes)

### Resultado esperado

Ao clicar num CPE a expirar no painel, o utilizador é redirecionado para a página de Clientes e o drawer de detalhes do cliente abre automaticamente, mostrando os CPE/CUI desse cliente.

