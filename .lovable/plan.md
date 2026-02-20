

## Melhorar o Banner de Trial

O banner de trial ja existe e funciona (`TrialBanner.tsx` + `AppLayout.tsx`), mas e apenas uma barra de texto clicavel. Vamos melhorar para ser mais visivel e ter um botao dedicado.

### Alteracoes

**Ficheiro: `src/components/layout/TrialBanner.tsx`**

Redesenhar o banner para incluir:
- Icone de relogio + texto com os dias restantes (lado esquerdo)
- Barra de progresso visual mostrando quantos dias ja passaram dos 14
- Botao "Escolher Plano" estilizado (lado direito)
- Cores mais visiveis (gradient ou fundo destacado)
- Responsivo: no mobile o botao fica abaixo do texto

**Ficheiro: `src/components/layout/AppLayout.tsx`**

Corrigir o posicionamento no mobile: atualmente o banner tem problemas de padding quando visivel (o conteudo principal perde o padding-top). Ajustar para que o banner fique fixo logo abaixo do header e o conteudo se adapte corretamente.

### Design do Banner

```text
+---------------------------------------------------------------+
| [icon] Periodo de teste: 8 dias restantes  [===---] [Escolher Plano] |
+---------------------------------------------------------------+
```

Mobile:
```text
+----------------------------------+
| [icon] 8 dias restantes          |
| [========------] [Escolher Plano]|
+----------------------------------+
```

### Detalhes Tecnicos

- Usar `Button` do shadcn com variante `senvia` para o botao
- Adicionar `Progress` bar com valor `((14 - daysRemaining) / 14) * 100`
- Manter a navegacao para `/settings?tab=billing`
- Sem alteracoes na base de dados ou edge functions
