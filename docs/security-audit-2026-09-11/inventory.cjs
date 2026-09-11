const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=process.cwd(), out='docs/security-audit-2026-09-11';
const files=cp.execFileSync('git',['ls-files'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split(/\r?\n/).filter(Boolean);
const entries=[], secrets=[], defs=new Map();
const patterns={private_key:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,stripe_secret:/\b(?:sk|rk)_live_[a-zA-Z0-9]{16,}/g,github_token:/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{25,}/g,aws_access:/\bAKIA[A-Z0-9]{16}\b/g,supabase_secret:/\bsb_secret_[A-Za-z0-9_-]{20,}/g};
for(const file of files){
 if(!/\.(?:ts|tsx|js|mjs|cjs|json|sql|md|toml|yml|yaml|sh)$/.test(file)&&!/(?:^|\/)\.env(?:\..*)?$/.test(file))continue;
 if(/(?:^|\/)(?:node_modules|dist|\.codegraph)\//.test(file)||/lock(?:\.json|b)?$/.test(file))continue;
 let s;try{s=fs.readFileSync(file,'utf8')}catch{continue}
 entries.push({file,bytes:Buffer.byteLength(s),sha256:crypto.createHash('sha256').update(s).digest('hex')});
 for(const [kind,re] of Object.entries(patterns))for(const m of s.matchAll(re))secrets.push({file,line:s.slice(0,m.index).split('\n').length,kind});
 for(const m of s.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g))try{const p=JSON.parse(Buffer.from(m[0].split('.')[1],'base64url'));if(p.role==='service_role')secrets.push({file,line:s.slice(0,m.index).split('\n').length,kind:'service_role_jwt'})}catch{}
}
const config=fs.readFileSync('supabase/config.toml','utf8');
const funcs=fs.readdirSync('supabase/functions',{withFileTypes:true}).filter(d=>d.isDirectory()&&d.name!=='_shared').map(d=>{
 const file=`supabase/functions/${d.name}/index.ts`,s=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
 const conf=config.match(new RegExp('\\[functions\\.'+d.name+'\\]\\s*verify_jwt\\s*=\\s*(true|false)'));
 return {name:d.name,file,verifyJwt:conf?conf[1]:'default/not specified',authSignals:[...new Set(s.match(/getUser|getClaims|authOrgAdmin|authOrgMember|isAuthorized|constructEventAsync|constructEvent|verifySignature|verify_automation_secret|x-cron-secret|x-automation-secret|x-webhook-secret/g)||[])],note:'Signals only, not a security verdict'};
});
const inventory={commit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),trackedFiles:files.length,sourceFilesHashed:entries.length,migrations:files.filter(f=>f.startsWith('supabase/migrations/')&&f.endsWith('.sql')).length,edgeFunctions:funcs.length,secretMatches:secrets,functions:funcs,sourceHashes:entries};
fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(inventory,null,2));
console.log(JSON.stringify({commit:inventory.commit,trackedFiles:files.length,sourceFilesHashed:entries.length,migrations:inventory.migrations,edgeFunctions:funcs.length,secretMatches:secrets,functionsWithoutAuthSignals:funcs.filter(f=>!f.authSignals.length).map(f=>({name:f.name,verifyJwt:f.verifyJwt}))},null,2));
