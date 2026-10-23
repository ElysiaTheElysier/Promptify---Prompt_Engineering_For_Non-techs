import fs from 'node:fs';import {spawnSync} from 'node:child_process';
if(!process.argv.includes('--staging-readonly'))throw Error('Explicit readonly staging flag required');
const fixture=JSON.parse(fs.readFileSync('outputs/staging-feedback-review/fixture.json','utf8'));
const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','gcloud secrets versions access 1 --secret=intrepid-db-password --project=ai-transformation-510302'],{encoding:'utf8',windowsHide:true});if(secret.status!==0)throw Error('No staging secret');
Object.assign(process.env,{PGHOST:'127.0.0.1',PGPORT:'55439',PGDATABASE:'promptify_db',PGUSER:'promptify_runtime',PGPASSWORD:secret.stdout.trim()});delete process.env.DATABASE_URL;
const {feedbackSnapshot}=await import('../src/services/mentorFeedbackService');const {closeSqlPool}=await import('../src/services/cloudPostgresService');
const times=[];try{for(let i=0;i<4;i++){let t=performance.now();await feedbackSnapshot(fixture.actorId,fixture.ids.class);times.push(Math.round(performance.now()-t));}}finally{await closeSqlPool();}
const phase=process.argv.includes('--after')?'after':'before';fs.writeFileSync('outputs/staging-feedback-review/feedback-benchmark-'+phase+'.json',JSON.stringify({phase,milliseconds:times,scope:'feedbackSnapshot only, real staging reads; excludes Firebase verification and full snapshot'},null,2));console.log(JSON.stringify({phase,milliseconds:times}));
