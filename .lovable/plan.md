
# Validacao na Criacao de Propostas "Outros Servicos"

## Resumo
Adicionar validacao ao formulario de criacao de propostas do tipo "Outros Servicos" (telecom), impedindo a submissao sem os dados obrigatorios preenchidos.

## Regras de Validacao

Para propostas do tipo **servicos** (telecom):
1. **Pelo menos 1 produto** deve estar selecionado (checkbox ativo)
2. **Modelo de Servico** deve ter um dos dois selecionados (Transacional ou SAAS) -- ja esta pre-selecionado por defeito como "transacional", por isso esta regra ja e cumprida
3. **kWp total** deve ser maior que 0 (ou seja, pelo menos um produto com kWp preenchido)
4. **Comissao** deve estar preenchida (maior que 0)

## O que muda

### `src/components/proposals/CreateProposalModal.tsx`

1. **Adicionar um `useMemo` de validacao** que calcula se o formulario esta valido:
   - Se `proposalType === 'servicos'`: verificar que `servicosProdutos.length > 0`, `totalKwp > 0`, e `comissaoServicos` preenchido
   - Se `proposalType === 'energia'`: manter logica atual (sem alteracao)

2. **Desabilitar o botao "Criar Proposta"** quando a validacao falha (`disabled={!isValid || isPending}`)

3. **Mostrar mensagens de erro inline** junto aos campos em falta (texto vermelho discreto), apenas apos a primeira tentativa de submissao (usando um estado `attempted`)

## Detalhes Tecnicos

```
isServicosValid = 
  servicosProdutos.length > 0 
  && totalKwp > 0 
  && parseFloat(comissaoServicos) > 0

isFormValid = 
  isTelecom && proposalType === 'servicos' 
    ? isServicosValid 
    : true  // energia e non-telecom mantêm logica atual
```

O botao fica desabilitado e com estilo visual (opacity) quando invalido. Ao clicar com dados em falta, mostra as mensagens de erro nos campos relevantes.

## Ficheiros alterados
- `src/components/proposals/CreateProposalModal.tsx`
