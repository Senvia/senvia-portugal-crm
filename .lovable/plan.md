
# Guardar Campanha como Rascunho

## Objectivo

Permitir guardar uma campanha mesmo sem todos os dados preenchidos. O botao muda dinamicamente:
- **Dados incompletos**: "Guardar Campanha" (guarda como rascunho) + aviso de que so pode enviar/agendar com tudo preenchido
- **Dados completos**: "Enviar Campanha" + "Agendar envio" (comportamento actual)

## Alteracoes

### Ficheiro: `src/components/marketing/CreateCampaignModal.tsx`

**No footer do Step 3 (linhas 632-681):**

1. Substituir a logica do footer para ter dois estados:
   - Se `allSectionsComplete` e `false`:
     - Mostrar uma nota/alerta: "Preencha todos os campos para poder enviar ou agendar a campanha."
     - Botao principal: "Guardar Campanha" (icone Save) -- sempre activo desde que haja pelo menos o nome
     - Esconder o botao "Agendar envio"
   - Se `allSectionsComplete` e `true`:
     - Manter o comportamento actual: botao "Agendar envio" + "Enviar campanha"
     - Adicionar tambem um botao "Guardar Campanha" para quem queira guardar sem enviar

2. **Nova funcao `handleSaveDraft`:**
   - Chama `createCampaign.mutateAsync()` com os dados disponiveis (nome, subject se houver, template se houver, etc.)
   - O status fica `draft` (ja e o default)
   - Mostra toast de sucesso: "Campanha guardada como rascunho"
   - Fecha o modal

3. **Condicao minima para guardar:** apenas o nome da campanha (`name.trim()`)

### Ficheiro: `src/hooks/useCampaigns.ts`

- Sem alteracoes necessarias -- `useCreateCampaign` ja cria com status `draft` por defeito e todos os campos sao opcionais excepto o nome.

## Resultado visual (Step 3 footer)

**Quando faltam dados:**
```text
[Aviso: Preencha destinatarios, assunto e conteudo para enviar]
                                          [ Guardar Campanha ]
```

**Quando tudo esta completo:**
```text
0 destinatario(s)
              [ Guardar Campanha ]  [ Agendar envio ]  [ Enviar campanha ]
```

## Ficheiros a editar

| Ficheiro | Accao |
|----------|-------|
| `src/components/marketing/CreateCampaignModal.tsx` | Adicionar `handleSaveDraft`, mudar footer do Step 3 com logica condicional |
