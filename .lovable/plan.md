

## Filtros em Collapsible/Accordion

Envolver o conteúdo dos filtros (`CardContent`) num `Collapsible` que começa fechado. O header do Card torna-se o trigger clicável com um ícone ChevronDown que roda ao abrir.

### Alterações em `PortalTotalLinkFilters.tsx`

1. Importar `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` de `@/components/ui/collapsible`
2. Importar `ChevronDown` do lucide-react
3. Adicionar estado `const [open, setOpen] = useState(false)`
4. Envolver o `Card` inteiro num `<Collapsible open={open} onOpenChange={setOpen}>`
5. O `CardHeader` passa a ser um `CollapsibleTrigger` clicável com `cursor-pointer` e um `ChevronDown` que roda 180deg quando aberto (`transition-transform`, `rotate-180` quando `open`)
6. O `CardContent` fica dentro de `<CollapsibleContent>` -- só visível quando expandido
7. O badge de filtros ativos continua sempre visível no header como indicador

