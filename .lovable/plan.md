

## Ajustes ao Quadro de Comissões

### Resumo das alterações pedidas:
1. **Novo totalizador global de Serviços (kWp)** — soma total de kWp de todos os serviços (Solar, Baterias, Carregadores, Condensadores)
2. **Separar colunas EE e Serviços** na tabela de detalhe expandida
3. **Na coluna "Consumo" para serviços, mostrar kWp** em vez de kWh
4. **Remover colunas Margem e Comissão Indicativa** da tabela de detalhe
5. **Na coluna Serviços, mostrar os nomes dos produtos** (Solar, Bateria, Carregadores, Condensadores)

### Ficheiros a alterar

#### 1. `src/hooks/useLiveCommissions.ts`
- Buscar `servicos_details` e `servicos_produtos` das propostas (já busca `servicos_produtos`, falta `servicos_details`)
- Adicionar ao `CpeDetail`: campo `servicos_kwp` (soma de kWp dos serviços da proposta)
- Adicionar ao `CommercialEntry`: `totalServicosKwp`
- Adicionar ao `LiveCommissionsData`: `globalServicosKwp` (totalizador global)
- Calcular kWp total por proposta somando `servicos_details[produto].kwp` para cada produto

#### 2. `src/components/finance/CommissionsTab.tsx`
- **Novo card totalizador** ao lado do existente: "Totalizador Serviços" com total kWp
- **Tabela principal**: manter colunas Comercial, MWh Total, Patamar, Comissão (sem mudanças)
- **Tabela de detalhe expandida**:
  - Remover colunas "Margem (€)" e "Comissão Indicativa"
  - Renomear "Consumo (kWh)" para "EE (kWh)" — mostrar consumo energia
  - Adicionar coluna "Serviços (kWp)" — mostrar kWp total dos serviços
  - Coluna "Serviços" mantém-se com badges dos produtos (Solar, Baterias, etc.)
  - Colunas finais: Venda | Tipo | CPE/CUI | EE (kWh) | Serviços (kWp) | Comissão Final | Serviços

### Origem dos dados kWp
O campo `proposals.servicos_details` é um JSONB com estrutura `{ "Solar": { kwp: 10, valor: 5000 }, "Baterias": { kwp: 5 } }`. Soma-se todos os `kwp` dos produtos para obter o total de serviços por CPE/venda.

