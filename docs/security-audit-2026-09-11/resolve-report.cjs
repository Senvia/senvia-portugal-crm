const fs=require('node:fs'),path=require('node:path');
const file='docs/security-audit-2026-09-11/RELATORIO.md';
let text=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');
let count=0;const references=[];
text=text.replace(/\{\{([^|\n]+)\|([^\n]*?)\}\}(?!\})/g,(_,name,needle)=>{
 const lines=fs.readFileSync(name,'utf8').split('\n'),line=lines.findIndex(s=>s.includes(needle))+1;
 if(!line)throw new Error('Evidence not found: '+name+' | '+needle);
 count++;references.push({file:name,line});
 return `[${name}:${line}](<${path.resolve(name).replaceAll('\\','/')}:${line}>)`;
});
if(text.includes('{{'))throw new Error('Unresolved references');
fs.writeFileSync(file,text);
fs.writeFileSync('docs/security-audit-2026-09-11/references.json',JSON.stringify(references,null,2));
console.log(JSON.stringify({resolvedReferences:count,findings:(text.match(/^## A\d\d/gm)||[]).length,reportBytes:Buffer.byteLength(text)},null,2));
