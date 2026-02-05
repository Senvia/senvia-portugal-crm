

## Reorganizar Interface do Módulo Financeiro

### Conceito

Tornar a navegação mais intuitiva transformando os cards de métricas em elementos clicáveis e adicionar tabs de navegação no topo da página.

---

### Alterações a Implementar

| Elemento Atual | Nova Comportamento |
|----------------|-------------------|
| Card "Recebido" | Clicável - navega para `/financeiro/pagamentos` |
| Card "Despesas" | Clicável - navega para `/financeiro/despesas` |
| 3 Cards no fundo (Quick Links) | Remover completamente |
| Card "Faturas" (era quick link) | Passa a ser uma Tab no topo da página |

---

### Nova Interface

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  💰 FINANCEIRO                                                             │
├────────────────────────────────────────────────────────────────────────────┤
│  [Resumo] [Faturas]                               ← NOVA NAVEGAÇÃO TABS    │
├────────────────────────────────────────────────────────────────────────────┤
│  Período: [📅 01/01/2026 - 31/01/2026 ▼]                                   │
│                                                                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│  │ Faturado  │ │ Recebido  │ │ Pendente  │ │ Despesas  │ │ Balanço   │    │
│  │ €15.000   │ │ €8.500 →  │ │ €6.500    │ │ €3.200 →  │ │ €5.300    │    │
│  │           │ │ clicável  │ │           │ │ clicável  │ │           │    │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
│                    ↓                            ↓                          │
│           /financeiro/pagamentos       /financeiro/despesas                │
│                                                                            │
│  [📊 Gráfico Fluxo de Caixa]                                               │
│                                                                            │
│  [📅 Próximos Recebimentos]                                                │
│                                                                            │
│  (SEM CARDS DE QUICK LINKS NO FUNDO)                                       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Cards Clicáveis

Os cards "Recebido" e "Despesas" terão:
- Cursor pointer ao passar o rato
- Efeito hover sutil (bg-muted/50)
- Indicador visual de que são clicáveis (seta pequena ou transição)

```text
┌─────────────────────────────┐
│  Recebido              ↗    │  ← Indicador de navegação
│  €8.500                     │
│  Este mês                   │
└─────────────────────────────┘
```

---

### Sistema de Tabs

Adicionar tabs no header da página para alternar entre:

| Tab | Conteúdo |
|-----|----------|
| Resumo | Dashboard atual (métricas, gráfico, próximos recebimentos) |
| Faturas | Tabela de faturas (atual página `/financeiro/faturas`) |

A tab "Faturas" embebe o conteúdo da página Invoices diretamente na página Finance, sem navegação para URL diferente.

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Finance.tsx` | Adicionar tabs, tornar cards clicáveis, remover quick links |

---

### Implementação Técnica

#### 1. Adicionar Tabs no Topo

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// No componente
<Tabs defaultValue="resumo" className="space-y-6">
  <TabsList>
    <TabsTrigger value="resumo">Resumo</TabsTrigger>
    <TabsTrigger value="faturas">Faturas</TabsTrigger>
  </TabsList>
  
  <TabsContent value="resumo">
    {/* Dashboard atual */}
  </TabsContent>
  
  <TabsContent value="faturas">
    {/* Conteúdo de faturas inline */}
  </TabsContent>
</Tabs>
```

#### 2. Cards Clicáveis

```typescript
// Card Recebido - agora clicável
<Card 
  className="cursor-pointer hover:bg-muted/50 transition-colors group"
  onClick={() => navigate('/financeiro/pagamentos')}
>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Recebido</CardTitle>
    <TrendingUp className="h-4 w-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
  </CardHeader>
  ...
</Card>

// Card Despesas - agora clicável
<Card 
  className="cursor-pointer hover:bg-muted/50 transition-colors group"
  onClick={() => navigate('/financeiro/despesas')}
>
  ...
</Card>
```

#### 3. Remover Quick Links

Remover completamente a secção de 3 cards no fundo da página (linhas 303-349).

#### 4. Inline Faturas Tab

Mover a lógica da página `Invoices.tsx` para dentro da tab "Faturas", ou criar um componente reutilizável `InvoicesContent` que pode ser usado tanto na tab como numa página separada (se necessário manter a rota).

---

### Layout Mobile

```text
┌────────────────────────────────────────┐
│  💰 FINANCEIRO                         │
├────────────────────────────────────────┤
│  [Resumo] [Faturas]     ← Tabs         │
├────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐         │
│  │ Faturado   │ │ Recebido → │ ← Clica │
│  │ €15.000    │ │ €8.500     │         │
│  └────────────┘ └────────────┘         │
│  ┌────────────┐ ┌────────────┐         │
│  │ Pendente   │ │ Despesas → │ ← Clica │
│  │ €6.500     │ │ €3.200     │         │
│  └────────────┘ └────────────┘         │
│  ...                                   │
└────────────────────────────────────────┘
```

---

### Resumo de Alterações

| Tipo | Descrição |
|------|-----------|
| Adicionar | Tabs (Resumo / Faturas) no header |
| Adicionar | onClick e estilos hover nos cards Recebido e Despesas |
| Remover | 3 cards de Quick Links no fundo |
| Mover | Conteúdo de Faturas para dentro da tab |

**Total: 1 ficheiro modificado**

