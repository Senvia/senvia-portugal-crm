

# Tornar Campos Obrigatorios nas Propostas Telecom

## Resumo

Reforcar a validacao dos formularios de propostas telecom para garantir que todos os campos relevantes sao preenchidos antes de submeter.

## 1. CPE/CUI (Energia) -- Tudo Obrigatorio

Atualmente, ao adicionar um CPE a proposta, apenas se valida que existe pelo menos 1 CPE. Os campos individuais (Consumo Anual, Duracao, DBL, Comissao, Inicio/Fim Contrato) nao sao obrigatorios.

**Alteracoes:**

### Ficheiro: `src/components/proposals/ProposalCpeSelector.tsx`

- **Formulario de adicao (antes de clicar "Adicionar a Proposta")**: O botao "Adicionar a Proposta" so fica ativo quando TODOS os campos estao preenchidos:
  - Comercializador
  - Consumo Anual
  - Duracao (anos)
  - DBL
  - Comissao
  - Inicio Contrato
  - Fim Contrato
- Atualizar `canAddExisting` de `selectedExistingCpe !== null` para incluir validacao de todos os campos
- Adicionar asterisco (*) visual nos labels de todos os campos

### Ficheiro: `src/components/proposals/CreateProposalModal.tsx`

- Atualizar `isEnergiaValid` para verificar que cada CPE adicionado tem todos os campos preenchidos (consumo_anual, duracao_contrato, dbl, comissao, contrato_inicio, contrato_fim)
- Se algum CPE tiver campos vazios, mostrar mensagem de erro

## 2. Outros Servicos -- Campos da Linha Selecionada Obrigatorios

Atualmente, basta selecionar um produto e que kWp total e comissao total sejam > 0. Os campos individuais de cada produto selecionado nao sao validados.

**Alteracoes:**

### Ficheiro: `src/components/proposals/CreateProposalModal.tsx`

- Atualizar `isServicosValid` para verificar que, para cada produto selecionado (checkbox ativo), TODOS os campos configurados (`config.fields`) estao preenchidos com valor > 0
- Adicionar asterisco (*) nos labels dos campos de cada produto ativo
- Mostrar mensagem de erro por campo vazio quando `attempted` e verdadeiro

## Secao Tecnica

### Validacao CPE (`ProposalCpeSelector.tsx`)

```
canAddExisting = selectedExistingCpe 
  && updateConsumoAnual 
  && updateDuracaoContrato 
  && updateDbl 
  && updateComissao 
  && updateContratoInicio 
  && updateContratoFim
  && (updateComercializador && updateComercializador !== '' 
      || (updateComercializador === 'other' && updateCustomComercializador))
```

Para CPEs ja adicionados, validacao no `isEnergiaValid`:
```
isEnergiaValid = proposalCpes.length > 0 
  && proposalCpes.every(cpe => 
    cpe.consumo_anual && cpe.duracao_contrato && cpe.dbl 
    && cpe.comissao && cpe.contrato_inicio && cpe.contrato_fim
  )
```

### Validacao Servicos (`CreateProposalModal.tsx`)

```
isServicosValid = servicosProdutos.length > 0 
  && servicosProdutos.every(produto => {
    const config = SERVICOS_PRODUCT_CONFIGS.find(c => c.name === produto);
    const detail = servicosDetails[produto] || {};
    return config?.fields.every(field => 
      detail[field] !== undefined && detail[field] > 0
    );
  })
```

### Ficheiros a alterar

- `src/components/proposals/ProposalCpeSelector.tsx` -- validacao do formulario de adicao + asteriscos
- `src/components/proposals/CreateProposalModal.tsx` -- validacao reforçada em `isEnergiaValid` e `isServicosValid` + asteriscos + mensagens de erro

