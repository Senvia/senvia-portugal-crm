## Plano: Exportar dados da base de dados Senvia OS

### Contexto importante
Eu (Lovable) tenho acesso de leitura/escrita à base de dados deste projeto através das ferramentas internas (Lovable Cloud / Supabase). **NÃO tenho acesso à password da base de dados nem ao painel web do Supabase para te entregar credenciais** — isso é gerido pela tua conta Lovable e por motivos de segurança não pode ser partilhado por mim.

Tens, portanto, **duas vias possíveis**:

---

### Opção A — Eu faço o export aqui (recomendado, imediato)
Eu corro queries SQL diretamente na base de dados e gero ficheiros descarregáveis (CSV / Excel / JSON / SQL dump parcial) com os dados que precisas. Entrego em `/mnt/documents/` para download imediato.

**Preciso que me digas:**
1. **Que dados queres exportar?** Algumas opções:
   - Tudo (todas as tabelas — dump completo em SQL ou múltiplos CSVs num ZIP)
   - Apenas tabelas de negócio (organizations, profiles, leads, clients, proposals, sales, cpes, etc.)
   - Uma organização específica (ex.: só dados da Escolha Inteligente / Total Link / Perfect2Gether)
   - Tabelas específicas que listares
2. **Formato preferido:** CSV (1 ficheiro por tabela, dentro de ZIP), Excel (multi-sheet), JSON, ou SQL dump.
3. **Incluir dados de auth?** (emails de utilizadores do `auth.users` — eu consigo extrair via JOIN com `profiles`/`organization_members`).

---

### Opção B — Acesso direto ao painel Supabase / password DB
Para isto **não consigo ajudar diretamente** — tens de:
1. Ir a **Lovable → topo direito → Cloud → Open Backend** (ou no menu Connectors → Lovable Cloud)
2. Isso abre o painel Supabase associado a este projeto
3. Lá podes ir a **Settings → Database** para obter a connection string / password, ou usar **Table Editor → Export** para CSV manual

A password e o painel são propriedade da tua conta — eu não os posso ler nem partilhar.

---

### Recomendação
**Vai pela Opção A.** É mais rápido, mais limpo, e eu posso filtrar/transformar os dados como precisares (ex.: "só leads do mês passado da Escolha Inteligente em Excel"). Diz-me só o âmbito e o formato e eu gero já.
