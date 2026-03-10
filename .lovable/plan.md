

## Diagnóstico

O lead recebido (`f164b077`) confirma que os dados vieram com chaves genéricas (`_1`, `_2`, `""`) — isto foi do mapeamento antigo do Make. O cliente corrigiu agora, mas **ainda não fez novo teste**.

Contudo, o código da edge function tem um bug real na lógica de parsing do nome (linhas 52-53):

```js
const name = rawBody.full_name || rawBody.name || rawBody.nome || rawBody.first_name
    ? [rawBody.first_name, rawBody.last_name].filter(Boolean).join(' ') || rawBody.full_name || rawBody.name || rawBody.nome
    : 'Lead Externo';
```

Este ternário tem uma precedência confusa — se `full_name` for uma string vazia `""` (que o Facebook/Make pode enviar), toda a condição será `falsy` e o nome fica "Lead Externo".

## Plano

### 1. Corrigir parsing do nome na edge function `submit-lead`

Simplificar a lógica de resolução do nome no `handleWebhookMode` (linhas 52-54):

```js
const name = 
  rawBody.full_name?.trim() || 
  rawBody.name?.trim() || 
  rawBody.nome?.trim() || 
  [rawBody.first_name, rawBody.last_name].filter(Boolean).join(' ').trim() || 
  'Lead Externo';
```

### 2. Adicionar logging do body para debug

Já existe na linha 49, mas vamos garantir que loga os campos mapeados para facilitar debug futuro:

```js
console.log('Webhook mapped fields:', { name, email, phone, notes, source });
```

### 3. Pedir ao cliente para fazer novo teste

Depois da correção, o cliente deve executar novamente o cenário do Make para confirmar que os dados chegam corretamente.

---

**Impacto**: Apenas a edge function `submit-lead/index.ts` será alterada. Sem alterações na base de dados ou no frontend.

