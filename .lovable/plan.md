

## Correção: Aplicar Alterações Apenas ao Template Telecom

### Situação Atual

Atualmente:
- **CreateProposalModal**: Tem a verificação `isTelecom` (linha 47)
- **EditProposalModal**: NÃO tem verificação - mostra campos telecom para todos
- **ProposalDetailsModal**: NÃO tem verificação - mostra campos telecom para todos

### O Que Precisa de Mudar

Adicionar a mesma lógica condicional `isTelecom = organization?.niche === 'telecom'` aos componentes em falta e condicionar a renderização dos elementos específicos.

---

### Alterações no EditProposalModal.tsx

1. Importar `useAuth` do contexto
2. Obter `organization` e verificar `isTelecom`
3. Condicionar os seguintes elementos:
   - Secção "Tipo de Negociação" (linhas 268-285)
   - Secção "Tipo de Proposta" (linhas 287-310)
   - CPE Selector para energia (linhas 312-322)
   - Campos específicos de Serviços (linhas 324+)

Para organizações **não-telecom**, o EditProposalModal deve continuar a funcionar como antes das alterações (possivelmente com a lista de produtos com valores).

---

### Alterações no ProposalDetailsModal.tsx

1. O componente já importa `useOrganization`, basta verificar `orgData?.niche === 'telecom'`
2. Condicionar a exibição de:
   - Tipo de Negociação
   - Dados por CPE (consumo, duração, DBL, margem, etc.)
   - Produtos de serviços (checkboxes)

Para organizações **não-telecom**, mostrar a visualização anterior (produtos com valores, campos legados).

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/EditProposalModal.tsx` | Adicionar `useAuth`, verificar `isTelecom`, condicionar UI |
| `src/components/proposals/ProposalDetailsModal.tsx` | Verificar `orgData?.niche`, condicionar UI |

---

### Lógica Esperada

```typescript
// EditProposalModal.tsx
const { organization } = useAuth();
const isTelecom = organization?.niche === 'telecom';

// Render condicional
{isTelecom && (
  <div className="space-y-3">
    <Label>Tipo de Negociação</Label>
    {/* ... */}
  </div>
)}

// ProposalDetailsModal.tsx  
const isTelecom = orgData?.niche === 'telecom';

// Render condicional
{isTelecom && proposal.negotiation_type && (
  <div>Tipo: {NEGOTIATION_TYPE_LABELS[proposal.negotiation_type]}</div>
)}
```

---

### Comportamento por Nicho

| Nicho | Tipo Negociação | Energia/Serviços | CPE com Dados | Produtos c/Valores |
|-------|-----------------|------------------|---------------|---------------------|
| `telecom` | Visível | Visível | Visível | Não |
| `generic` | Oculto | Oculto | Oculto | Sim (original) |
| `clinic` | Oculto | Oculto | Oculto | Sim (original) |
| `construction` | Oculto | Oculto | Oculto | Sim (original) |
| `real_estate` | Oculto | Oculto | Oculto | Sim (original) |
| `ecommerce` | Oculto | Oculto | Oculto | Sim (original) |

