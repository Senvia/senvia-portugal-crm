// Gera src/lib/validation/contact.ts a partir da versão do servidor.
// As duas cópias afastavam-se sozinhas; isto torna isso impossível.
const fs = require('fs');
const ORIGEM = 'supabase/functions/_shared/contact-validation.ts';
const DESTINO = 'src/lib/validation/contact.ts';

let s = fs.readFileSync(ORIGEM, 'utf8');
const antes = s.length;

s = s.replace(
  /import \{[\s\S]*?\} from "npm:libphonenumber-js@[^"]+";/,
  "import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';",
);
if (s.length === antes) { console.error('ERRO: import não substituído'); process.exit(1); }

s = s.replace(
  /\/\/ Contact validation — Deno side[\s\S]*?Vite bundle\)\./,
  [
    '// Contact validation — browser side, for the forms that ingest leads.',
    '//',
    '// FICHEIRO GERADO. Não editar à mão: corre `node gerar-validacao.cjs`.',
    '// É o mesmo ficheiro que supabase/functions/_shared/contact-validation.ts,',
    '// só com outro import. Não há carregador de módulos partilhado entre as Edge',
    '// Functions em Deno e o bundle do Vite, e ter duas cópias mantidas à mão já',
    '// custou caro — a lista de domínios descartáveis do lado do browser tinha',
    '// ficado a metade da do servidor, sem ninguém dar por isso.',
  ].join('\n'),
);

fs.writeFileSync(DESTINO, s);
console.log(`gerado ${DESTINO} — ${s.split('\n').length} linhas`);
