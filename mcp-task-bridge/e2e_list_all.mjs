// E2E: list all tasks via MCP stdio (no projectId)
import { spawn } from 'node:child_process';

const send = (obj)=>JSON.stringify(obj)+"\n";
class Bus{constructor(){this.b=Buffer.alloc(0);this.w=new Map()}p(c){this.b=Buffer.concat([this.b,c]);for(;;){const i=this.b.indexOf("\n");if(i===-1)break;let l=this.b.slice(0,i).toString('utf8');if(l.endsWith('\r'))l=l.slice(0,-1);this.b=this.b.slice(i+1);if(!l.trim())continue;try{const o=JSON.parse(l);const id=o.id;if(id!=null&&this.w.has(id)){const {resolve,t}=this.w.get(id);clearTimeout(t);this.w.delete(id);resolve(o)}}catch{}}}wFor(id,ms=15000){return new Promise((r,j)=>{const t=setTimeout(()=>{this.w.delete(id);j(new Error(`Timeout ${id}`))},ms);this.w.set(id,{resolve:r,t})})}}

async function main(){
  const child=spawn('node',[new URL('./dist/index.js',import.meta.url).pathname],{
    cwd: process.cwd(), env:{...process.env, TASK_API_BASE: process.env.TASK_API_BASE||'http://localhost:8081/api/v1', DEV_LOGIN_USERNAME: process.env.DEV_LOGIN_USERNAME||'admin', MCP_DEBUG_PERMISSIONS:'false'}, stdio:['pipe','pipe','pipe']
  });
  const bus=new Bus();
  child.stdout.on('data',d=>bus.p(d));
  child.stderr.on('data',d=>process.stderr.write(d));
  child.stdin.write(send({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{tools:{}},clientInfo:{name:'e2e-list-all',version:'0.1.0'}}}));
  await bus.wFor(1,12000);
  child.stdin.write(send({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'dev_quick_login',arguments:{username:process.env.DEV_LOGIN_USERNAME||'admin'}}}));
  await bus.wFor(2,15000);
  child.stdin.write(send({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'list_tasks',arguments:{}}}));
  const resp=await bus.wFor(3,20000);
  let out=null; try{out=JSON.parse(resp?.result?.content?.[0]?.text||'{}')}catch{}
  console.log(JSON.stringify({ok:!!out?.success,total: out?.total ?? (Array.isArray(out?.tasks)?out.tasks.length:null), sample:Array.isArray(out?.tasks)?out.tasks.slice(0,5):null, error: out?.success?null:(out?.error||'unknown')}));
  child.kill('SIGTERM');
}
main().catch(e=>{console.error('E2E_LIST_ALL_ERROR',e?.message||e);process.exit(1)});

