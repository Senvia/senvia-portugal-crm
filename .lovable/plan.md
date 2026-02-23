
# Corrigir Formulario de Registo e Build Errors

## 1. Corrigir Build Errors no Login (`src/pages/Login.tsx`)

O ultimo edit removeu o estado `loginCompanyCode` mas deixou referencias orfas no codigo. Preciso:

- **Restaurar** o estado `loginCompanyCode` e a validacao `companyCode` no schema -- o login CONTINUA a usar o codigo da empresa (slug) para autenticar
- O campo "Codigo da Empresa" no LOGIN fica como esta

## 2. Limpar Formulario de Registo (`src/pages/Login.tsx`)

No tab de registo (signup), fazer duas alteracoes:

### Renomear campo do slug
- De: "Endereco da sua empresa"
- Para: "Codigo da Empresa"
- Manter o input editavel, a verificacao de disponibilidade e o texto `senvia.app/slug`

### Remover campo read-only duplicado (linhas 566-580)
Eliminar completamente o bloco:
- Input read-only "Codigo da Empresa" que repete o slug
- Nota amarela "Anote este codigo -- sera necessario para fazer login"

## Resultado Final

**Login**: 3 campos (Codigo da Empresa + Email + Password) -- sem alteracoes

**Registo**: Os campos ficam assim:
1. Nome Completo
2. Email
3. Palavra-passe
4. Confirmar Palavra-passe
5. Nome da Empresa
6. Codigo da Empresa (antigo "Endereco da sua empresa") -- com verificacao de disponibilidade

## Secao Tecnica

### Ficheiro: `src/pages/Login.tsx`

**Restaurar (corrigir build errors):**
- Adicionar de volta `companyCode` ao `loginSchema`
- Adicionar de volta o estado `const [loginCompanyCode, setLoginCompanyCode] = useState('')`

**Alterar no signup:**
- Linha 533: Label de `"Endereco da sua empresa"` para `"Codigo da Empresa"`
- Linhas 566-580: Remover o bloco inteiro do input read-only e da nota amarela
