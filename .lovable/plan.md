
# Mostrar Contribuinte da Empresa na Tabela de Clientes

## Problema
A coluna "Empresa" na tabela de clientes mostra apenas o nome da empresa, mas nao mostra o contribuinte (company_nif), mesmo quando este esta preenchido.

## Solucao
Adicionar o `company_nif` abaixo do nome da empresa na coluna "Empresa", seguindo o mesmo padrao visual ja usado para o NIF pessoal (que aparece abaixo do nome do cliente).

## Ficheiro alterado
- `src/components/clients/ClientsTable.tsx`

## Detalhe tecnico
Na coluna "Empresa", adicionar uma linha condicional que mostra o contribuinte quando existe:

```
Empresa
  DNR Ida
  NIF: 123456789   <-- novo
```

Segue o mesmo padrao da coluna "Cliente" que ja mostra:
```
Cliente
  Dnr
  NIF: 999999999
```
