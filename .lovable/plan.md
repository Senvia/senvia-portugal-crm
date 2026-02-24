

## Persistir alertas de CPE/CUI ate acao ser tomada

### Problema atual

Os alertas de CPE/CUI a expirar desaparecem automaticamente quando a data de fim de fidelizacao passa. Isto significa que CPEs expirados "somem" sem que ninguem tenha tomado uma acao.

### Solucao

Os CPEs devem permanecer na listagem de alertas ate que uma **renovacao** ou **alteracao de comercializador** seja efetuada. Adicionalmente, alterar o comercializador obriga a atualizar a data de fim de fidelizacao.

### Alteracoes

**1. Base de dados -- nova coluna `renewal_status` na tabela `cpes`**

Adicionar uma coluna `renewal_status` com valores possiveis: `null` (sem alerta pendente), `pending` (alerta ativo/por resolver), `renewed` (renovado), `switched` (comercializador alterado).

```sql
ALTER TABLE cpes ADD COLUMN renewal_status text DEFAULT null;
```

Tambem criar um trigger que automaticamente marca `renewal_status = 'pending'` quando `fidelizacao_end` esta dentro de 30 dias ou ja passou, para CPEs ativos sem acao tomada.

**2. Hook `useFidelizationAlerts` -- alterar a query**

- Remover o filtro `gte(fidelizacao_end, hoje)` para que CPEs ja expirados tambem aparecam
- Incluir CPEs com `fidelizacao_end <= hoje + 30 dias` **E** que nao tenham `renewal_status` em `renewed` ou `switched`
- Adicionar uma terceira categoria: **Expirados** (dias negativos), alem de Urgente e Proximos

**3. Widget `FidelizationAlertsWidget` -- nova secao "Expirados"**

- Adicionar secao vermelha para CPEs ja expirados (dias negativos) com icone de alerta
- Adicionar botoes de acao rapida em cada cartao: "Renovar" e "Alterar Comercializador"
- Ao clicar "Renovar": abre modal para atualizar a nova `fidelizacao_end` e marca `renewal_status = 'renewed'`
- Ao clicar "Alterar Comercializador": abre modal para selecionar novo comercializador E obrigatoriamente nova `fidelizacao_end`

**4. `EditCpeModal` -- validacao no comercializador**

- Detetar quando o comercializador e alterado (diferente do original)
- Se alterado, tornar o campo "Fim Fidelizacao" **obrigatorio** e mostrar aviso
- Ao guardar com comercializador diferente, marcar `renewal_status = 'switched'`

**5. Nova acao "Renovar CPE" (inline ou modal pequeno)**

- Modal simples com campo de nova data fim fidelizacao
- Ao confirmar, atualiza `fidelizacao_end` com data futura e marca `renewal_status = 'renewed'`
- Reset dos flags `alert_30d_sent` e `alert_7d_sent`

### Secao tecnica

**Ficheiros afetados:**

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | Adicionar coluna `renewal_status` a tabela `cpes` |
| `src/hooks/useFidelizationAlerts.ts` | Alterar query para incluir expirados, filtrar por `renewal_status` |
| `src/components/dashboard/FidelizationAlertsWidget.tsx` | Adicionar secao "Expirados", botoes de acao "Renovar" / "Alterar Comercializador" |
| `src/components/clients/EditCpeModal.tsx` | Validacao: alterar comercializador obriga a preencher fim fidelizacao |
| `src/hooks/useCpes.ts` | Adicionar mutacao `useRenewCpe` e `useSwitchCpeComercializador` |
| `src/types/cpes.ts` | Adicionar tipo `RenewalStatus` e constantes de labels/estilos |
| Novo: `src/components/clients/RenewCpeModal.tsx` | Modal simples para renovar com nova data |
| Novo: `src/components/clients/SwitchComercializadorModal.tsx` | Modal para alterar comercializador + nova data obrigatoria |

**Fluxo de dados:**

```text
CPE com fidelizacao_end proximo/expirado
         |
         v
  renewal_status = null ou 'pending'
         |
    Aparece no widget
         |
   +-----+------+
   |             |
Renovar    Alterar Comercializador
   |             |
   v             v
renewal_status   renewal_status
= 'renewed'     = 'switched'
   |             |
   v             v
  Desaparece do widget
```
