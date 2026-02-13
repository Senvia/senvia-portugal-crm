

# Corrigir Alinhamento do Campo Telefone

## Problema
O componente `PhoneInput` tem o botao do seletor de pais com altura `h-10`, enquanto o componente `Input` customizado usa `h-12`. Isto causa desalinhamento visual entre o campo de email e o campo de telefone.

## Solucao
Alterar a altura do botao do seletor de pais no `PhoneInput` de `h-10` para `h-12`, para ficar consistente com todos os outros inputs do sistema.

## Ficheiro alterado
- `src/components/ui/phone-input.tsx` - Alterar `h-10` para `h-12` no Button do seletor de pais (linha 119)

## Detalhe tecnico
```
// Antes
className="rounded-r-none border-r-0 px-2 h-10 min-w-fit ..."

// Depois
className="rounded-r-none border-r-0 px-2 h-12 min-w-fit ..."
```

