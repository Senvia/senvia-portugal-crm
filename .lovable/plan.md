

## Correção: CreateProposalModal - Campos Telecom Apenas para Telecom

### Problema Identificado

No ficheiro `CreateProposalModal.tsx`, a variável `isTelecom` existe (linha 47) mas **apenas condiciona o "Tipo de Negociação"** (linhas 243-261).

Os seguintes elementos estão visíveis para **TODOS os nichos** quando deveriam ser exclusivos de telecom:

| Elemento | Linhas | Estado Atual |
|----------|--------|--------------|
| Tipo de Proposta (Energia/Serviços) | 265-288 | Visível para todos |
| CPE Selector | 290-300 | Visível para todos |
| Campos Serviços | 302-359 | Visível para todos |
| Resumo CPEs | 374-389 | Visível para todos |

### Solução

Adicionar a condição `isTelecom &&` a todos os blocos de renderização específicos de telecom.

---

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/CreateProposalModal.tsx` | Condicionar Tipo de Proposta, CPE Selector, Serviços e Resumo a `isTelecom` |

---

### Alterações Específicas

**1. Tipo de Proposta (linhas 263-288)**

Antes:
```tsx
<Separator />

{/* Tipo de Proposta */}
<div className="space-y-3">
```

Depois:
```tsx
{isTelecom && (
  <>
    <Separator />
    <div className="space-y-3">
      <Label>Tipo de Proposta</Label>
      ...
    </div>
  </>
)}
```

---

**2. CPE Selector (linhas 290-300)**

Antes:
```tsx
{proposalType === 'energia' && (
```

Depois:
```tsx
{isTelecom && proposalType === 'energia' && (
```

---

**3. Campos Serviços (linhas 302-359)**

Antes:
```tsx
{proposalType === 'servicos' && (
```

Depois:
```tsx
{isTelecom && proposalType === 'servicos' && (
```

---

**4. Resumo CPEs (linhas 374-389)**

Antes:
```tsx
{proposalType === 'energia' && proposalCpes.length > 0 && (
```

Depois:
```tsx
{isTelecom && proposalType === 'energia' && proposalCpes.length > 0 && (
```

---

### Comportamento por Nicho Após Correção

| Nicho | Tipo Negociação | Tipo Proposta | CPE Selector | Campos Serviços |
|-------|-----------------|---------------|--------------|-----------------|
| `telecom` | Visível | Visível | Visível | Visível |
| `generic` | Oculto | Oculto | Oculto | Oculto |
| `clinic` | Oculto | Oculto | Oculto | Oculto |
| `construction` | Oculto | Oculto | Oculto | Oculto |
| `real_estate` | Oculto | Oculto | Oculto | Oculto |
| `ecommerce` | Oculto | Oculto | Oculto | Oculto |

Para nichos não-telecom, a criação de propostas ficará simplificada: apenas cliente, data, estado e notas.

