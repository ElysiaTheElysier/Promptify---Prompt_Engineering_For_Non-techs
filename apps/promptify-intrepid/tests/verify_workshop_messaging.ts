import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests,sqlTransaction} from '../src/services/cloudPostgresService';
import {classHintRequests,learnerHintRequests,createHintRequest,reviewHintRequest} from '../src/services/workshopSupportService';

// Workshop messaging: broadcasts/private hints reach the learner screens; hint requests (017) need facilitator approval,
// which unlocks hints and replies privately. Real SQL (001 + 005 + 017) and server-rendered components. Offline only.
process.env.NODE_ENV='test';
process.env.DATABASE_URL='offline-test-only';
const db=new PGlite();
for(const file of ['001_baseline.sql','005_department_correction_auto_approval.sql'])await db.exec(fs.readFileSync('gcp/sql/'+file,'utf8'));
let tail=Promise.resolve();
configureSqlPoolForTests({async connect(){
  const prior=tail;let release!:()=>void;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
  return {async query(sql:string,values:any[]=[]){const result=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(result.rows))};},release};
}});
const id=(n:number)=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000017`;
await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,'learner@example.test','Learner One','learner',$2,now()),($3,'removed@example.test','Removed','learner',$4,now()),($5,'admin@example.test','Admin','admin',$6,now())",[id(1),id(2),id(10),id(11),id(20),id(21)]);
await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2),($3,$4)',[id(3),id(1),id(12),id(10)]);
await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published')",[id(5)]);
await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-A',$2,$3,'Offline',now()-interval '1 day',now()+interval '30 day')",[id(6),id(5),id(4)]);
await db.query("INSERT INTO enrollments(learner_id,class_id,status) VALUES($1,$2,'active'),($3,$2,'removed')",[id(3),id(6),id(12)]);
await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published')",[id(8),id(5)]);
await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status,position) VALUES($1,$2,'L1','Classify requests','published',1),($3,$2,'L2','Summarise policy','published',2)",[id(9),id(8),id(19)]);
const reason='My output does not cite the SOP section.';

// 1. Before 017: reads degrade to empty, writes report the missing upgrade.
assert.deepEqual(await learnerHintRequests(id(3),id(6)),[]);
assert.deepEqual(await classHintRequests(id(6)),[]);
await assert.rejects(()=>createHintRequest(id(1),id(6),id(9),id(40),reason),(e:any)=>e.statusCode===503);
await db.exec(fs.readFileSync('gcp/sql/017_hint_requests.sql','utf8'));

// 2. Learner request: validated, idempotent per request ID, one open request per lesson.
await assert.rejects(()=>createHintRequest(id(1),id(6),id(9),id(40),'too short'),(e:any)=>e.statusCode===422);
await assert.rejects(()=>createHintRequest(id(10),id(6),id(9),id(41),reason),(e:any)=>e.statusCode===403,'removed learner cannot ask');
const first=await createHintRequest(id(1),id(6),id(9),id(40),reason);
assert.equal(first.status,'pending');assert.equal(first.reason,reason);
assert.equal((await createHintRequest(id(1),id(6),id(9),id(40),reason)).id,first.id,'same request ID replays');
// 017 alone keeps one open request per lesson: a second one is refused clearly, not as a server error.
await assert.rejects(()=>createHintRequest(id(1),id(6),id(9),id(42),'Another reason for the same lesson'),(e:any)=>e.statusCode===409);
await db.exec(fs.readFileSync('gcp/sql/018_hint_requests_multiple.sql','utf8'));
const extra=await createHintRequest(id(1),id(6),id(9),id(42),'Another reason for the same lesson');
assert.notEqual(extra.id,first.id,'018: several open requests per lesson');
await assert.rejects(()=>createHintRequest(id(1),id(6),id(19),id(40),reason),(e:any)=>e.statusCode===409,'request ID bound to its lesson');
const second=await createHintRequest(id(1),id(6),id(19),id(43),'Not sure how to structure the summary table.');
let queue=await classHintRequests(id(6));
assert.deepEqual(queue.map(r=>[r.lessonTitle,r.status,r.learnerName]),[['Classify requests','pending','Learner One'],['Classify requests','pending','Learner One'],['Summarise policy','pending','Learner One']],'pending oldest first');
for(let n=0;n<3;n++)await createHintRequest(id(1),id(6),id(9),id(60+n),'Still stuck on step '+(n+2)+' of the task.');
await assert.rejects(()=>createHintRequest(id(1),id(6),id(9),id(65),'One request too many for now.'),(e:any)=>e.statusCode===429,'at most 5 open per lesson');
await db.query("DELETE FROM product_hint_requests WHERE request_id IN ($1,$2,$3,$4)",[id(42),id(60),id(61),id(62)]);

// 3. Approve: hints unlocked, private reply sent, audited; a second decision is refused.
const approved=await reviewHintRequest(id(6),first.id,'approve','Check section 3.2 of the SOP.',id(20));
assert.equal(approved.status,'approved');assert.equal(approved.note,'Check section 3.2 of the SOP.');assert.ok(approved.decidedAt);
assert.equal((await db.query("SELECT count(*)::int n FROM product_learner_support WHERE learner_id=$1 AND lesson_id=$2 AND kind='hints'",[id(3),id(9)])).rows[0].n,1);
assert.equal((await db.query('SELECT count(*)::int n FROM trainer_hints')).rows[0].n,0,'the hint lives in the request, not as an inbox message');
await assert.rejects(()=>reviewHintRequest(id(6),first.id,'decline','',id(20)),(e:any)=>e.statusCode===409);
await assert.rejects(()=>reviewHintRequest(id(99),second.id,'approve','',id(20)),(e:any)=>e.statusCode===404,'class-scoped');
await assert.rejects(()=>reviewHintRequest(id(6),second.id,'maybe' as any,'',id(20)),(e:any)=>e.statusCode===422);
// 4. Decline without a note: default bilingual reply, hints stay locked, learner may ask again.
assert.equal((await reviewHintRequest(id(6),second.id,'decline','',id(20))).status,'declined');
assert.equal((await db.query("SELECT count(*)::int n FROM product_learner_support WHERE lesson_id=$1",[id(19)])).rows[0].n,0);
assert.equal((await db.query('SELECT count(*)::int n FROM trainer_hints')).rows[0].n,0);
assert.deepEqual((await db.query("SELECT action FROM product_audit WHERE action LIKE 'hint.%' ORDER BY created_at")).rows.map((r:any)=>r.action),['hint.approve','hint.decline']);
const retry=await createHintRequest(id(1),id(6),id(19),id(44),'Tried a table but columns are still wrong.');
assert.equal(retry.status,'pending');
queue=await classHintRequests(id(6));
assert.deepEqual(queue.map(r=>r.status),['pending','declined','approved']);
assert.deepEqual((await learnerHintRequests(id(3),id(6))).map(r=>r.status),['pending','declined','approved']);
// Rollback keeps unlocked hints and replies.
await db.exec(fs.readFileSync('gcp/sql/rollback/018_hint_requests_multiple.sql','utf8'));
await db.exec(fs.readFileSync('gcp/sql/rollback/017_hint_requests.sql','utf8'));
assert.equal((await db.query("SELECT count(*)::int n FROM product_learner_support WHERE kind='hints'")).rows[0].n,1);
await db.exec(fs.readFileSync('gcp/sql/017_hint_requests.sql','utf8'));
await db.exec(fs.readFileSync('gcp/sql/018_hint_requests_multiple.sql','utf8'));

// 5. Broadcast receipt: inbox shows read_at only after the learner's own acknowledgement.
await db.query('INSERT INTO workshop_messages(id,class_id,trainer_id,request_id,message) VALUES($1,$2,$3,$4,$5)',[id(30),id(6),id(20),id(31),'Check the SOP citation format']);
const learner={subject:id(2),email:'learner@example.test',firebaseUid:'offline'};
const inbox=async()=>sqlTransaction(learner,async c=>(await c.query('SELECT public.rebuild_workshop_inbox($1) AS inbox',[id(6)])).rows[0].inbox);
assert.equal((await inbox())[0].read_at,null);
await sqlTransaction(learner,async c=>c.query('SELECT public.rebuild_ack_workshop_message($1)',[id(30)]));
assert.ok((await inbox())[0].read_at,'acknowledged broadcast is marked read');
await assert.rejects(()=>sqlTransaction({subject:id(11),email:'removed@example.test',firebaseUid:'x'},async c=>c.query('SELECT public.rebuild_ack_workshop_message($1)',[id(30)])),'removed learner cannot acknowledge');

// 6. Components, server-rendered with real React (CSS stubbed).
const req=createRequire(import.meta.url);
const React=req('react'),{renderToStaticMarkup}=req('react-dom/server');
const mod={exports:{} as any};
const source=ts.transpileModule(fs.readFileSync('src/components/rebuild/WorkshopMessaging.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const storage=new Map<string,string>();
vm.runInNewContext(source,{module:mod,exports:mod.exports,require:(name:string)=>name==='react'?React:name.includes('productI18nService')?{useProductLanguage:()=> 'en'}:name.includes('UiFeedback')?{confirmAction:async()=>({ok:true,reason:''})}:name.endsWith('.css')?{}:req(name),
 localStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)},Date,JSON,Array,Set,document:{getElementById:()=>null},crypto:{randomUUID:()=> 'r'}});
const {LearnerInbox,WorkshopSupportQueue,HintRequestPanel,HintRequestAlert}=mod.exports;
const render=(type:any,props:any)=>renderToStaticMarkup(React.createElement(type,props));
const noop=async()=>{};
const now=new Date().toISOString(),old=new Date(Date.now()-8*86400000).toISOString();
const base:any={profile:{id:'u1',role:'learner'},selectedClass:{id:'c1',can_manage:false},
 messages:[{id:'m1',message:'Broadcast to everyone',created_at:now,read_at:null},{id:'m2',message:'Already read',created_at:now,read_at:now},{id:'m3',message:'Old broadcast',created_at:old,read_at:null}],
 privateHints:[{id:'h1',message:'Private nudge for you',created_at:now},{id:'h2',message:'Dismissed hint',created_at:now}],hintRequests:[]};
storage.set('promptify-dismissed-hints:u1',JSON.stringify(['h2']));
const html=render(LearnerInbox,{snapshot:base,busy:false,onAction:noop});
for(const text of ['Messages from your facilitator','Broadcast to everyone','Private nudge for you','Whole class','Private hint','Mark as read'])assert.ok(html.includes(text),text);
for(const text of ['Already read','Old broadcast','Dismissed hint'])assert.equal(html.includes(text),false,text);
assert.equal(render(LearnerInbox,{snapshot:{...base,messages:[],privateHints:[]},busy:false,onAction:noop}),'');
assert.equal(render(LearnerInbox,{snapshot:{...base,profile:{id:'t',role:'admin'}},busy:false,onAction:noop}),'');

// Hints tab: the form is always available (multiple requests); history shows each status and facilitator note.
const lesson:any={id:'l1',hints:[]};
const req1={id:'r1',learnerId:'x',lessonId:'l1',reason:'I am stuck on citations',status:'pending',note:null,createdAt:now,decidedAt:null};
let panel=render(HintRequestPanel,{snapshot:base,lesson,busy:false,onAction:noop});
assert.ok(panel.includes('Request a hint')&&panel.includes('Send hint request')&&panel.includes('at least 10 characters'));
assert.ok(/<button[^>]*disabled=""[^>]*>Send hint request/.test(panel),'empty reason cannot be sent');
panel=render(HintRequestPanel,{snapshot:{...base,hintRequests:[req1]},lesson,busy:false,onAction:noop});
assert.ok(panel.includes('Waiting for your facilitator')&&panel.includes('I am stuck on citations')&&panel.includes('Ask for another hint'),'pending request does not block another');
panel=render(HintRequestPanel,{snapshot:{...base,hintRequests:[{...req1,id:'r2',reason:'Second question',createdAt:now},{...req1,status:'approved',note:'Look at section 3.2'}]},lesson:{...lesson,hints:['Cite the SOP id']},busy:false,onAction:noop});
assert.ok(panel.includes('✓ Approved')&&panel.includes('Hint from your facilitator')&&panel.includes('Look at section 3.2')&&panel.includes('Second question')&&panel.includes('Ask for another hint'));
assert.ok(/hint-history-approved[\s\S]*Hint from your facilitator[\s\S]*Look at section 3\.2/.test(panel),'facilitator hint is rendered inside the approved request');
assert.ok(panel.includes('<details class="hint-panel-hints">')&&panel.includes('Cite the SOP id'),'written lesson hints stay available');
panel=render(HintRequestPanel,{snapshot:{...base,hintRequests:[{...req1,status:'approved',note:null}]},lesson:{...lesson,hints:['Cite the SOP id']},busy:false,onAction:noop});
assert.ok(/hint-history-approved[\s\S]*Lesson hints[\s\S]*Cite the SOP id/.test(panel),'approval without a note shows the lesson hints inside the request');
panel=render(HintRequestPanel,{snapshot:{...base,hintRequests:[{...req1,status:'declined',note:'Try once more first'}]},lesson,busy:false,onAction:noop});
assert.ok(panel.includes('✗ Not approved')&&panel.includes('Try once more first')&&panel.includes('Send hint request')&&!panel.includes('Lesson hints')&&!panel.includes('Hint from your facilitator'));
panel=render(HintRequestPanel,{snapshot:{...base,hintRequests:Array.from({length:5},(_,i)=>({...req1,id:'p'+i}))},lesson,busy:false,onAction:noop});
assert.ok(panel.includes('5 requests are already waiting'),'client mirrors the 5-open limit');

// Trainer queue + pop-up.
const trainer:any={...base,profile:{id:'t',role:'admin'},selectedClass:{id:'c1',can_manage:true},supportRequests:queue};
const queueHtml=render(WorkshopSupportQueue,{snapshot:trainer,busy:false,onAction:noop});
for(const text of ['Hint requests','Learner One','Summarise policy','Tried a table but columns are still wrong.','Approve &amp; show hints','Decline','Recent decisions (2)'])assert.ok(queueHtml.includes(text),text);
assert.ok(render(WorkshopSupportQueue,{snapshot:{...trainer,supportRequests:[]},busy:false,onAction:noop}).includes('No hint request is waiting'));
assert.equal(render(WorkshopSupportQueue,{snapshot:base,busy:false,onAction:noop}),'','queue is for class editors only');
const alert=render(HintRequestAlert,{snapshot:trainer,currentUi:14,onOpen:noop,busy:false,onAction:noop});
assert.ok(alert.includes('1 hint request waiting')&&alert.includes('Open Workshop')&&alert.includes('role="alert"'));
assert.ok(alert.includes('Tried a table but columns are still wrong.')&&alert.includes('Approve &amp; show hints')&&alert.includes('Decline'),'review directly in the pop-up');
assert.ok(render(HintRequestAlert,{snapshot:trainer,currentUi:9,onOpen:noop}).includes('Show requests'));
// "Later" is remembered across reloads for the same waiting set; a new request brings the pop-up back.
const pendingIds=queue.filter(r=>r.status==='pending').map(r=>r.id).join(',');
storage.set('promptify-hint-alert-later:t:c1',pendingIds);
assert.equal(render(HintRequestAlert,{snapshot:trainer,currentUi:14,onOpen:noop}),'','dismissed set stays hidden after reload');
assert.ok(render(HintRequestAlert,{snapshot:{...trainer,supportRequests:[{...queue[0],id:'new-request'},...queue]},currentUi:14,onOpen:noop}).includes('hint requests waiting'),'a new request shows the pop-up again');
storage.delete('promptify-hint-alert-later:t:c1');
assert.equal(render(HintRequestAlert,{snapshot:{...trainer,supportRequests:queue.filter(r=>r.status!=='pending')},currentUi:14,onOpen:noop}),'');
assert.equal(render(HintRequestAlert,{snapshot:base,currentUi:4,onOpen:noop}),'','learners never see the trainer pop-up');

// 7. Wiring: inbox on both learner screens, queue on Workshop, pop-up in the shared layout, no learner Solution tab.
const app=fs.readFileSync('src/components/rebuild/ProductionApp.tsx','utf8'),workspace=fs.readFileSync('src/components/rebuild/ProductionWorkspaceV7.tsx','utf8');
assert.ok(app.includes('if(currentUi===4&&snapshot)return scoped(<><LearnerInbox'));
assert.ok(app.includes('return scoped(<><LearnerInbox snapshot={snapshot} busy={busy} onAction={action}/><ProductionWorkspace'));
// The queue renders inside the Workshop screen, under its header.
assert.ok(app.includes('onInspect={id=>{setLearnerId(id);navigate(10);}}><WorkshopSupportQueue snapshot={snapshot} busy={busy} onAction={action}/></ProductionWorkshopSource>'));
assert.ok(app.includes('<HintRequestAlert snapshot={snapshot} currentUi={currentUi} onOpen={()=>navigate(9)} busy={busy} onAction={action}/>'));
assert.equal(workspace.includes("['solution',"),false,'Solution tab removed');
assert.equal(workspace.includes("unlock('hints')"),false,'no self-unlock of hints');
assert.ok(workspace.includes('<HintRequestPanel'));
const server=fs.readFileSync('src/services/productionServerService.ts','utf8');
assert.ok(server.includes("if(c.profile.role==='learner')throw new ApiAccessError('Hints are now requested from your facilitator"));
console.log('verify_workshop_messaging: PASS');
