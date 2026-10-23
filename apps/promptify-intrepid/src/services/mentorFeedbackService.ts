import {sqlTransaction} from './cloudPostgresService';
import {ApiAccessError} from './apiAuthorizationService';
export const UI_EVENTS=['run','compare','hint','solution','resource','save_template','scaffold','sop_search','active_time'] as const;
const run=<T=any>(query:string,values:any[]=[])=>sqlTransaction(undefined,async db=>(await db.query(query,values)).rows as T[]);
const optional=async<T>(read:()=>Promise<T>,fallback:T)=>{try{return await read();}catch(e){if((e as any).code==='42P01')return fallback;throw e;}};
export async function feedbackSnapshot(actor:string,classId?:string){
 return optional(async()=>{const [profiles,configs,activity,workbooks,engines]=await Promise.all([
 run('SELECT employee_id,office_location FROM public.product_profile_details WHERE user_id=$1',[actor]),
 classId?run('SELECT config FROM public.product_workspace_preferences WHERE class_id=$1',[classId]):Promise.resolve([]),
 classId?run("SELECT lesson_id,sum(seconds)::int seconds FROM public.product_ui_events WHERE actor_id=$1 AND class_id=$2 AND event='active_time' GROUP BY lesson_id",[actor,classId]):Promise.resolve([]),
 classId?run('SELECT manifest FROM public.product_roster_workbooks WHERE class_id=$1',[classId]):Promise.resolve([]),
 run("SELECT to_regprocedure('public.product_badge_matches(jsonb,uuid,uuid,uuid)') IS NOT NULL available")
 ]);
 const profile=profiles[0]||{},config=configs[0]?.config||{},ruleEngine=engines[0].available;
 return {awardRulesAvailable:ruleEngine,profileDetails:profile,workspacePreferences:config,activity,rosterMaterials:workbooks.flatMap(w=>w.manifest.sops||[]),rosterDepartments:[...new Set(workbooks.flatMap(w=>w.manifest.departments||[]))],feedbackAvailable:true};},{awardRulesAvailable:false,profileDetails:{},workspacePreferences:{},activity:[],rosterMaterials:[],rosterDepartments:[],feedbackAvailable:false});
}
export async function saveProfileDetails(actor:string,body:any){
 const employee=String(body.employeeId??'').trim(),office=String(body.officeLocation??'').trim();if(employee.length>120||office.length>160||/[\r\n\x00]/.test(employee+office))throw new ApiAccessError('Invalid profile fields.',422);
 await run('INSERT INTO public.product_profile_details(user_id,employee_id,office_location) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET employee_id=$2,office_location=$3,updated_at=now()',[actor,employee,office]);return {saved:true};
}
export async function saveWorkspacePreferences(classId:string,body:any){
 const contact=String(body.contactEmail??'').trim().toLowerCase();if(contact&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))throw new ApiAccessError('Invalid support email.',422);
 const hourlyCost=body.hourlyCost===null||body.hourlyCost===''?null:Number(body.hourlyCost);if(hourlyCost!==null&&(!Number.isFinite(hourlyCost)||hourlyCost<0||hourlyCost>100000))throw new ApiAccessError('Invalid hourly cost.',422);
 const config={contactEmail:contact,contactName:String(body.contactName??'').slice(0,120),hourlyCost,currency:String(body.currency||'USD').slice(0,8)};
 await run('INSERT INTO public.product_workspace_preferences(class_id,config) VALUES($1,$2::jsonb) ON CONFLICT(class_id) DO UPDATE SET config=$2::jsonb,updated_at=now()',[classId,JSON.stringify(config)]);return config;
}
export async function publicSupport(classId:string){return optional(async()=>{const row=(await run('SELECT p.config FROM public.product_workspace_preferences p JOIN public.classes c ON c.id=p.class_id WHERE p.class_id=$1 AND c.status=$2',[classId,'active']))[0];return {contactEmail:row?.config?.contactEmail||'',contactName:row?.config?.contactName||''};},{contactEmail:'',contactName:''});}
export async function accessRequest(id:string,subject:string,email:string,classId:string|null,message:string){
 if(message.trim().length<10||message.length>1500)throw new ApiAccessError('Describe the access issue in 10–1500 characters.',422);
 return sqlTransaction(undefined,async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[subject]);
  const existing=(await db.query('SELECT subject,email,class_id,message,status FROM public.product_access_requests WHERE id=$1',[id])).rows[0];
  if(existing){if(existing.subject!==subject||existing.email!==email||existing.class_id!==classId||existing.message!==message.trim())throw new ApiAccessError('Request ID was already used for different content.',409);return {id,status:existing.status};}
  const recent=(await db.query("SELECT count(*)::int total FROM public.product_access_requests WHERE subject=$1 AND created_at>now()-interval '1 hour'",[subject])).rows[0];
  if(recent.total>=5)throw new ApiAccessError('Too many support requests.',429);
  const inserted=await db.query('INSERT INTO public.product_access_requests(id,subject,email,class_id,message) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING RETURNING id',[id,subject,email,classId,message.trim()]);
  if(!inserted.rows.length)throw new ApiAccessError('Request conflict.',409);
  return {id,status:'pending'};
 });
}
export async function recordUiEvents(actor:string,classId:string,events:any[]){
 if(!Array.isArray(events)||events.length>20)throw new ApiAccessError('Invalid events batch.',422);
 for(const item of events){if(!UI_EVENTS.includes(item.event)||!/^[0-9a-f-]{36}$/i.test(item.id)||item.lessonId&&!/^[0-9a-f-]{36}$/i.test(item.lessonId)||!Number.isInteger(item.seconds??0)||(item.seconds??0)<0||(item.seconds??0)>60)throw new ApiAccessError('Invalid event.',422);}
 await sqlTransaction(undefined,async db=>{await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[actor]);for(const item of events){if(item.lessonId){const scope=await db.query('SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE l.id=$1 AND c.id=$2',[item.lessonId,classId]);if(!scope.rows.length)throw new ApiAccessError('Event lesson scope denied.',403);}
 const seconds=item.event==='active_time'?(item.seconds??0):0;
 await db.query("INSERT INTO public.product_ui_events(id,actor_id,class_id,lesson_id,event,seconds) SELECT $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::integer WHERE (SELECT count(*) FROM public.product_ui_events WHERE actor_id=$2 AND created_at>now()-interval '1 minute')<120 AND ($5<>'active_time' OR coalesce((SELECT sum(seconds) FROM public.product_ui_events WHERE actor_id=$2 AND event='active_time' AND created_at>now()-interval '1 minute'),0)+$6::integer<=60) ON CONFLICT(id) DO NOTHING",[item.id,actor,classId,item.lessonId||null,item.event,seconds]);}});return {accepted:true};
}
export async function recordOutcome(actor:string,classId:string,lessonId:string,body:any){
 const before=Number(body.beforeMinutes),after=Number(body.afterMinutes),frequency=Number(body.repetitionsPerWeek);
 if(![before,after,frequency].every(Number.isFinite)||before<=0||before>1440||after<0||after>1440||frequency<=0||frequency>1000)throw new ApiAccessError('Invalid outcome measurement.',422);
 return sqlTransaction(undefined,async db=>{
  const inserted=await db.query('INSERT INTO public.product_outcome_measurements(id,actor_id,class_id,lesson_id,before_minutes,after_minutes,repetitions_per_week) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING RETURNING id',[body.requestId,actor,classId,lessonId,before,after,frequency]);
  if(!inserted.rows.length){const old=(await db.query('SELECT actor_id,class_id,lesson_id,before_minutes,after_minutes,repetitions_per_week FROM public.product_outcome_measurements WHERE id=$1',[body.requestId])).rows[0];
   if(!old||old.actor_id!==actor||old.class_id!==classId||old.lesson_id!==lessonId||Number(old.before_minutes)!==before||Number(old.after_minutes)!==after||Number(old.repetitions_per_week)!==frequency)throw new ApiAccessError('Request ID was already used for different content.',409);
  }return {saved:true};
 });
}
export async function feedbackAnalytics(ids:string[],start:string,end:string){return optional(async()=>{
 const events=await run('SELECT event,count(*)::int clicks,count(DISTINCT actor_id)::int users,sum(seconds)::int seconds FROM public.product_ui_events WHERE class_id=ANY($1::uuid[]) AND created_at>=$2 AND created_at<$3 GROUP BY event',[ids,start,end]);
 const outcomes=await run("SELECT o.class_id,count(*)::int samples,sum((before_minutes-after_minutes)*repetitions_per_week/60) hours_saved_week FROM (SELECT DISTINCT ON(actor_id,class_id,lesson_id) * FROM public.product_outcome_measurements WHERE class_id=ANY($1::uuid[]) AND created_at>=$2 AND created_at<$3 ORDER BY actor_id,class_id,lesson_id,created_at DESC,id DESC) o GROUP BY o.class_id",[ids,start,end]);
 const preferences=await run('SELECT class_id,config FROM public.product_workspace_preferences WHERE class_id=ANY($1::uuid[])',[ids]);
 const estimates=outcomes.map(row=>{const config=preferences.find(p=>p.class_id===row.class_id)?.config||{};return {...row,annual_estimate:typeof config.hourlyCost==='number'?Number(row.hours_saved_week)*config.hourlyCost*52:null,currency:config.currency||'USD'};});
 return {events,outcomes:estimates,measurementSource:'learner-reported',available:true};},{events:[],outcomes:[],measurementSource:'learner-reported',available:false});}

export async function accessInbox(classId:string,admin:boolean){return optional(()=>run("SELECT id,email,message,status,created_at FROM public.product_access_requests WHERE class_id=$1 OR ($2 AND class_id IS NULL) ORDER BY created_at DESC LIMIT 100",[classId,admin]),[]);}
export async function resolveAccessRequest(classId:string,id:string,admin:boolean){await run("UPDATE public.product_access_requests SET status='resolved' WHERE id=$1 AND (class_id=$2 OR ($3 AND class_id IS NULL))",[id,classId,admin]);return {saved:true};}

export async function requireAwardRuleEngine(){const rows=await run("SELECT to_regprocedure('public.product_badge_matches(jsonb,uuid,uuid,uuid)') IS NOT NULL available");if(!rows[0].available)throw new ApiAccessError('Structured badge rules require the staging schema update.',503);}
