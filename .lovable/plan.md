

## Dividir Tabs das Configurações em Duas Linhas

### Problema Atual

A página de configurações tem 10 tabs numa única linha horizontal, causando overflow ou compressão excessiva em ecrãs menores.

### Solução

Dividir as tabs em duas linhas, mantendo o mesmo sistema de tabs mas com dois `TabsList` separados.

---

### Nova Estrutura Visual

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  DEFINIÇÕES                                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ [Geral] [Equipa] [Pipeline] [Módulos] [Formulário] [Produtos] [Campos] │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ [Alertas] [Despesas] [Integrações]                                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Conteúdo da Tab Selecionada]                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Divisão das Tabs

| Linha | Tabs (7) |
|-------|----------|
| **Primeira** | Geral, Equipa, Pipeline, Módulos, Formulário, Produtos, Campos |
| **Segunda** | Alertas, Despesas, Integrações |

---

### Implementação Técnica

Modificar a secção desktop (linhas 325-385) para usar dois `TabsList` dentro do mesmo componente `Tabs`:

```tsx
<Tabs defaultValue="general" className="space-y-6">
  {/* Primeira linha de tabs */}
  <div className="space-y-2">
    <TabsList>
      <TabsTrigger value="general">Geral</TabsTrigger>
      <TabsTrigger value="team">Equipa</TabsTrigger>
      <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
      <TabsTrigger value="modules">Módulos</TabsTrigger>
      <TabsTrigger value="form">Formulário</TabsTrigger>
      <TabsTrigger value="products">Produtos</TabsTrigger>
      <TabsTrigger value="clients">Campos</TabsTrigger>
    </TabsList>
    
    {/* Segunda linha de tabs */}
    <TabsList>
      <TabsTrigger value="alerts">Alertas</TabsTrigger>
      <TabsTrigger value="expenses">Despesas</TabsTrigger>
      <TabsTrigger value="integrations">Integrações</TabsTrigger>
    </TabsList>
  </div>

  {/* TabsContent mantém-se igual */}
</Tabs>
```

---

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Settings.tsx` | Dividir TabsList em duas linhas com espaçamento mínimo |

---

### Notas

- O componente `Tabs` do Radix suporta múltiplos `TabsList` - todos os triggers funcionam normalmente
- Apenas afeta a versão desktop (mobile já usa navegação em lista)
- O espaçamento entre as duas linhas será mínimo (`space-y-2`) para dar continuidade visual

**Total: 1 ficheiro modificado**

