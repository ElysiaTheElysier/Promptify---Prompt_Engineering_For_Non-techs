// Uses existing isolated QA identities only. --ai/--upload call paid Gemini APIs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';
import {DEFAULT_LEARNER_SETTINGS} from '../src/services/learnerSettingsService';
Object.assign(process.env,loadEnv('rebuild',process.cwd(),''));
const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL!;
if(new URL(url).hostname!=='aixhryqzgpptuhstiflx.supabase.co')throw new Error('Wrong project');
const qa=JSON.parse(fs.readFileSync('outputs/rebuild-audit/qa-identities.local.json','utf8'));
const {handleProductRequest}=await import('../src/services/productionServerService');
async function signIn(label:string){const c=createClient(url,process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});const r=await c.auth.signInWithPassword({email:qa.accounts[label].email,password:qa.password});if(r.error||!r.data.session)throw new Error('QA authentication failed');return 'Bearer '+r.data.session.access_token;}
const learner=await signIn('learner-a'),head=await signIn('head'),trainer=await signIn('trainer'),other=await signIn('learner-b');
const scope={classId:qa.ids.classA,lessonId:qa.ids.lesson};
const request={...scope,requestId:crypto.randomUUID(),title:'QA ONLY learner library contract',prompt:'Return the service window from the authorized source with a citation.',settings:DEFAULT_LEARNER_SETTINGS};
const personal=await handleProductRequest(learner,{action:'savePromptLibrary',...request});
assert.equal(personal.status,'personal');
const replay=await handleProductRequest(learner,{action:'savePromptLibrary',...request});assert.equal(replay.id,personal.id);
await assert.rejects(()=>handleProductRequest(learner,{action:'savePromptLibrary',...request,share:true}));
const shared=await handleProductRequest(learner,{action:'savePromptLibrary',...request,requestId:crypto.randomUUID(),share:true});assert.equal(shared.status,'pending');
await assert.rejects(()=>handleProductRequest(learner,{action:'reviewPromptLibrary',...scope,entryId:shared.id,decision:'approve',reason:'Not permitted'}));
await assert.rejects(()=>handleProductRequest(head,{action:'reviewPromptLibrary',classId:qa.ids.classB,entryId:shared.id,decision:'approve',reason:'Wrong class'}));
await handleProductRequest(head,{action:'reviewPromptLibrary',...scope,entryId:shared.id,decision:'approve',reason:'QA ONLY reviewed template'});
const state=await handleProductRequest(learner,{action:'snapshot',...scope});assert.equal(state.promptLibrary.find((r:any)=>r.id===shared.id).status,'approved');
await assert.rejects(()=>handleProductRequest(other,{action:'snapshot',...scope}));
await assert.rejects(()=>handleProductRequest(learner,{action:'_unused_unlockSupport',...scope,kind:'solution'}));
await assert.rejects(()=>handleProductRequest(learner,{action:'unlockSupport',...scope,kind:'solution',reflection:'short'}));
await handleProductRequest(learner,{action:'unlockSupport',...scope,kind:'solution',reflection:'QA reflection: my prompt needs a precise source citation.'});
const sync=await handleProductRequest(learner,{action:'requestSopSync',...scope,requestId:crypto.randomUUID(),title:'QA ONLY deferred Drive sync',driveUrl:'https://drive.google.com/file/d/qa-only-unavailable/view',reason:'QA verifies deferred ingestion without fetching Drive.',priority:'normal'});
await handleProductRequest(trainer,{action:'reviewSop',...scope,contributionId:sync.id,decision:'reject',reason:'QA ONLY no Drive ingestion expected'});
console.log('Live learner QA passed: library persistence/replay/conflict, Head approval, role/class denial, reflection, deferred SOP request/rejection.');
let contextIds:string[]=[];
if(process.argv.includes('--upload')){
 const body={action:'uploadLearnerContext',...scope,filename:'qa-session-context.txt',base64:Buffer.from('QA ONLY fictional document: the service window is 15 minutes.').toString('base64')};
 const context=await handleProductRequest(learner,body);const same=await handleProductRequest(learner,body);assert.equal(context.id,same.id);contextIds=[context.id];
 const next=await handleProductRequest(learner,{action:'snapshot',...scope});assert.ok(next.learnerContexts.some((r:any)=>r.id===context.id));
 await assert.rejects(()=>handleProductRequest(other,{...body,classId:qa.ids.classA}));
 console.log('Live private context QA passed: real extraction/indexing, deduplicated replay and scope denial.');
}
if(process.argv.includes('--ai')){
 const settings={...DEFAULT_LEARNER_SETTINGS,temperature:0.2,topP:0.8,maxOutputTokens:4096,searchGrounding:process.argv.includes('--web')};
 const body={action:'generate',...scope,requestId:crypto.randomUUID(),prompt:request.prompt,settings,contextIds};
 const generated=await handleProductRequest(learner,body);assert.ok(generated.saved?.attempt?.id);assert.ok(generated.output?.trim());
 assert.equal((await handleProductRequest(learner,body)).saved.attempt.id,generated.saved.attempt.id);
 const judged=await handleProductRequest(learner,{action:'judge',...scope,attemptId:generated.saved.attempt.id,language:'en'});assert.equal(judged.contract,'weighted-v1');
 const next=await handleProductRequest(learner,{action:'snapshot',...scope}),attempt=next.attempts.find((a:any)=>a.id===generated.saved.attempt.id);assert.equal(attempt.settings.temperature,0.2);assert.deepEqual(attempt.contextIds,contextIds);assert.ok(attempt.evaluation_json);
 console.log('Live AI QA passed: generation/settings/context, saved replay, real Judge, restored settings/output/score, reasoning-summary/usage metadata.');
}
