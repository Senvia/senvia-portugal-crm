

# Atualizar Plano para Elite - Perfect2Gether e Senvia

## Objetivo
Atualizar o plano das organizações Perfect2Gether e Senvia Agency para "elite".

## Organizações identificadas
| Nome | ID | Plano Atual |
|------|-----|-------------|
| Senvia Agency | 06fe9e1d-9670-45b0-8717-c5a6e90be380 | starter |
| Perfect2Gether | 96a3950e-31be-4c6d-abed-b82968c0d7e9 | starter |

## Problema encontrado
A tabela `subscription_plans` ainda nao existe na base de dados. A migracao anterior pode nao ter sido aplicada com sucesso. Precisamos:

1. **Garantir que a tabela `subscription_plans` existe** - Re-executar a migracao de criacao da tabela com os 3 planos (Starter, Pro, Elite)
2. **Atualizar as 2 organizacoes** - SET plan = 'elite' para ambas

## Alteracoes

### 1. Migracao SQL
- Criar tabela `subscription_plans` (se nao existir) com os 3 planos e respetivas feature flags
- Atualizar `organizations.plan` para 'elite' nas duas empresas indicadas

### Ficheiros
Nenhum ficheiro de codigo precisa de ser alterado - apenas operacoes de base de dados.
