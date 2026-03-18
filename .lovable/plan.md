

## Excluir todos os dados de teste

### Dados a apagar (org `96a3950e-31be-4c6d-abed-b82968c0d7e9`)

**1. Proposal CPEs** (8 registos nos proposals 0031–0035):
- CPE `PT0002000104989706QE` (comissao 0.21 — valor errado)
- CPE `PT0002000111166209NJ` (414.52)
- CPE `PT0002000100723735BE` (25.89)
- CPE `PT0002000104382618WL` (14.04)
- CPE `PT0002000102974369TZ` (95.31)
- CPE `PT1601000000461219MK` (368.91)
- CPE `PT1605000000001772QM` (2590.19)
- CPE `PT1605000008089920GL` (609.26)

**2. Vendas** 0021–0025 (5 registos)

**3. Propostas** 0031–0035 (5 registos)

**4. Proposal CPEs antigos** (5 CPEs nos proposals 0020–0024 com serial numbers falsos como `Ptdthvcf2356`, `ptjujhnihuoh`, etc.)

**5. Clientes teste** — os 5 clientes cujos nomes foram alterados para o ficheiro EDP:
- `fd837074` SONIA LAVOURA (code 0004)
- `c5f3faf9` ACEDE (code 0003)  
- `71cb6806` PRIMAVERA BSS (code 0002)
- `f2555227` ACUSTIKASSUNTO (code 0001)
- `e2a03e1e` CASA DE REPOUSO (code 0005)

### Execução
Usar o insert tool (DELETE statements) na seguinte ordem para respeitar foreign keys:
1. DELETE proposal_cpes dos proposals 0031–0035
2. DELETE proposal_cpes dos proposals 0020–0024
3. DELETE sales 0021–0025
4. DELETE proposals 0031–0035
5. DELETE os 5 clientes teste (se não tiverem outras vendas/propostas reais associadas — verificar antes)

Nenhum ficheiro de código será alterado.

