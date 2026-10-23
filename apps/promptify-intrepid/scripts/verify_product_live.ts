// Creates isolated QA-only accounts/course/cohorts in the dedicated rebuild DB.
// No email or real roster mutation. --ai/--sop/--sandbox/--private may call paid providers.
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';
Object.assign(process.env,loadEnv('rebuild',process.cwd(),''));
const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL!;
if(new URL(url).hostname!=='aixhryqzgpptuhstiflx.supabase.co')throw new Error('Wrong project');
const server=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const filename='outputs/rebuild-audit/qa-identities.local.json';
const secret=fs.existsSync(filename)?JSON.parse(fs.readFileSync(filename,'utf8')):{password:randomBytes(36).toString('base64url'),accounts:{},ids:{}};
fs.mkdirSync('outputs/rebuild-audit',{recursive:true});
const save=()=>fs.writeFileSync(filename,JSON.stringify(secret,null,2),{mode:0o600});
async function data(request:any){const result=await request;if(result.error)throw new Error(`QA operation failed: ${result.error.code||'unknown'}`);return result.data;}
for(const [role,label] of [['instructor','trainer'],['learner','learner-a'],['learner','learner-b'],['head','head']] as const){
 if(!secret.accounts[label]){
  const email=`qa-production-${label}@promptify-test.invalid`;
  const result=await server.auth.admin.createUser({email,password:secret.password,email_confirm:true,user_metadata:{purpose:'Promptify production integration QA'}});
  if(result.error||!result.data.user)throw new Error('QA identity creation failed; no credential details logged.');
  secret.accounts[label]={email,subject:result.data.user.id};save();
 }
 const account=secret.accounts[label];
 const user=await data(server.from('users').upsert({email:account.email,full_name:'QA '+label,role,auth_provider_id:account.subject,profile_confirmed_at:new Date().toISOString()},{onConflict:'email'}).select('id').single());account.id=user.id;save();
 if(role==='learner'){const learner=await data(server.from('learners').upsert({user_id:user.id},{onConflict:'user_id'}).select('id').single());account.learnerId=learner.id;save();}
}
if(!secret.ids.client){const row=await data(server.from('clients').insert({name:'QA ONLY — production integration',industry:'Software testing'}).select('id').single());secret.ids.client=row.id;save();}
if(!secret.ids.course){const row=await data(server.from('courses').insert({title:'QA ONLY — API contract verification',slug:'qa-production-contract',status:'active',publication_status:'published',created_by:secret.accounts.trainer.id}).select('id').single());secret.ids.course=row.id;save();}
await data(server.from('course_instructors').upsert({course_id:secret.ids.course,user_id:secret.accounts.trainer.id,permission:'owner'}));
if(!secret.ids.module){const row=await data(server.from('course_modules').insert({course_id:secret.ids.course,title:'QA ONLY',position:1,status:'published'}).select('id').single());secret.ids.module=row.id;save();}
if(!secret.ids.lesson){const row=await data(server.from('lessons').insert({module_id:secret.ids.module,title:'QA — source citation task',lesson_key:'qa-production-source',position:1,status:'published',scenario:'QA source contract.',task_goal:'Return the authorized service window.',sample_input_context:'Approved QA source: the service window is 15 minutes.',hints:['Cite the approved source.'],improved_prompt:'QA solution — cite the 15 minute window.'}).select('id').single());secret.ids.lesson=row.id;save();}
for(const name of ['classA','classB'])if(!secret.ids[name]){const row=await data(server.from('classes').insert({class_code:'QA-PRODUCTION-'+name,course_id:secret.ids.course,client_id:secret.ids.client,department:'QA',status:'active',enrollment_mode:'instructor',start_date:new Date().toISOString(),end_date:'2027-01-01T00:00:00Z'}).select('id').single());secret.ids[name]=row.id;save();}
await data(server.from('enrollments').upsert([{learner_id:secret.accounts['learner-a'].learnerId,class_id:secret.ids.classA,status:'active'},{learner_id:secret.accounts['learner-b'].learnerId,class_id:secret.ids.classB,status:'active'}],{onConflict:'learner_id,class_id'}));
await data(server.from('product_class_grants').upsert({user_id:secret.accounts.head.id,class_id:secret.ids.classA,permission:'head'}));
const {handleProductRequest}=await import('../src/services/productionServerService');
async function signIn(label:string){const client=createClient(url,process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});const result=await client.auth.signInWithPassword({email:secret.accounts[label].email,password:secret.password});if(result.error||!result.data.session)throw new Error('QA sign-in failed.');return 'Bearer '+result.data.session.access_token;}
const learner=await signIn('learner-a'),trainer=await signIn('trainer');
const head=await signIn('head');
const headSnapshot=await handleProductRequest(head,{action:'snapshot',classId:secret.ids.classA});
assert.equal(headSnapshot.selectedClass.can_manage,false);
assert.equal(headSnapshot.attempts.length,0,'Head must not receive individual prompt attempts');
await assert.rejects(()=>handleProductRequest(head,{action:'governance',classId:secret.ids.classA}));
await assert.rejects(()=>handleProductRequest(learner,{action:'governance',classId:secret.ids.classA}));
const headReport=await handleProductRequest(head,{action:'analytics',clientId:secret.ids.client});
assert.deepEqual(headReport.classes.map((row:any)=>row.id),[secret.ids.classA]);
const publishedSources=await data(server.from('product_sop_contributions').select('id').eq('class_id',secret.ids.classA).eq('status','published'));
assert.equal(headReport.published_sops,publishedSources.length);
assert.equal(headReport.classes[0].published_sops,publishedSources.length);
await assert.rejects(()=>handleProductRequest(head,{action:'snapshot',classId:secret.ids.classB}));
await assert.rejects(()=>handleProductRequest(head,{action:'saveClass',classId:secret.ids.classA,status:'active',reason:'QA role denial'}));
await data(server.from('product_learner_support').delete().eq('learner_id',secret.accounts['learner-a'].learnerId).eq('class_id',secret.ids.classA));
await assert.rejects(()=>handleProductRequest('',{action:'snapshot'}));
const snapshot=await handleProductRequest(learner,{action:'snapshot',classId:secret.ids.classA});
assert.equal(snapshot.classes.length,1);assert.equal(snapshot.lessons[0].improved_prompt,'');assert.deepEqual(snapshot.lessons[0].hints,[]);
await assert.rejects(()=>handleProductRequest(learner,{action:'snapshot',classId:secret.ids.classB}));
await assert.rejects(()=>handleProductRequest(learner,{action:'sessionControl',classId:secret.ids.classA,state:'ended',expectedRevision:0,reason:'QA denied action'}));
await handleProductRequest(learner,{action:'unlockSupport',classId:secret.ids.classA,lessonId:secret.ids.lesson,kind:'hints'});
const unlocked=await handleProductRequest(learner,{action:'snapshot',classId:secret.ids.classA});assert.equal(unlocked.lessons[0].hints.length,1);assert.equal(unlocked.lessons[0].improved_prompt,'');
const studio=await handleProductRequest(trainer,{action:'snapshot',classId:secret.ids.classA});assert.equal(studio.selectedClass?.can_manage,true);
const changed=await handleProductRequest(trainer,{action:'sessionControl',classId:secret.ids.classA,state:'frozen',expectedRevision:studio.controls.revision,reason:'QA concurrency verification'});
await assert.rejects(()=>handleProductRequest(trainer,{action:'sessionControl',classId:secret.ids.classA,state:'active',expectedRevision:studio.controls.revision,reason:'QA stale revision'}));
await handleProductRequest(trainer,{action:'sessionControl',classId:secret.ids.classA,state:'active',expectedRevision:changed.revision,reason:'QA restore active state'});
console.log('Live QA passed: verified sessions, assigned class scope, learner control denial, persisted hint unlock and session revision conflict. No AI calls or sample roster import.');
if(process.argv.includes('--private')){
 const bytes=Buffer.from('QA ONLY fictional source. The service window is 15 minutes.');
 if(!secret.privateRequest){secret.privateRequest=crypto.randomUUID();save();}
 const body={classId:secret.ids.classA,lessonId:secret.ids.lesson,requestId:secret.privateRequest,filename:'qa-fictional-source.txt'};
 const existing=await data(server.from('product_sop_contributions').select('id,version_id').eq('actor_id',secret.accounts['learner-a'].id).eq('request_id',secret.privateRequest).maybeSingle());
 let contribution=existing;
 if(!contribution){
  const signed=await handleProductRequest(learner,{action:'prepareSopUpload',...body,size:bytes.length});
  const uploader=createClient(url,process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const uploaded=await uploader.storage.from(signed.bucket).uploadToSignedUrl(signed.path,signed.token,bytes,{contentType:'text/plain'});
  if(uploaded.error)throw new Error('QA private signed upload failed');
  contribution=await handleProductRequest(learner,{action:'submitSop',...body,title:'QA ONLY fictional private source',storagePath:signed.path});
 }
 const published=await handleProductRequest(trainer,{action:'reviewSop',classId:body.classId,contributionId:contribution.id,decision:'approve'});
 const download=await handleProductRequest(learner,{action:'sourceDownload',classId:body.classId,versionId:published.versionId});
 const original=await fetch(download.url,{signal:AbortSignal.timeout(15000)});assert.equal(original.status,200);assert.equal(await original.text(),bytes.toString());
 const outsider=await signIn('learner-b');await assert.rejects(()=>handleProductRequest(outsider,{action:'sourceDownload',classId:body.classId,versionId:published.versionId}));
 console.log('Private source live QA passed: signed upload, reviewed publication, exact original download and foreign-class denial. URLs and credentials not logged.');
}
if(process.argv.includes('--sop')){
 if(!secret.sopRequest){secret.sopRequest=crypto.randomUUID();save();}
 const contribution=await handleProductRequest(learner,{action:'submitSop',classId:secret.ids.classA,lessonId:secret.ids.lesson,requestId:secret.sopRequest,title:'QA ONLY — approved source ingestion',filename:'qa-approved-source.md',base64:Buffer.from('Approved QA source: the service window is 15 minutes.').toString('base64')});
 await assert.rejects(()=>handleProductRequest(learner,{action:'reviewSop',classId:secret.ids.classA,contributionId:contribution.id,decision:'approve'}));
 const reviewed=await handleProductRequest(trainer,{action:'reviewSop',classId:secret.ids.classA,contributionId:contribution.id,decision:'approve'});
 assert.ok(reviewed.versionId);
 const stored=await handleProductRequest(learner,{action:'snapshot',classId:secret.ids.classA});
 const source=stored.sops.find((s:any)=>s.id===reviewed.versionId);assert.ok(source);assert.equal(source.chunks.length,1);assert.match(source.content,/15 minutes/);
 const replay=await handleProductRequest(trainer,{action:'reviewSop',classId:secret.ids.classA,contributionId:contribution.id,decision:'approve'});assert.equal(replay.versionId,reviewed.versionId);
 console.log('Live SOP QA passed: learner submission, trainer approval, real embedding persisted, source binding, unauthorized publication denied and replay preserved source version.');
}
if(process.argv.includes('--sandbox')){
 if(!secret.sandboxRequest){secret.sandboxRequest=crypto.randomUUID();save();}
 const before=await handleProductRequest(trainer,{action:'snapshot',classId:secret.ids.classA});
 const body={action:'sandboxGenerate',classId:secret.ids.classA,lessonId:secret.ids.lesson,requestId:secret.sandboxRequest,prompt:'Return the approved QA service window in one sentence.'};
 await assert.rejects(()=>handleProductRequest(learner,body));
 const run=await handleProductRequest(trainer,body);assert.ok(run.output);
 const replay=await handleProductRequest(trainer,body);assert.equal(replay.output,run.output);
 const judged=await handleProductRequest(trainer,{action:'sandboxJudge',classId:secret.ids.classA,requestId:secret.sandboxRequest,language:'en'});assert.equal(judged.contract,'weighted-v1');assert.ok(judged.feedback?.vi.nextHint);
 const after=await handleProductRequest(trainer,{action:'snapshot',classId:secret.ids.classA});assert.equal(after.analytics.attempts,before.analytics.attempts);
 console.log('Live sandbox QA passed: trainer-only generation and bilingual Judge, durable replay and no learner analytics mutation.');
}
if(process.argv.includes('--ai')){
 // One QA generation and one Judge call at most; durable request ID is reused.
 const {generateSavedRun,evaluateSavedRun}=await import('../src/services/rebuildRunService');
 const key=process.argv.includes('--release')?'releaseRequest':process.argv.includes('--bilingual')?'bilingualRequest':'runRequest';
 if(!secret[key]){secret[key]=crypto.randomUUID();save();}
 const body={classId:secret.ids.classA,lessonId:secret.ids.lesson,requestId:secret[key],prompt:'Using only the approved QA source, return the service window in one sentence.'};
 const run=await generateSavedRun(learner,body);
 assert.ok(run.saved?.attempt?.id);assert.ok(run.output);
 if(process.argv.includes('--release')){
  const policy=await data(server.from('prompt_attempts').select('production_pass_threshold').eq('id',run.saved.attempt.id).single());
  assert.equal(Number(policy.production_pass_threshold),8,'New production attempt must capture passing policy');
 }
 const replay=await generateSavedRun(learner,body);assert.equal(replay.saved.attempt.id,run.saved.attempt.id);
 const evaluation=await evaluateSavedRun(learner,{classId:secret.ids.classA,lessonId:secret.ids.lesson,attemptId:run.saved.attempt.id,language:'vi'});
 assert.equal(evaluation.contract,'weighted-v1');assert.ok(evaluation.total>=0&&evaluation.total<=10);
 if(process.argv.includes('--bilingual')){assert.ok(evaluation.feedback?.en.nextHint);assert.ok(evaluation.feedback?.vi.nextHint);assert.notEqual(evaluation.feedback.en.nextHint,evaluation.feedback.vi.nextHint);assert.equal(Object.keys(evaluation.feedback.en.criteriaReasons).length,evaluation.criteria.length);}
 const reread=await handleProductRequest(learner,{action:'snapshot',classId:secret.ids.classA});
 assert.equal(reread.attempts.find((a:any)=>a.id===run.saved.attempt.id)?.evaluation_json?.total,evaluation.total);
 const outsider=await signIn('learner-b');
 await assert.rejects(()=>evaluateSavedRun(outsider,{classId:secret.ids.classA,lessonId:secret.ids.lesson,attemptId:run.saved.attempt.id,language:'en'}));
 console.log('Live AI QA passed: generated output persisted, request replay reused saved result, weighted Vietnamese Judge persisted, foreign learner denied.');
}
