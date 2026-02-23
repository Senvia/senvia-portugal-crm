

# Optimizar Imagem do Otto (Carregamento Lento)

## Problema
O ficheiro `otto-mascot.svg` tem aproximadamente **5MB** porque contem dados PNG codificados em base64 dentro do SVG. E utilizado em 4 locais diferentes (FAB, Chat Header, Loading indicator, Quick Actions) em tamanhos muito pequenos (28px a 56px). Carregar 5MB para um icone de 56px e extremamente ineficiente.

## Solucao

### 1. Converter o SVG para PNG optimizado
- Exportar o SVG actual como PNG em resolucao adequada (112x112px para suportar retina/2x)
- Comprimir o PNG resultante (ficara com ~10-30KB em vez de 5MB)
- Guardar como `public/otto-mascot.png`

### 2. Actualizar as importacoes nos componentes

**Ficheiros a alterar:**
- `src/components/otto/OttoFAB.tsx` - mudar import de SVG para PNG
- `src/components/otto/OttoChatWindow.tsx` - mudar import de SVG para PNG
- `src/components/otto/OttoQuickActions.tsx` - verificar se usa o mascot

**Alteracao em cada ficheiro:**
```text
// De:
import ottoMascot from "@/assets/otto-mascot.svg";

// Para:
import ottoMascot from "@/assets/otto-mascot.png";
```

### 3. Alternativa (sem converter manualmente)
Se nao for possivel converter externamente, podemos:
- Mover o SVG para `/public/otto-mascot.svg` (para nao ser inlined pelo bundler)
- Referenciar como URL estatico em vez de import
- Isto evita que o Vite tente processar/inline o ficheiro gigante

```text
// De:
import ottoMascot from "@/assets/otto-mascot.svg";

// Para (referencia estatica):
const ottoMascot = "/otto-mascot.svg";
```

Esta abordagem e mais rapida de implementar e resolve o problema imediatamente, pois o ficheiro sera servido como asset estatico em vez de ser embutido no bundle JS.

## Recomendacao
A **alternativa 3** (mover para `/public/`) e a solucao mais rapida e eficaz. O ideal seria tambem optimizar a imagem (alternativa 1+2), mas isso requer ferramentas externas.

## Impacto
- Reducao do tamanho do bundle JS (o SVG de 5MB esta a ser inlined)
- Carregamento muito mais rapido do Otto
- O browser pode fazer cache do ficheiro separadamente
