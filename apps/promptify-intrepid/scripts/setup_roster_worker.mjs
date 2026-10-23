// Explicit operations: --secret configures a private key; --enable schedules the verified endpoint.
import fs from 'node:fs';
import {randomBytes,createHmac,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {loadEnv} from 'vite';
const mode=process.argv[2],config=loadEnv('rebuild',process.cwd(),''),setup=loadEnv('production-setup',process.cwd(),'');
const ref=new URL(config.SUPABASE_URL||config.VITE_SUPABASE_URL).hostname.split('.')[0];
if(ref!=='aixhryqzgpptuhstiflx')throw new Error('Wrong database.');
async function query(sql){const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${setup.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});if(!r.ok)throw new Error(`Worker setup database HTTP ${r.status}`);return r.json();}
const file='.env.roster-worker.local';
let secret=fs.existsSync(file)?loadEnv('roster-worker',process.cwd(),'').ROSTER_WORKER_SECRET:undefined;
if(mode==='--secret'){
 if(!secret){secret=randomBytes(48).toString('hex');fs.writeFileSync(file,'ROSTER_WORKER_SECRET='+secret+'\n');}
 // Do not place secret values in shell arguments, logs, cron text or migration files.
 const upload=spawnSync('npx.cmd',['vercel','env','add','ROSTER_WORKER_SECRET','production','--force','--yes','--scope','promptify3'],{cwd:'outputs/rebuild-deploy',input:secret+'\n',shell:true,encoding:'utf8'});
 if(upload.status!==0)throw new Error('Vercel worker environment update failed.');
 await query(`DO $$ DECLARE id uuid; BEGIN SELECT s.id INTO id FROM vault.secrets s WHERE name='promptify_roster_worker_secret'; IF id IS NULL THEN PERFORM vault.create_secret('${secret}','promptify_roster_worker_secret','Promptify scheduled roster request signing'); ELSE PERFORM vault.update_secret(id,'${secret}'); END IF; END $$;`);
 console.log('Worker secret saved privately in server environment and Vault. Redeploy before enabling.');
}else if(mode==='--verify'||mode==='--enable'){
 if(!secret)throw new Error('Private worker configuration missing.');
 const timestamp=String(Math.floor(Date.now()/1000)),nonce=randomUUID();
 const headers={'x-promptify-timestamp':timestamp,'x-promptify-nonce':nonce,'x-promptify-signature':createHmac('sha256',secret).update(timestamp+'.'+nonce).digest('hex'),'Content-Type':'application/json'};
 const response=await fetch('https://promptify-rebuild.vercel.app/api/roster-worker',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(55000)});
 if(!response.ok)throw new Error(`Worker verification HTTP ${response.status}`);
 const replay=await fetch('https://promptify-rebuild.vercel.app/api/roster-worker',{method:'POST',headers,body:'{}'});
 if(!replay.ok||(await replay.json()).replayed!==true)throw new Error('Worker replay guard did not pass.');
 console.log('Signed production worker invocation and replay guard passed.');
 if(mode==='--enable'){
  await query("select cron.schedule('promptify-roster-worker','* * * * *','select public.product_dispatch_roster_worker();');");
  console.log('Scheduler enabled. Each opted-in connection is eligible every 15 minutes; disabled and sample connections are untouched.');
 }
}else throw new Error('Use --secret, --verify or --enable.');
