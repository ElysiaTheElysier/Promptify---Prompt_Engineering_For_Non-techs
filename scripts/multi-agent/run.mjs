// Lightweight local controller. No model SDK, Git mutations, merge or deployment.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const image = process.env.PROMPTIFY_WORKER_IMAGE || 'promptify-m1-cli-probe:ca';
// Dedicated user-selected Pro account; never fall back to the earlier OAuth volume.
const authVolume = 'promptify-kang-coding-auth';
const model = 'gemini-3.8-flash';
const hosts = ['lh3.googleusercontent.com','daily-cloudcode-pa.googleapis.com','antigravity-unleash.goog','www.googleapis.com','oauth2.googleapis.com','cloudcode-pa.googleapis.com','daily-cloudcode-pa.sandbox.googleapis.com','antigravity.googleapis.com','antigravity.google','accounts.google.com','antigravity-cli-auto-updater-974169037036.us-central1.run.app'];
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const save = (p,v) => fs.writeFile(p, JSON.stringify(v,null,2));
function safePath(p) { return typeof p==='string' && /^(src|api|test|tests|gcp|scripts)\/[\w./-]+\.(ts|tsx|css|json|sql|mjs)$/.test(p) && !p.split('/').includes('..'); }
function validate(c) {
  c.delivery ??= 'code';
  c.base ??= ''; c.support ??= []; c.allowExisting ??= false; c.syntaxOnly ??= false;
  if(typeof c.syntaxOnly!=='boolean')throw Error('Invalid syntax gate');
  if(typeof c.allowExisting!=='boolean')throw Error('Invalid overwrite contract');
  if(!['','apps/promptify-intrepid'].includes(c.base)||!Array.isArray(c.support)||!c.support.every(safePath))throw Error('Invalid app/support scope');
  if(!['code','edits'].includes(c.delivery))throw Error('Invalid worker delivery mode');
  if (!/^[a-z0-9-]+$/.test(c.id) || !c.objective || !Array.isArray(c.read) || !c.read.every(safePath) || !safePath(c.write) || !c.write.endsWith(c.syntaxOnly?'.mjs':'.ts') || !(c.allowExisting?/^(src\/services\/[\w-]+\.ts|scripts\/[\w-]+\.mjs|tests\/(?:db-correctness\/)?[\w-]+\.mjs)$/.test(c.write):/^tests?\//.test(c.write)) || (!c.allowExisting&&c.read.includes(c.write))) throw Error('Invalid file scope');
  if (!Array.isArray(c.tests) || (!c.tests.length&&!c.syntaxOnly) || !c.tests.every(p=>p===c.write || c.read.includes(p))) throw Error('Tests must be explicitly scoped');
  if (!Array.isArray(c.acceptance) || !c.acceptance.length || !Number.isInteger(c.maxAttempts) || c.maxAttempts<1 || c.maxAttempts>2 || !Number.isInteger(c.timeoutSeconds) || c.timeoutSeconds<1 || c.timeoutSeconds>900) throw Error('Invalid task limits');
  return c;
}
async function command(args, timeout=60000) {
  return new Promise((resolve,reject)=>{
    const p=spawn(args[0],args.slice(1),{shell:false,windowsHide:true}); let stdout='',stderr='',timedOut=false,overflow=false;
    const capture=key=>chunk=>{if(stdout.length+stderr.length>2_000_000){overflow=true;p.kill();return;} if(key==='stdout')stdout+=chunk;else stderr+=chunk;};
    p.stdout.on('data',capture('stdout'));p.stderr.on('data',capture('stderr'));
    const timer=setTimeout(()=>{timedOut=true;p.kill();},timeout);
    p.on('error',e=>{clearTimeout(timer);reject(e);});p.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr,timedOut,overflow});});
  });
}
const docker = (...a) => command(['docker',...a]);
async function must(...a) { const r=await docker(...a);if(r.code)throw Error(`Docker failed: ${r.stderr.slice(0,1500)}`);return r; }
const mount=(src,target,ro=true)=>['--mount',`type=bind,source=${src},target=${target}${ro?',readonly':''}`];
const restricted=['--read-only','--user','65534:65534','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','128','--memory','1g','--tmpfs','/tmp:rw,exec,nosuid,nodev,size=512m'];
async function prepareDeps(base='') {
  const appRoot=path.join(root,base);
  const lock=await fs.readFile(path.join(appRoot,'package-lock.json'));const volume=`promptify-ma-deps-${hash(lock).slice(0,12)}`;
  await must('volume','create',volume);
  const check=await docker('run','--rm','--network','none','--mount',`type=volume,source=${volume},target=/deps`,image,'test','-f','/deps/.ready');
  if(check.code===0)return volume;
  await must('run','--rm','--network','none','--mount',`type=volume,source=${volume},target=/deps`,image,'sh','-c','chown 65534:65534 /deps && touch /deps/.initialized');
  const r=await command(['docker','run','--rm',...restricted,'--workdir','/deps','--mount',`type=volume,source=${volume},target=/deps`,...mount(path.join(appRoot,'package.json'),'/deps/package.json'),...mount(path.join(appRoot,'package-lock.json'),'/deps/package-lock.json'),image,'sh','-c','npm ci --ignore-scripts --no-audit --fund=false --cache /tmp/npm-cache && touch .ready'],240000);
  if(r.code||r.timedOut)throw Error(`Dependency preparation failed: ${r.stderr.slice(-1500)}`);return volume;
}
async function runTask(c,deps) {
  const appRoot=path.join(root,c.base);
  const inputs=[...new Set([...c.read,...c.support])];
  const suffix=crypto.randomBytes(5).toString('hex'),name=`promptify-ma-${c.id}-${suffix}`;
  const dir=path.join(root,'outputs','multi-agent',name),workspace=path.join(dir,'workspace');await fs.mkdir(workspace,{recursive:true});
  // Nested read-only dependency mount must have a mountpoint before Docker starts.
  await fs.mkdir(path.join(workspace,'node_modules'),{recursive:true});
  await fs.copyFile(path.join(appRoot,'package.json'),path.join(workspace,'package.json'));
  const before={};
  for(const p of inputs){const full=path.join(appRoot,p);const stat=await fs.lstat(full);if(stat.isSymbolicLink())throw Error('Symlink input denied');const b=await fs.readFile(full);before[p]=hash(b);await fs.mkdir(path.dirname(path.join(workspace,p)),{recursive:true});await fs.writeFile(path.join(workspace,p),b);}
  const target=path.join(workspace,c.write);await fs.mkdir(path.dirname(target),{recursive:true});if(!c.allowExisting)await fs.writeFile(target,'');
  else if(!c.read.includes(c.write)||!before[c.write])throw Error('Existing edit must include its original source in read scope');
  const policyDir=path.join(dir,'policy');await fs.mkdir(policyDir);
  await save(path.join(policyDir,'settings.json'),{telemetry:{enabled:false},permissions:{allow:['command(ls -la /workspace)','command(ls -la /workspace/tests)',...c.read.map(p=>`command(cat /workspace/${p})`),...c.tests.map(p=>`command(node /deps/node_modules/tsx/dist/cli.mjs /workspace/${p})`)]}});
  await save(path.join(dir,'contract.json'),c);await save(path.join(dir,'baseline.json'),before);
  const state={id:c.id,model,account:'kangseobi123@gmail.com',delivery:c.delivery,status:'STARTING',attempts:0,write:c.write};await save(path.join(dir,'state.json'),state);
  const event=async(type,data={})=>fs.appendFile(path.join(dir,'events.jsonl'),JSON.stringify({at:new Date().toISOString(),type,...data})+'\n');
  const net=name+'-net',proxy=name+'-proxy',home=name+'-home';let workerName;
  try {
    await must('network','create','--internal',net);await must('volume','create',home);
    await must('run','--rm','--network','none','--mount',`type=volume,source=${authVolume},target=/seed,readonly`,'--mount',`type=volume,source=${home},target=/home/worker`,image,'sh','-c','cp -a /seed/. /home/worker/');
    await must('run','-d','--name',proxy,...restricted,'--network','bridge','--env',`ALLOWED_HOSTS=${hosts.join(',')}`,...mount(path.join(root,'scripts/multi-agent/egress-proxy.mjs'),'/proxy.mjs'),image,'node','/proxy.mjs');
    await must('network','connect','--alias','proxy',net,proxy);
    let repair='';let success=false;
    for(let attempt=1;attempt<=c.maxAttempts;attempt++) {
      state.attempts=attempt;state.status='RUNNING';await save(path.join(dir,'state.json'),state);await event('worker-start',{attempt});
      workerName=name+'-worker';
      const sources=await Promise.all(c.read.map(async p=>`FILE /workspace/${p}\n${await fs.readFile(path.join(workspace,p),'utf8')}\nEND FILE`));
      const prompt=`Implement this bounded task. Model must remain Gemini 3.8 Flash. Work only inside /workspace. Write ONLY /workspace/${c.write}; all other source is read-only. The complete allowed source is supplied below: do not search, list or discover files. No Git, credentials, cloud, network tools, dependencies, or production actions. Use your file-editing tool to create the test at the exact absolute target path. Import using relative paths from that test. Run these commands exactly, without cd, shell wrappers or extra flags: ${c.tests.map(p=>`node /deps/node_modules/tsx/dist/cli.mjs /workspace/${p}`).join('; ')}. If terminal execution is permission-denied, report it; do not broaden permissions. Objective: ${c.objective}. Acceptance: ${c.acceptance.join('; ')}. ${repair} Return a concise summary and test results.\n${sources.join('\n')}`;
      const workerPrompt=c.delivery==='code'?`Return ONLY the complete ${c.syntaxOnly?'JavaScript ES module':'TypeScript'} source for /workspace/${c.write}. Do not use any tools or execute commands. Use node:assert/strict and relative imports. Objective: ${c.objective}. Acceptance: ${c.acceptance.join('; ')}. No dependencies or network calls. ${repair}\n${sources.join('\n')}`:prompt;
      const args=['docker','run','--rm','--name',workerName,...restricted,'--network',net,'--env','HOME=/home/worker','--env','HTTPS_PROXY=http://proxy:3128','--env','HTTP_PROXY=http://proxy:3128','--env','NO_PROXY=localhost,127.0.0.1','--workdir','/workspace','--mount',`type=volume,source=${home},target=/home/worker`,...mount(workspace,'/workspace'),...mount(target,`/workspace/${c.write}`,false),'--mount',`type=volume,source=${deps},target=/deps,readonly`,'--mount',`type=volume,source=${deps},target=/workspace/node_modules,volume-subpath=node_modules,readonly`,...mount(path.join(policyDir,'settings.json'),'/home/worker/.gemini/antigravity-cli/settings.json'),...mount(path.join(root,'outputs/m0-m1/linux-cli'),'/cli'),image,'/cli/agy','--mode',c.delivery==='code'?'plan':'accept-edits','--model',model,'--effort','low','--output-format','stream-json','--print-timeout',`${c.timeoutSeconds}s`,'-p',workerPrompt];
      const r=await command(args,(c.timeoutSeconds+20)*1000);await docker('rm','-f',workerName);workerName=undefined;
      const clean=s=>s.replace(/https:\/\/accounts\.google\.com\/\S+/g,'[OAuth URL redacted]').replace(/4\/[\w-]{30,}/g,'[auth code redacted]');
      await fs.writeFile(path.join(dir,`worker-${attempt}.jsonl`),clean(r.stdout));await fs.writeFile(path.join(dir,`worker-${attempt}.stderr.log`),clean(r.stderr));
      let records;try{records=r.stdout.trim().split('\n').map(s=>JSON.parse(s));}catch{throw Error('Invalid structured worker output');}
      const final=records.filter(x=>x.event==='result').at(-1);const payload=final?.result || final;
      if(r.code!==0||r.timedOut||r.overflow||/timeout|authentication required/i.test(r.stderr)||payload?.status!=='SUCCESS'||!payload?.response?.trim())throw Error('Worker did not finish successfully; inspect redacted logs');
      if(c.delivery==='code'){const code=payload.response.trim().replace(/^```(?:typescript|ts|javascript|js)?\s*\n/, '').replace(/\n```\s*$/, '');await fs.writeFile(target,code+'\n');}
      for(const p of inputs)if((p!==c.write&&hash(await fs.readFile(path.join(workspace,p)))!==before[p])||hash(await fs.readFile(path.join(appRoot,p)))!==before[p])throw Error('Baseline/source scope changed');
      const candidate=await fs.readFile(target);if(!candidate.length)throw Error('No candidate test');
      if(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|\bsbp_[\w]{25,}|\bAQ\.[\w-]{30,}|\bGOCSPX-[\w-]{20,}/.test(candidate.toString()))throw Error('Possible credential in candidate');
      state.candidateHash=hash(candidate);state.status='TESTING';await save(path.join(dir,'state.json'),state);
      const gates=[];
      if(c.syntaxOnly){const gate=await command(['docker','run','--rm',...restricted,'--network','none',...mount(workspace,'/workspace'),image,'node','--check',`/workspace/${c.write}`],60000);gates.push({test:'syntax-only (behavior validation pending)',...gate});}
      for(const p of c.tests){const gate=await command(['docker','run','--rm',...restricted,'--network','none','--workdir','/workspace',...mount(workspace,'/workspace'),'--mount',`type=volume,source=${deps},target=/deps,readonly`,'--mount',`type=volume,source=${deps},target=/workspace/node_modules,volume-subpath=node_modules,readonly`,image,'node','/deps/node_modules/tsx/dist/cli.mjs',`/workspace/${p}`],60000);gates.push({test:p,...gate});}
      await save(path.join(dir,`gates-${attempt}.json`),gates);await event('independent-gates',{attempt,passed:gates.every(x=>x.code===0&&!x.timedOut)});
      if(gates.every(x=>x.code===0&&!x.timedOut)){success=true;break;}
      repair='Fix these independently reproduced test failures without changing scope: '+gates.filter(x=>x.code).map(x=>x.stdout+x.stderr).join('\n').slice(0,4000);
    }
    state.status=success?'AWAITING_GPT_SOL_REVIEW':'FAILED';await save(path.join(dir,'state.json'),state);await event(state.status);console.log(JSON.stringify({runDir:dir,...state}));
  } catch(e){state.status='BLOCKED';state.error=e.message;await save(path.join(dir,'state.json'),state);await event('blocked',{error:e.message});console.log(JSON.stringify({runDir:dir,...state}));process.exitCode=1;}
  finally {if(workerName)await docker('rm','-f',workerName);const logs=await docker('logs',proxy);await fs.writeFile(path.join(dir,'egress.jsonl'),logs.stdout);await docker('rm','-f',proxy);await docker('network','rm',net);}
}
async function review(dir,verdict,reason) {
  if(!['APPROVE','REVISE','REJECT'].includes(verdict)||!reason)throw Error('Explicit review verdict and reason required');
  dir=path.resolve(dir);if(!dir.startsWith(path.join(root,'outputs','multi-agent')+path.sep))throw Error('Not a controller run directory');
  const c=validate(JSON.parse(await fs.readFile(path.join(dir,'contract.json'))));const s=JSON.parse(await fs.readFile(path.join(dir,'state.json')));
  if(s.status!=='AWAITING_GPT_SOL_REVIEW'||hash(await fs.readFile(path.join(dir,'workspace',c.write)))!==s.candidateHash)throw Error('Review candidate is stale or gates did not pass');
  await save(path.join(dir,'review.json'),{reviewer:'GPT Sol (manual independent diff review)',verdict,reason,candidateHash:s.candidateHash,at:new Date().toISOString()});s.status=verdict;await save(path.join(dir,'state.json'),s);console.log(verdict+'; no source applied');
}
async function apply(dir) {
  dir=path.resolve(dir);if(!dir.startsWith(path.join(root,'outputs','multi-agent')+path.sep))throw Error('Invalid run directory');
  const c=validate(JSON.parse(await fs.readFile(path.join(dir,'contract.json'))));const s=JSON.parse(await fs.readFile(path.join(dir,'state.json')));const review=JSON.parse(await fs.readFile(path.join(dir,'review.json')));const baseline=JSON.parse(await fs.readFile(path.join(dir,'baseline.json')));
  const candidate=await fs.readFile(path.join(dir,'workspace',c.write));if(s.status!=='APPROVE'||review.verdict!=='APPROVE'||hash(candidate)!==review.candidateHash)throw Error('Missing/stale approval');
  for(const [p,h]of Object.entries(baseline))if(hash(await fs.readFile(path.join(root,c.base,p)))!==h)throw Error('Source changed since worker ran');
  const destination=path.join(root,c.base,c.write);
  if(c.allowExisting){const original=await fs.readFile(destination);if(hash(original)!==baseline[c.write])throw Error('Existing destination changed');
    const backup=path.join(dir,'before-apply',c.write);await fs.mkdir(path.dirname(backup),{recursive:true});await fs.writeFile(backup,original,{flag:'wx'});await fs.writeFile(destination,candidate);
  }else await fs.writeFile(destination,candidate,{flag:'wx'});
  s.status=c.allowExisting?'APPLIED_SCOPED_EDIT':'APPLIED_NEW_TEST_ONLY';await save(path.join(dir,'state.json'),s);console.log((c.allowExisting?'Updated scoped file with backup: ':'Added ')+c.write+'; no Git mutation');
}
const [action,...args]=process.argv.slice(2);
try {
  if(action==='run') {
    if(args.length<1||args.length>3)throw Error('Specify 1–3 independent task contracts');
    const contracts=await Promise.all(args.map(async p=>validate(JSON.parse(await fs.readFile(p)))));
    if(new Set(contracts.map(c=>c.write)).size!==contracts.length||contracts.some(a=>contracts.some(b=>a!==b&&a.base===b.base&&[...b.read,...b.support].includes(a.write))))throw Error('Overlapping tasks denied');
    if(new Set(contracts.map(c=>c.base)).size!==1)throw Error('Do not mix apps in one worker batch');
    const deps=await prepareDeps(contracts[0].base);await Promise.all(contracts.map(c=>runTask(c,deps)));
  } else if(action==='review')await review(args[0],args[1],args.slice(2).join(' '));
  else if(action==='apply')await apply(args[0]);
  else throw Error('Usage: node scripts/multi-agent/run.mjs run <1–3 contracts> | review <runDir> APPROVE|REVISE|REJECT <reason> | apply <runDir>');
} catch(e){console.error(e.message);process.exitCode=1;}
