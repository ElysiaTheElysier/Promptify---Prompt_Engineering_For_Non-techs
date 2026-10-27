import fs from 'node:fs';
import {EventEmitter} from 'node:events';
import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests,sqlTransaction} from '../src/services/cloudPostgresService';
import {configureFirebaseVerifierForTests} from '../src/services/firebaseServerIdentityService';

// Shared offline fixture for async Judge end-to-end tests: real SQL (001+005+012+013+015+020+021), real resolvers,
// injected Firebase verifier (counts calls). Callers set NODE_ENV/DATABASE_URL/JUDGE_* before importing services.
export const id=(n:number,k=1)=>`${String(n).padStart(8,'0')}-0000-4000-8000-${String(k).padStart(12,'0')}`;
export async function judgeFixture(learners=2,attempts=6,rubric?:unknown[]){
  const db=new PGlite();
  for(const f of ['001_baseline.sql','005_department_correction_auto_approval.sql','012_judge_jobs.sql','013_provider_admission.sql','015_judge_dispatch_fencing.sql','020_judge_stage_results.sql','021_dynamic_rubric.sql'])await db.exec(fs.readFileSync('gcp/sql/'+f,'utf8'));
  const counts={firebase:0,statements:0,stageReads:0};
  let tail=Promise.resolve();
  configureSqlPoolForTests({async connect(){
    const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;
    return {async query(sql:string,values:any[]=[]){counts.statements++;if(/FROM public\."product_judge_stage_results"/.test(sql)&&/^SELECT/i.test(sql.trim()))counts.stageReads++;const r=await db.query(sql,values);return {rows:JSON.parse(JSON.stringify(r.rows))};},release};
  }});
  await db.query("INSERT INTO clients(id,name,industry) VALUES($1,'Client','Testing')",[id(4)]);
  await db.query("INSERT INTO courses(id,title,publication_status) VALUES($1,'Course','published'),($2,'Other','published')",[id(5),id(15)]);
  await db.query("INSERT INTO classes(id,class_code,course_id,client_id,department,start_date,end_date) VALUES($1,'CLASS-E',$2,$3,'Offline',now()-interval '1 day',now()+interval '1 day')",[id(6),id(5),id(4)]);
  await db.query("INSERT INTO course_modules(id,course_id,title,status) VALUES($1,$2,'Module','published'),($3,$4,'Other','published')",[id(8),id(5),id(18),id(15)]);
  await db.query("INSERT INTO lessons(id,module_id,lesson_key,title,status) VALUES($1,$2,'L1','Lesson','published'),($3,$4,'L9','Foreign','published')",[id(9),id(8),id(19),id(18)]);
  // A real generation snapshot, so the production Judge path (productionEvaluate) can grade it.
  const snapshot=JSON.stringify({scenario:'Fictional ticket',task_goal:'Classify the ticket with a cited SOP section.',sample_input_context:'[SOP:QA:v1] Section 1.',
    production_rubric:rubric??(await import('../src/services/weightedRubricService')).DEFAULT_RUBRIC});
  const actors:Record<string,any>={};
  for(let u=1;u<=learners;u++){
    const user=id(100,u),subject=id(200,u),learner=id(300,u);
    await db.query("INSERT INTO users(id,email,full_name,role,auth_provider_id,profile_confirmed_at) VALUES($1,$2,'Learner','learner',$3,now())",[user,`e${u}@example.test`,subject]);
    await db.query('INSERT INTO learners(id,user_id) VALUES($1,$2)',[learner,user]);
    // Learner 1..n-1 enrolled; the last one is not (authorization negative case).
    if(u<learners)await db.query('INSERT INTO enrollments(learner_id,class_id) VALUES($1,$2)',[learner,id(6)]);
    actors['tok-'+u]={subject,email:`e${u}@example.test`,firebaseUid:'f'+u,userId:user};
    for(let g=1;g<=attempts;g++){const a=id(1000+g,u);
      await db.query("INSERT INTO prompt_attempts(id,learner_id,class_id,lesson_id,lesson_ref_id,attempt_number,prompt_text,ai_output) VALUES($1,$2,$3,'L1',$4,$5,'Task prompt','Saved output')",[a,learner,id(6),id(9),g]);
      await db.query("INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot,attempt_id) VALUES($1,$2,$3,$4,'Task prompt',$5,$6)",[subject,a,id(6),id(9),snapshot,a]);}
  }
  // Same shape as production: a (counted) revocation-checked verify, then the identity-binding transaction.
  configureFirebaseVerifierForTests(async token=>{counts.firebase++;await sqlTransaction(undefined,c=>c.query('SELECT 1'));const a=actors[token];if(!a)throw Error('bad token');return a;});
  return {db,counts,body:(u:number,g:number)=>({classId:id(6),lessonId:id(9),attemptId:id(1000+g,u)})};
}
export class StreamRes extends EventEmitter{status=0;headers:Record<string,string>={};headersSent=false;writableEnded=false;chunks:string[]=[];t0=performance.now();at:Array<{ev:string;ms:number;data:any}>=[];
  writeHead(s:number,h:Record<string,string>={}){this.status=s;this.headersSent=true;for(const [k,v] of Object.entries(h))this.headers[k.toLowerCase()]=v;return this;}
  flushHeaders(){}
  write(c:string){this.chunks.push(c);const ev=/event: (\w+)/.exec(c)?.[1];if(ev)this.at.push({ev,ms:Math.round(performance.now()-this.t0),data:JSON.parse(/data: (.*)/.exec(c)![1])});return true;}
  end(c?:string){if(c)this.chunks.push(c);this.writableEnded=true;}
  get events(){return this.at.map(e=>e.ev);}}
export const reply=(v:unknown)=>({output:JSON.stringify(v),model:'gemini-3.8-flash',tokens:1});
export const stageOf=(payload:any)=>{const i=JSON.parse(payload.contents[0].parts[0].text);return i.criterion?'criterion:'+i.criterion.key:i.stage;};
export const answer=(payload:any)=>{const i=JSON.parse(payload.contents[0].parts[0].text);
  return i.stage==='supervisor'?reply({taskAttempt:true,summaryEn:'Task.',summaryVi:'Bài.'}):reply({key:i.criterion.key,score:i.criterion.maxScore,reasonEn:'Supported.',reasonVi:'Có căn cứ.',improvementEn:'Keep.',improvementVi:'Giữ.'});};
