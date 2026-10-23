import {piiSignals} from './piiGuardService.js';
import {validateLearnerSettings} from './learnerSettingsService.js';
import {readGenerationTelemetry} from './governanceTelemetryService.js';
import {codelabAvailable} from './codelabLifecycleService.js';
import {createHash} from 'node:crypto';
import {validateStudioShape} from './studioValidationService.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiAccessError } from './apiAuthorizationService.js';
import { generateSavedRun, evaluateSavedRun } from './rebuildRunService.js';
import { validateRubric, DEFAULT_RUBRIC } from './weightedRubricService.js';
import type { ProductProfile } from '../types/production.js';
import { readRoster } from './googleRosterService.js';
import {listDriveFolder} from './driveFolderService.js';
import {awardPdf} from './awardDocumentService.js';
import { productionGenerate, productionEvaluate } from './productionAiService.js';
import {extractSop,extractDriveSop,embedSopChunks} from './sopIngestionService.js';

type Context = { reader: SupabaseClient; server: SupabaseClient; profile: ProductProfile };
const uuid = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) throw new ApiAccessError('A canonical UUID is required.', 422);
  return value;
};
const text = (value: unknown, max = 2000): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ApiAccessError('Invalid text field.', 422);
  return value.trim();
};
async function context(authorization: string): Promise<Context> {
  if (!/^Bearer\s+\S+$/i.test(authorization)) throw new ApiAccessError('Please sign in.', 401);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !key) throw new ApiAccessError('Server database configuration is missing.', 503);
  const reader = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const server = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error } = await reader.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  if (error || !identity.user?.email_confirmed_at || !identity.user.email) throw new ApiAccessError('Verified enterprise identity required.', 401);
  const email = identity.user.email.trim().toLowerCase();
  const { data: profile, error: profileError } = await server.from('users').select('id,email,full_name,role,auth_provider_id,profile_confirmed_at').eq('email', email).maybeSingle();
  if (profileError) throw new ApiAccessError('Profile service unavailable.', 503);
  if (!profile) throw new ApiAccessError('Your verified email is not on the provisioned roster.', 403);
  if (profile.auth_provider_id && profile.auth_provider_id !== identity.user.id) throw new ApiAccessError('Identity mapping conflict. Contact your training administrator.', 403);
  if (!profile.auth_provider_id) {
    const { data: linked, error: linkError } = await server.from('users').update({ auth_provider_id: identity.user.id }).eq('id', profile.id).is('auth_provider_id', null).select('id').maybeSingle();
    if (linkError || !linked) throw new ApiAccessError('Identity mapping changed. Please sign in again.', 409);
  }
  const { auth_provider_id: _subject, ...safeProfile } = profile;
  return { reader, server, profile: safeProfile };
}
async function result<T = any>(request: PromiseLike<{ data: T | null; error: any }>): Promise<T> {
  const { data, error } = await request;
  if (error) {
    if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error.code)) throw new ApiAccessError('The production schema upgrade has not been applied.', 503);
    throw new ApiAccessError('The database operation was not confirmed. Refresh before retrying.', 409);
  }
  return data as T;
}
async function classes(c: Context) {
  let query = c.server.from('classes').select('*,client:clients(name),course:courses(title)');
  if (c.profile.role === 'instructor') {
    const assignments = await result<any[]>(c.server.from('course_instructors').select('course_id,permission').eq('user_id', c.profile.id));
    if (!assignments.length) return [];
    query = query.in('course_id', assignments.map(a => a.course_id));
  } else if (c.profile.role === 'head') {
    const grants = await result<any[]>(c.server.from('product_class_grants').select('class_id').eq('user_id', c.profile.id));
    if (!grants.length) return [];
    query = query.in('id', grants.map(g => g.class_id));
  } else if (c.profile.role !== 'admin') {
    const learner = await result<any>(c.server.from('learners').select('id').eq('user_id', c.profile.id).maybeSingle());
    if (!learner) return [];
    const memberships = await result<any[]>(c.server.from('enrollments').select('class_id').eq('learner_id', learner.id).in('status', ['active', 'completed']));
    if (!memberships.length) return [];
    query = query.in('id', memberships.map(m => m.class_id));
  }
  let rows = await result<any[]>(query.order('created_at', { ascending: false }));
  if(c.profile.role!=='admin'){
    const domains=await result<any[]>(c.server.from('product_domains').select('client_id,domain,active'));
    const emailDomain=c.profile.email.split('@')[1];
    rows=rows.filter(row=>{const configured=domains.filter(d=>d.client_id===row.client_id);return !configured.length||configured.some(d=>d.active&&d.domain===emailDomain);});
  }
  const manageable = await Promise.all(rows.map(row => c.reader.rpc('rebuild_can_manage_class', { p_class: row.id })));
  return rows.map((row, i) => ({ ...row, client_name: row.client?.name || '', course_title: row.course?.title || '', can_manage: manageable[i].data === true || c.profile.role === 'admin' }));
}
async function classScope(c: Context, id: unknown, manage = false) {
  const selected = (await classes(c)).find(row => row.id === uuid(id));
  if (!selected || manage && !selected.can_manage) throw new ApiAccessError('This class is outside your assigned access.', 403);
  return selected;
}
async function snapshot(c: Context, classId?: string) {
  const available = await classes(c);
  const selectedClass = classId ? available.find(row => row.id === uuid(classId)) : available[0];
  if (classId && !selectedClass) throw new ApiAccessError('Class access denied.', 403);
  const empty = { profile: c.profile, classes: available, selectedClass: selectedClass || null, lessons: [], attempts: [], sops: [], messages: [], privateHints: [], learners: [], analytics: {}, controls: { state: 'active', revision: 0 }, connections: [], audit: [] };
  if (!selectedClass) return empty;
  let moduleQuery = c.server.from('course_modules').select('id').eq('course_id', selectedClass.course_id);
  if (!selectedClass.can_manage) moduleQuery = moduleQuery.eq('status', 'published');
  const modules = await result<any[]>(moduleQuery);
  let lessonQuery = c.server.from('lessons').select('*,resources:lesson_resources(*),raw_rubric:lesson_rubric_criteria(*)').in('module_id', modules.map(m => m.id));
  if (!selectedClass.can_manage) lessonQuery = lessonQuery.eq('status', 'published');
  let lessons = modules.length ? await result<any[]>(lessonQuery.order('position')) : [];
  const configs = await result<any[]>(c.server.from('product_studio').select('lesson_id,config,revision').eq('class_id', selectedClass.id));
  if(!selectedClass.can_manage)lessons=lessons.filter(l=>codelabAvailable(l.status,configs.find(row=>row.lesson_id===l.id)?.config));
  const controls = await result<any>(c.server.from('product_session_controls').select('state,revision').eq('class_id', selectedClass.id).maybeSingle());
  let attemptsQuery = c.server.from('prompt_attempts').select('*').eq('class_id', selectedClass.id).order('created_at', { ascending: false }).limit(200);
  let learnerId: string | undefined;
  if (c.profile.role === 'learner') {
    const learner = await result<any>(c.server.from('learners').select('id').eq('user_id', c.profile.id).single());
    learnerId = learner.id;
    attemptsQuery = attemptsQuery.eq('learner_id', learner.id);
  }
  const attempts = await result<any[]>(attemptsQuery);
  if(attempts.length){const runs=await result<any[]>(c.server.from('rebuild_runs').select('attempt_id,snapshot,result').in('attempt_id',attempts.map(a=>a.id)));for(const attempt of attempts){const run=runs.find(r=>r.attempt_id===attempt.id);attempt.settings=run?.snapshot?.generation_settings;attempt.contextIds=run?.snapshot?.learner_context_ids||[];attempt.tokens=run?.result?.tokens;attempt.reasoningSummary=run?.result?.reasoningSummary;attempt.groundingSources=run?.result?.groundingSources||[];attempt.searchSuggestions=run?.result?.searchSuggestions||'';}}
  const support = learnerId ? await result<any[]>(c.server.from('product_learner_support').select('lesson_id,kind').eq('learner_id', learnerId).eq('class_id', selectedClass.id)) : [];
  const enrollmentRows = await result<any[]>(c.server.from('enrollments').select('learner_id,learner:learners(id,user:users(full_name,email))').eq('class_id', selectedClass.id).eq('status', 'active'));
  const learners = enrollmentRows.filter(row => c.profile.role !== 'learner' || row.learner_id === learnerId).map(row => ({ id: row.learner_id, full_name: row.learner?.user?.full_name, email: row.learner?.user?.email }));
  // Head access is scoped here; the legacy trainer-only SOP RPC remains unchanged.
  const sopDocs = await result<any[]>(c.server.from('rebuild_sop_documents').select('id,title').eq('class_id', selectedClass.id));
  const bindings = lessons.length ? await result<any[]>(c.server.from('rebuild_sop_bindings').select('version_id,lesson_id').eq('class_id', selectedClass.id).in('lesson_id', lessons.map(l => l.id))) : [];
  const versionIds = [...new Set(bindings.map(b => b.version_id))];
  const versions = versionIds.length ? await result<any[]>(c.server.from('rebuild_sop_versions').select('id,document_id,version,content,created_at').in('id', versionIds)) : [];
  const indexed=versionIds.length?await result<any[]>(c.server.from('product_sop_chunks').select('version_id,position,page,indexed_at').in('version_id',versionIds)):[];
  const sourceMetadata=versionIds.length?await result<any[]>(c.server.from('product_sop_contributions').select('version_id,metadata').eq('class_id',selectedClass.id).eq('status','published').in('version_id',versionIds)):[];
  const sops = versions.map(v => ({ ...v, metadata:sourceMetadata.find(row=>row.version_id===v.id)?.metadata||{}, version_id: v.id, title: sopDocs.find(d => d.id === v.document_id)?.title || '', citation: `[SOP:${v.id}:v${v.version}]`, lessonIds: bindings.filter(b => b.version_id === v.id).map(b => b.lesson_id),chunks:indexed.filter(chunk=>chunk.version_id===v.id) }));
  let contributionQuery=c.server.from('product_sop_contributions').select('id,actor_id,title,lesson_id,status,metadata,created_at,version_id,review_reason,indexing_claim').eq('class_id',selectedClass.id).order('created_at',{ascending:false}).limit(100);
  if(!selectedClass.can_manage)contributionQuery=contributionQuery.eq('actor_id',c.profile.id);
  const contributions=(await result<any[]>(contributionQuery)).map(({indexing_claim,...r})=>({...r,indexing:!!indexing_claim&&r.status==='pending'}));
  const messages = c.profile.role === 'learner' ? await result<any[]>(c.reader.rpc('rebuild_workshop_inbox', { p_class: selectedClass.id })) : [];
  const privateHints = learnerId ? await result<any[]>(c.reader.from('trainer_hints').select('id,message,created_at').eq('class_id', selectedClass.id).eq('learner_id', learnerId).order('created_at', { ascending: false }).limit(20)) : [];
  const connections = selectedClass.can_manage ? await result<any[]>(c.server.from('product_sheet_connections').select('id,class_id,sheet_id,name,column_mapping,last_synced_at,status,auto_sync,last_attempt_at').eq('class_id', selectedClass.id)) : [];
  const syncLogs=selectedClass.can_manage?await result<any[]>(c.server.from('product_sync_logs').select('id,connection_id,status,processed,result,error_code,created_at,finished_at').eq('class_id',selectedClass.id).order('created_at',{ascending:false}).limit(100)):[];
  const trainerNotes=selectedClass.can_manage&&attempts.length?await result<any[]>(c.server.from('rebuild_trainer_actions').select('id,attempt_id,action,reason,created_at').in('attempt_id',attempts.map(a=>a.id)).order('created_at',{ascending:false}).limit(100)):[];
  const drafts=await result<any[]>(c.server.from('product_prompt_drafts').select('lesson_id,prompt,revision').eq('user_id',c.profile.id).eq('class_id',selectedClass.id));
  let progressQuery=c.server.from('lesson_progress').select('learner_id,lesson_id,status,attempts_count,best_score,updated_at').eq('class_id',selectedClass.id);if(learnerId)progressQuery=progressQuery.eq('learner_id',learnerId);const progress=await result<any[]>(progressQuery);
  if(learnerId)await result(c.server.rpc('product_refresh_awards',{p_class:selectedClass.id,p_learner:learnerId}));
  let awardQuery=c.server.from('product_awards').select('*').eq('class_id',selectedClass.id);
  let attendanceQuery=c.server.from('product_attendance').select('lesson_id,learner_id,present,updated_at').eq('class_id',selectedClass.id);
  if(learnerId){awardQuery=awardQuery.eq('learner_id',learnerId);attendanceQuery=attendanceQuery.eq('learner_id',learnerId);}
  const awards=await result<any[]>(awardQuery),attendance=await result<any[]>(attendanceQuery);
  let libraryQuery=c.server.from('product_prompt_library').select('id,owner_id,lesson_id,title,prompt,category,settings,variables,score,status,review_reason,created_at').eq('class_id',selectedClass.id);
  if(!['head','admin'].includes(c.profile.role))libraryQuery=libraryQuery.or(`owner_id.eq.${c.profile.id},status.eq.approved`);
  const promptLibrary=await result<any[]>(libraryQuery.order('created_at',{ascending:false}).limit(100));
  const learnerContexts=await result<any[]>(c.server.from('product_learner_context').select('id,title,lesson_id,created_at').eq('owner_id',c.profile.id).eq('class_id',selectedClass.id).order('created_at',{ascending:false}).limit(20));
  const totals = attempts.map(a => a.evaluation_json?.total).filter(v => typeof v === 'number');
  return { ...empty, promptLibrary,learnerContexts,modelInfo:{name:process.env.GEMINI_MODEL||'gemini-2.5-flash',allowed:[process.env.GEMINI_MODEL||'gemini-2.5-flash',process.env.GEMINI_FALLBACK_MODEL].filter(Boolean)},awards,attendance,contributions,syncLogs,trainerNotes,drafts,progress, controls: controls || { state: 'active', revision: 0 }, attempts: c.profile.role === 'head' ? [] : attempts, learners, sops, messages, privateHints, connections,
    lessons: lessons.map(l => {
      const config = configs.find(r => r.lesson_id === l.id);
      const { improved_prompt: solution, hints, system_instruction: system, ...safeLesson } = l;
      if (!selectedClass.can_manage) {
        safeLesson.hints = support.some(s => s.lesson_id === l.id && s.kind === 'hints') ? hints : [];
        safeLesson.improved_prompt = support.some(s => s.lesson_id === l.id && s.kind === 'solution') ? solution : '';
      }
      return { ...(selectedClass.can_manage ? l : safeLesson), studio: config ? { ...config.config, revision: config.revision } : null, rubric: config?.config?.rubric || DEFAULT_RUBRIC };
    }),
    analytics: { enrolled: enrollmentRows.length, attempts: attempts.length, evaluated: totals.length, average_score: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null, data_limit: 200, truncated: attempts.length === 200 },
  };
}
export async function handleProductRequest(authorization: string, body: any) {
  if (body?.action === 'enterpriseRequest') {
    const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)throw new ApiAccessError('Request service unavailable.',503);
    const email=text(body.email,254).toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['50 - 200 staff','200 - 1,000 staff','1,000+ staff'].includes(body.employees))throw new ApiAccessError('Invalid contact details.',422);
    const server=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    return result(server.rpc('product_submit_enterprise_request',{p_request:uuid(body.requestId),p_company:text(body.company,200),p_tax:typeof body.taxId==='string'?body.taxId.slice(0,80):'',p_employees:body.employees,p_email:email}));
  }
  if(body?.action==='enrollBasic'){
    if(!/^Bearer\s+\S+$/i.test(authorization))throw new ApiAccessError('Please sign in.',401);
    const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)throw new ApiAccessError('Server configuration unavailable.',503);
    const server=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const identity=await server.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
    const user=identity.data.user;
    if(identity.error||!user?.email_confirmed_at||!user.email||!user.app_metadata.providers?.includes('google'))throw new ApiAccessError('Verified Google identity required.',401);
    return {classId:await result(server.rpc('product_enroll_basic',{p_subject:user.id,p_email:user.email.trim().toLowerCase()}))};
  }
  const c = await context(authorization);
  if (!body || typeof body.action !== 'string') throw new ApiAccessError('Action required.', 422);
  if (body.action === 'snapshot') return snapshot(c, body.classId);
  if (body.action === 'confirmProfile') return result(c.reader.rpc('rebuild_confirm_profile', { p_full_name: text(body.fullName, 120) }));
  if (body.action === 'profileCorrection') return result(c.reader.rpc('product_request_correction', { p_request: uuid(body.requestId), p_reason: text(body.reason) }));
  if(body.action==='analytics'){
    if(c.profile.role==='learner')throw new ApiAccessError('Department reporting access required.',403);
    const allowed=await classes(c),ids=body.classId?[ (await classScope(c,body.classId)).id ]:allowed.filter(row=>!body.clientId||row.client_id===body.clientId).map(row=>row.id);
    const start=body.start?new Date(body.start):new Date('2000-01-01T00:00:00Z'),end=body.end?new Date(body.end):new Date();
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new ApiAccessError('Invalid report date range.',422);
    const report=await result<any>(c.server.rpc('product_analytics',{p_classes:ids,p_start:start.toISOString(),p_end:end.toISOString()}));
    const published=ids.length?await result<any[]>(c.server.from('product_sop_contributions').select('class_id').in('class_id',ids).eq('status','published').gte('created_at',start.toISOString()).lt('created_at',end.toISOString())):[];
    return {...report,published_sops:published.length,classes:(report.classes||[]).map((row:any)=>({...row,published_sops:published.filter(source=>source.class_id===row.id).length}))};
  }
  const cls = await classScope(c, body.classId, ['setSheetAutoSync','reviewSopPreview','saveDomain','setAccess','saveClass','reviewSop','sandboxGenerate','sandboxJudge','saveStudio', 'createLesson', 'createCohort', 'sessionControl', 'broadcast', 'privateHint', 'trainerAction', 'saveSheet', 'syncSheet', 'publishSop', 'governance'].includes(body.action));
  switch (body.action) {
    case 'savePromptLibrary': {
      const title=text(body.title,200),prompt=text(body.prompt,24000),requestId=uuid(body.requestId),lessonId=uuid(body.lessonId);
      if(piiSignals(prompt).length)throw new ApiAccessError('Remove personal information before saving.',422);
      const state=await snapshot(c,cls.id);if(!state.lessons.some((l:any)=>l.id===lessonId))throw new ApiAccessError('Lesson scope denied.',403);
      const attempt=body.attemptId?state.attempts.find((a:any)=>a.id===uuid(body.attemptId)&&a.lesson_ref_id===lessonId):null;
      if(attempt){const own=await result<any>(c.server.from('learners').select('id').eq('user_id',c.profile.id).maybeSingle());if(attempt.learner_id!==own?.id)throw new ApiAccessError('Own attempt required.',403);}
      if(attempt&&attempt.prompt_text.trim()!==prompt)throw new ApiAccessError('Score applies only to the saved attempt prompt.',409);
      if(body.attemptId&&!attempt)throw new ApiAccessError('Attempt scope denied.',403);
      const settings=validateLearnerSettings(body.settings),category=body.category?text(body.category,160):'General';
      if(piiSignals(settings.personalInstruction||'').length)throw new ApiAccessError('Remove personal information from the learner instruction.',422);
      const existing=await result<any>(c.server.from('product_prompt_library').select('*').eq('owner_id',c.profile.id).eq('request_id',requestId).maybeSingle());
      if(existing){if(existing.prompt!==prompt||existing.title!==title||existing.lesson_id!==lessonId||existing.class_id!==cls.id||existing.category!==category||JSON.stringify(validateLearnerSettings(existing.settings))!==JSON.stringify(settings)||['pending','approved','rejected'].includes(existing.status)!==(body.share===true))throw new ApiAccessError('Library request conflict.',409);return existing;}
      return result(c.server.from('product_prompt_library').insert({owner_id:c.profile.id,class_id:cls.id,lesson_id:lessonId,attempt_id:attempt?.id||null,request_id:requestId,title,prompt,category,settings,variables:state.lessons.find((l:any)=>l.id===lessonId)?.studio?.variables||[],score:attempt?.evaluation_json?.total??null,status:body.share===true?'pending':'personal'}).select('id,status').single());
    }
    case 'reviewPromptLibrary': {
      if(!['head','admin'].includes(c.profile.role))throw new ApiAccessError('Assigned department Head required.',403);
      if(!['approve','reject'].includes(body.decision))throw new ApiAccessError('Review decision required.',422);
      const row=await result(c.server.from('product_prompt_library').update({status:body.decision==='approve'?'approved':'rejected',reviewed_by:c.profile.id,review_reason:text(body.reason,1000)}).eq('id',uuid(body.entryId)).eq('class_id',cls.id).eq('status','pending').select('id').maybeSingle());
      if(!row)throw new ApiAccessError('Library review is stale.',409);return row;
    }
    case 'uploadLearnerContext': {
      const lessonId=uuid(body.lessonId),state=await snapshot(c,cls.id);
      if(!state.lessons.some((l:any)=>l.id===lessonId))throw new ApiAccessError('Lesson scope denied.',403);
      if(typeof body.base64!=='string'||body.base64.length>2800000||! /^[A-Za-z0-9+/]*={0,2}$/.test(body.base64))throw new ApiAccessError('Upload a supported file up to 2 MB.',422);
      const source=await extractSop(Buffer.from(body.base64,'base64'),text(body.filename,160));
      if(piiSignals(source.content).length)throw new ApiAccessError('Remove personal information from the uploaded file.',422);
      const hash=createHash('sha256').update(source.content).digest('hex');const previous=await result<any>(c.server.from('product_learner_context').select('id,title,created_at').eq('owner_id',c.profile.id).eq('class_id',cls.id).eq('lesson_id',lessonId).eq('content_hash',hash).maybeSingle());if(previous)return previous;
      if(!await result<boolean>(c.server.rpc('product_take_budget',{p_actor:c.profile.id,p_operation:'context.upload',p_limit:10})))throw new ApiAccessError('Upload quota exceeded.',429);
      const chunks=await embedSopChunks(source.chunks);
      return result(c.server.from('product_learner_context').upsert({content_hash:hash,owner_id:c.profile.id,class_id:cls.id,lesson_id:lessonId,title:source.metadata.filename,content:source.content,chunks},{onConflict:'owner_id,class_id,lesson_id,content_hash'}).select('id,title,created_at').single());
    }
    case 'requestSopSync': {
      const lessonId=uuid(body.lessonId),title=text(body.title,160),url=text(body.driveUrl,1000),reason=text(body.reason,1000),requestId=uuid(body.requestId);
      if(!/^https:\/\/drive\.google\.com\//.test(url)||!['normal','high'].includes(body.priority))throw new ApiAccessError('Google Drive URL and valid priority required.',422);
      const state=await snapshot(c,cls.id);if(!state.lessons.some((l:any)=>l.id===lessonId))throw new ApiAccessError('Lesson scope denied.',403);
      const prior=await result<any>(c.server.from('product_sop_contributions').select('id,metadata,class_id,lesson_id,title').eq('actor_id',c.profile.id).eq('request_id',requestId).maybeSingle());
      if(prior){if(prior.metadata?.driveUrl!==url||prior.class_id!==cls.id||prior.lesson_id!==lessonId||prior.title!==title||prior.metadata?.businessReason!==reason||prior.metadata?.priority!==body.priority)throw new ApiAccessError('SOP request conflict.',409);return prior;}
      return result(c.server.from('product_sop_contributions').insert({actor_id:c.profile.id,request_id:requestId,class_id:cls.id,lesson_id:lessonId,title,content:'Awaiting approved Drive ingestion.',chunks:[],metadata:{syncRequest:true,driveUrl:url,businessReason:reason,priority:body.priority,department:cls.department}}).select('id').single());
    }

    case 'sourceDownload':{
      const source=(await snapshot(c,cls.id)).sops.find(s=>s.id===uuid(body.versionId));
      if(!source)throw new ApiAccessError('Source access denied.',403);
      const metadata=source.metadata;
      if(metadata.storageBucket!=='product-sop-originals'||typeof metadata.storagePath!=='string')throw new ApiAccessError('No uploaded original is available for this source.',404);
      const signed=await result<any>(c.server.storage.from('product-sop-originals').createSignedUrl(metadata.storagePath,300,{download:true}));
      return {url:signed.signedUrl};
    }
    case 'saveDraft':return result(c.reader.rpc('product_save_draft',{p_class:cls.id,p_lesson:uuid(body.lessonId),p_prompt:typeof body.prompt==='string'&&body.prompt.length<=24000?body.prompt:null,p_expected_revision:body.expectedRevision}));
    case 'searchSop':{
      const lessonId=uuid(body.lessonId),lab=(await snapshot(c,cls.id)).lessons.find((l:any)=>l.id===lessonId);if(!lab)throw new ApiAccessError('Lesson scope denied.',403);
      const bindings=await result<any[]>(c.server.from('rebuild_sop_bindings').select('version_id').eq('class_id',cls.id).eq('lesson_id',lessonId)),ids=bindings.map(b=>b.version_id);
      if(!ids.length)return [];
      const chunks=await result<any[]>(c.server.from('product_sop_chunks').select('version_id,position,page,content,embedding').in('version_id',ids).limit(1000));
      let queryVector:number[]|undefined;
      if(body.query){if(!await result<boolean>(c.server.rpc('product_take_budget',{p_actor:c.profile.id,p_operation:'sop.search',p_limit:60})))throw new ApiAccessError('Search quota exceeded.',429);queryVector=(await embedSopChunks([{position:1,page:null,content:text(body.query,1000)}],'RETRIEVAL_QUERY'))[0].embedding;}
      const versions=await result<any[]>(c.server.from('rebuild_sop_versions').select('id,document_id,version').in('id',ids));const docs=await result<any[]>(c.server.from('rebuild_sop_documents').select('id,title').eq('class_id',cls.id));
      const similarity=(embedding:number[])=>{if(!queryVector)return 0;let dot=0,a=0,b=0;for(let i=0;i<768;i++){dot+=embedding[i]*queryVector[i];a+=embedding[i]**2;b+=queryVector[i]**2;}return a&&b?dot/Math.sqrt(a*b):0;};
      return chunks.map(chunk=>{const v=versions.find(v=>v.id===chunk.version_id);return {id:`${chunk.version_id}:${chunk.position}`,versionId:chunk.version_id,title:docs.find(d=>d.id===v?.document_id)?.title,page:chunk.page,content:chunk.content,citation:`[SOP:${chunk.version_id}:v${v?.version}]${chunk.page?` [Page ${chunk.page}]`:''}`,similarity:similarity(chunk.embedding)};}).sort((a,b)=>b.similarity-a.similarity).slice(0,10);
    }
    case 'saveDomain':{
      if(c.profile.role!=='admin')throw new ApiAccessError('Administrator required.',403);
      const domain=text(body.domain,253).toLowerCase().replace(/^@/,'');if(!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(domain)||typeof body.active!=='boolean')throw new ApiAccessError('Invalid domain policy.',422);
      await result(c.reader.rpc('product_save_domain',{p_class:cls.id,p_domain:domain,p_active:body.active}));return {saved:true};
    }
    case 'setAccess':return result(c.reader.rpc('product_set_class_access',{p_class:cls.id,p_email:text(body.email,254).toLowerCase(),p_role:body.role,p_permission:body.permission}));
    case 'saveClass':{
      if(!['active','upcoming','completed','archived'].includes(body.status))throw new ApiAccessError('Invalid cohort lifecycle.',422);
      const reason=text(body.reason);
      await result(c.reader.rpc('product_save_class',{p_class:cls.id,p_status:body.status,p_reason:reason}));return {saved:true};
    }
    case 'prepareSopUpload':{
      const requestId=uuid(body.requestId),lessonId=uuid(body.lessonId),filename=text(body.filename,160);
      if(!/^[A-Za-z0-9_. -]+\.(pdf|docx|xlsx|md|csv|txt)$/i.test(filename)||typeof body.size!=='number'||body.size<=0||body.size>25*1024*1024)throw new ApiAccessError('Choose a supported file up to 25 MB.',422);
      const state=await snapshot(c,cls.id);if(!state.lessons.some((l:any)=>l.id===lessonId))throw new ApiAccessError('Lesson scope denied.',403);
      if(!await result<boolean>(c.server.rpc('product_take_budget',{p_actor:c.profile.id,p_operation:'sop.upload',p_limit:10})))throw new ApiAccessError('Upload quota exceeded.',429);
      const path=`${c.profile.id}/${cls.id}/${lessonId}/${requestId}/${filename}`;
      const signed=await c.server.storage.from('product-sop-originals').createSignedUploadUrl(path,{upsert:false});
      if(signed.error||!signed.data)throw new ApiAccessError('Private upload is unavailable.',503);
      return {bucket:'product-sop-originals',path,token:signed.data.token};
    }
    case 'recordAttendance':{
      if(!cls.can_manage||typeof body.present!=='boolean')throw new ApiAccessError('Assigned editor and attendance state required.',403);
      return result(c.reader.rpc('product_record_attendance',{p_class:cls.id,p_lesson:uuid(body.lessonId),p_learner:uuid(body.learnerId),p_present:body.present,p_reason:text(body.reason,500)}));
    }
    case 'downloadAward':{
      const award=await result<any>(c.server.from('product_awards').select('*').eq('class_id',cls.id).eq('id',uuid(body.awardId)).single());
      const learner=await result<any>(c.server.from('learners').select('user_id,user:users(full_name)').eq('id',award.learner_id).single());
      if(c.profile.role==='learner'&&learner.user_id!==c.profile.id)throw new ApiAccessError('Award scope denied.',403);
      const base64=await awardPdf(award,learner.user?.full_name||'—',body.language==='vi'?'vi':'en');
      return {base64,filename:'Promptify-'+award.id+'.pdf'};
    }
    case 'listDriveFolder':{
      if(!cls.can_manage)throw new ApiAccessError('Assigned editor required to browse a Drive folder.',403);
      return listDriveFolder(text(body.url,1000));
    }
    case 'submitSop':{
      const requestId=uuid(body.requestId),lessonId=uuid(body.lessonId),title=text(body.title,160);
      const prior=await result<any>(c.server.from('product_sop_contributions').select('id,title,lesson_id,metadata').eq('actor_id',c.profile.id).eq('request_id',requestId).maybeSingle());
      if(prior){if(prior.title!==title||prior.lesson_id!==lessonId)throw new ApiAccessError('Contribution request conflict.',409);return {id:prior.id};}
      const modules=await result<any[]>(c.server.from('course_modules').select('id').eq('course_id',cls.course_id));
      const target=await result<any>(c.server.from('lessons').select('id,status').eq('id',lessonId).in('module_id',modules.map(m=>m.id)).maybeSingle());
      if(!target||!cls.can_manage&&target.status!=='published')throw new ApiAccessError('Lesson scope denied.',403);
      let source;
      if(body.driveUrl)source=await extractDriveSop(text(body.driveUrl,1000));
      else if(body.storagePath){
        const filename=text(body.filename,160),path=text(body.storagePath,500),prefix=`${c.profile.id}/${cls.id}/${lessonId}/${requestId}/`;
        if(!path.startsWith(prefix)||path!==prefix+filename||! /^[A-Za-z0-9_. -]+\.(pdf|docx|xlsx|md|csv|txt)$/i.test(filename))throw new ApiAccessError('Private source scope denied.',403);
        const download=await c.server.storage.from('product-sop-originals').download(path);
        if(download.error||!download.data)throw new ApiAccessError('Uploaded source is unavailable.',422);
        if(download.data.size>25*1024*1024)throw new ApiAccessError('SOP exceeds 25 MB.',422);
        source=await extractSop(Buffer.from(await download.data.arrayBuffer()),filename);
        source.metadata.storageBucket='product-sop-originals';source.metadata.storagePath=path;
      }
      else{if(typeof body.base64!=='string'||body.base64.length>2800000||! /^[A-Za-z0-9+/]*={0,2}$/.test(body.base64))throw new ApiAccessError('Invalid file payload.',422);source=await extractSop(Buffer.from(body.base64,'base64'),text(body.filename,160));}
      if(body.versionTag)source.metadata.versionTag=text(body.versionTag,80);
      if(body.documentId){const doc=await result<any>(c.server.from('rebuild_sop_documents').select('id').eq('class_id',cls.id).eq('id',uuid(body.documentId)).maybeSingle());if(!doc)throw new ApiAccessError('Source document scope denied.',403);}
      const row=await result<any>(c.server.from('product_sop_contributions').insert({actor_id:c.profile.id,request_id:requestId,class_id:cls.id,lesson_id:lessonId,document_id:body.documentId||null,title,...source}).select('id').single());
      await result(c.server.from('product_audit').insert({class_id:cls.id,actor_id:c.profile.id,action:'sop.submit',reason:title}));
      return row;
    }
    case 'reviewSopPreview':return result(c.server.from('product_sop_contributions').select('id,title,content,metadata,status').eq('id',uuid(body.contributionId)).eq('class_id',cls.id).single());
    case 'reviewSop':{
      const id=uuid(body.contributionId);let source=await result<any>(c.server.from('product_sop_contributions').select('*').eq('id',id).eq('class_id',cls.id).single());
      if(source.status==='published')return {versionId:source.version_id};
      if(source.status!=='pending')throw new ApiAccessError('Contribution is no longer pending.',409);
      if(body.decision==='reject'){await result(c.server.from('product_sop_contributions').update({status:'rejected',reviewed_by:c.profile.id,review_reason:text(body.reason)}).eq('id',id).eq('status','pending'));return {status:'rejected'};}
      if(body.decision!=='approve')throw new ApiAccessError('Review decision required.',422);
      if(source.metadata?.syncRequest&&!source.indexed_chunks){
        const extracted=await extractDriveSop(source.metadata.driveUrl);
        source={...source,...extracted,metadata:{...source.metadata,...extracted.metadata}};
        await result(c.server.from('product_sop_contributions').update({content:source.content,chunks:source.chunks,metadata:source.metadata}).eq('id',id).eq('status','pending'));
      }
      let chunks=source.indexed_chunks;
      if(!chunks){
        const acquired=await result<any>(c.server.from('product_sop_contributions').update({indexing_claim:crypto.randomUUID()}).eq('id',id).is('indexing_claim',null).eq('status','pending').select('id').maybeSingle());
        if(!acquired)throw new ApiAccessError('Source indexing is processing or uncertain.',409);
        chunks=await embedSopChunks(source.chunks);
        await result(c.server.from('product_sop_contributions').update({indexed_chunks:chunks}).eq('id',id));
      }
      return {versionId:await result(c.reader.rpc('product_publish_contribution',{p_contribution:id,p_chunks:chunks}))};
    }
    case 'sandboxGenerate': {
      const requestId=uuid(body.requestId),lessonId=uuid(body.lessonId),prompt=text(body.prompt,24000);
      const prior=await result<any>(c.server.from('product_sandbox_runs').select('lesson_id,class_id,prompt,result').eq('actor_id',c.profile.id).eq('request_id',requestId).maybeSingle());
      if(prior){if(prior.class_id!==cls.id||prior.lesson_id!==lessonId||prior.prompt!==prompt)throw new ApiAccessError('Sandbox request conflict.',409);if(prior.result)return prior.result;throw new ApiAccessError('Sandbox request is processing or uncertain.',409);}
      const modules=await result<any[]>(c.server.from('course_modules').select('id').eq('course_id',cls.course_id));
      const lab=await result<any>(c.server.from('lessons').select('*').eq('id',lessonId).in('module_id',modules.map(m=>m.id)).single());
      const studio=await result<any>(c.server.from('product_studio').select('config,revision').eq('class_id',cls.id).eq('lesson_id',lessonId).maybeSingle());
      const rubric=validateRubric(studio?.config?.rubric||DEFAULT_RUBRIC);
      const sops=await result<any[]>(c.reader.rpc('rebuild_class_sops',{p_class:cls.id,p_lesson:lessonId}));
      const inputContext=[lab.sample_input_context,...sops.map(s=>`${s.citation} ${s.title}\n${s.content}`)].filter(Boolean).join('\n\n');
      if(inputContext.length>100000)throw new ApiAccessError('Sandbox source context exceeds the supported limit.',422);
      const savedSnapshot={scenario:lab.scenario,taskRequirement:lab.task_goal,inputContext,systemInstruction:lab.system_instruction,rubric,revision:studio?.revision||0};
      await result(c.server.from('product_sandbox_runs').insert({actor_id:c.profile.id,request_id:requestId,class_id:cls.id,lesson_id:lessonId,prompt,snapshot:savedSnapshot}));
      const generated=await productionGenerate({prompt,systemInstruction:lab.system_instruction,inputContext,classId:cls.id,lessonId});
      await result(c.server.from('product_sandbox_runs').update({result:generated}).eq('actor_id',c.profile.id).eq('request_id',requestId));
      return generated;
    }
    case 'sandboxJudge': {
      const requestId=uuid(body.requestId);
      const run=await result<any>(c.server.from('product_sandbox_runs').select('*').eq('actor_id',c.profile.id).eq('request_id',requestId).eq('class_id',cls.id).single());
      if(run.evaluation)return run.evaluation;
      if(!run.result)throw new ApiAccessError('Sandbox output has not been saved.',409);
      const claim=crypto.randomUUID();
      const acquired=await result<any>(c.server.from('product_sandbox_runs').update({judge_claim:claim}).eq('actor_id',c.profile.id).eq('request_id',requestId).is('judge_claim',null).select('request_id').maybeSingle());
      if(!acquired)throw new ApiAccessError('Sandbox Judge is processing or uncertain.',409);
      const evaluation=await productionEvaluate({learnerPrompt:run.prompt,generatedOutput:run.result.output,scenario:run.snapshot.scenario,taskRequirement:run.snapshot.taskRequirement,controlData:run.snapshot.inputContext,lessonRubric:run.snapshot.rubric,language:body.language==='en'?'en':'vi'});
      await result(c.server.from('product_sandbox_runs').update({evaluation}).eq('actor_id',c.profile.id).eq('request_id',requestId).eq('judge_claim',claim));
      return evaluation;
    }
    case 'unlockSupport': {
      if(body.kind==='solution'&&text(body.reflection,1000).length<20)throw new ApiAccessError('Write at least 20 characters of reflection before requesting the solution.',422);
      return result(c.reader.rpc('product_unlock_support_reflected',{p_class:cls.id,p_lesson:uuid(body.lessonId),p_kind:body.kind,p_reflection:body.kind==='solution'?body.reflection:null}));
    }
    case 'generate': return generateSavedRun(authorization, { classId: cls.id, lessonId: uuid(body.lessonId), requestId: uuid(body.requestId), prompt: text(body.prompt, 24000), settings:body.settings,contextIds:body.contextIds });
    case 'judge': return evaluateSavedRun(authorization, { classId: cls.id, lessonId: uuid(body.lessonId), attemptId: uuid(body.attemptId), language: body.language === 'en' ? 'en' : 'vi' });
    case 'saveStudio': {
      validateStudioShape(body.config);
      try { validateRubric(body.config?.rubric); } catch (error) { throw new ApiAccessError((error as Error).message, 422); }
      if (!['DRAFT', 'ACTIVE', 'SCHEDULED', 'ARCHIVED'].includes(body.config.state)) throw new ApiAccessError('Invalid lifecycle state.', 422);
      const start = Date.parse(body.config.startTime), end = Date.parse(body.config.endTime);
      if (body.config.state === 'SCHEDULED' && (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)) throw new ApiAccessError('Scheduled labs require a valid start and end time.', 422);
      return result(c.reader.rpc('product_save_studio', { p_class: cls.id, p_lesson: uuid(body.lessonId), p_expected_revision: body.expectedRevision, p_config: body.config, p_fields: body.fields }));
    }
    case 'createLesson': return result(c.reader.rpc('product_create_lesson', { p_class: cls.id, p_title: text(body.title, 200), p_key: text(body.code, 100) }));
    case 'createCohort': return result(c.reader.rpc('product_create_cohort', { p_class: cls.id, p_code: text(body.code, 80), p_department: text(body.department, 120), p_start: body.start, p_end: body.end }));
    case 'sessionControl': return result(c.reader.rpc('product_session_control', { p_class: cls.id, p_state: body.state, p_expected_revision: body.expectedRevision, p_reason: text(body.reason) }));
    case 'broadcast': return result(c.reader.rpc('rebuild_broadcast', { p_class: cls.id, p_request: uuid(body.requestId), p_message: text(body.message) }));
    case 'privateHint': {
      const learner = await result<any>(c.server.from('enrollments').select('learner_id').eq('class_id', cls.id).eq('learner_id', uuid(body.learnerId)).eq('status', 'active').maybeSingle());
      if (!learner) throw new ApiAccessError('Learner is not active in this class.', 403);
      return result(c.reader.from('trainer_hints').insert({ class_id: cls.id, learner_id: learner.learner_id, message: text(body.message) }).select('id').single());
    }
    case 'trainerAction': {
      const target = await result<any>(c.server.from('prompt_attempts').select('id').eq('id', uuid(body.attemptId)).eq('class_id', cls.id).maybeSingle());
      if (!target) throw new ApiAccessError('Attempt is outside this class.', 403);
      return result(c.reader.rpc('rebuild_record_trainer_action', { p_attempt: target.id, p_request: uuid(body.requestId), p_action: body.kind, p_reason: text(body.reason) }));
    }
    case 'publishSop': return result(c.reader.rpc('rebuild_publish_sop', { p_class: cls.id, p_document: body.documentId ? uuid(body.documentId) : null, p_title: text(body.title, 160), p_content: text(body.content, 100000), p_lesson: uuid(body.lessonId) }));
    case 'saveSheet': {
      const match = String(body.url).match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
      if (!match) throw new ApiAccessError('A Google Sheets URL is required.', 422);
      return result(c.reader.rpc('product_save_sheet', { p_class: cls.id, p_sheet: match[1], p_name: text(body.name, 160), p_mapping: body.mapping }));
    }
    case 'setSheetAutoSync': {
      if(typeof body.enabled!=='boolean')throw new ApiAccessError('A synchronization setting is required.',422);
      return result(c.reader.rpc('product_set_sheet_auto_sync',{p_class:cls.id,p_connection:uuid(body.connectionId),p_enabled:body.enabled}));
    }
    case 'syncSheet': {
      const connection = await result<any>(c.server.from('product_sheet_connections').select('id,sheet_id,column_mapping').eq('id', uuid(body.connectionId)).eq('class_id', cls.id).single());
      const requestId=uuid(body.requestId),prior=await result<any>(c.server.from('product_sync_logs').select('*').eq('actor_id',c.profile.id).eq('request_id',requestId).maybeSingle());
      if(prior){if(prior.connection_id!==connection.id)throw new ApiAccessError('Sync request conflict.',409);if(prior.status==='success')return prior.result;throw new ApiAccessError('Sync request is processing or failed; inspect the saved log.',409);}
      const log=await result<any>(c.server.from('product_sync_logs').insert({connection_id:connection.id,class_id:cls.id,actor_id:c.profile.id,request_id:requestId,status:'running'}).select('id').single());
      try{
        const rows = await readRoster(connection.sheet_id, connection.column_mapping, cls.department);
        const imported:any = await result(c.reader.rpc('product_import_roster', { p_class: cls.id, p_request: requestId, p_rows: rows }));
        await result(c.server.from('product_sheet_connections').update({ status: 'synced', last_synced_at: new Date().toISOString() }).eq('id', connection.id));
        await result(c.server.from('product_sync_logs').update({status:'success',processed:imported.processed,result:imported,finished_at:new Date().toISOString()}).eq('id',log.id));return imported;
      }catch(error){await c.server.from('product_sync_logs').update({status:'failed',error_code:error instanceof ApiAccessError?String(error.statusCode):'500',finished_at:new Date().toISOString()}).eq('id',log.id);throw error;}
    }
    case 'requestRotation': {
      if(c.profile.role!=='admin'||!['gemini','sheets'].includes(body.provider))throw new ApiAccessError('Administrator and valid provider required.',403);
      const secret=body.provider==='gemini'?process.env.GEMINI_API_KEY:process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      if(!secret)throw new ApiAccessError('Provider configuration unavailable.',503);
      return result(c.reader.rpc('product_request_rotation',{p_class:cls.id,p_provider:body.provider,p_fingerprint:createHash('sha256').update(secret).digest('hex'),p_reason:text(body.reason,1000)}));
    }
    case 'approveRotation': {
      if(c.profile.role!=='admin')throw new ApiAccessError('Administrator required.',403);
      const pending=await result<any>(c.server.from('product_rotation_requests').select('class_id').eq('id',uuid(body.rotationId)).single());
      if(pending.class_id!==cls.id)throw new ApiAccessError('Rotation class scope denied.',403);
      return result(c.reader.rpc('product_approve_rotation',{p_request:body.rotationId}));
    }
    case 'governance': {
      if (c.profile.role !== 'admin') throw new ApiAccessError('System administrator required.', 403);
      return { telemetry:await readGenerationTelemetry(c.server,cls.id),rotations:await result(c.server.from('product_rotation_requests').select('id,provider,status,requested_by,reason,created_at,applied_at,deployment_id,approvals:product_rotation_approvals(user_id,created_at)').eq('class_id',cls.id).order('created_at',{ascending:false}).limit(30)),ai: { configured: Boolean(process.env.GEMINI_API_KEY), model: process.env.GEMINI_MODEL || null,fallback:process.env.GEMINI_FALLBACK_MODEL||null }, sheets: { configured: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) }, secrets: 'server-only', domains:await result(c.server.from('product_domains').select('client_id,domain,active,updated_at').eq('client_id',cls.client_id)),controls: await result(c.server.from('product_session_controls').select('class_id,state,revision,updated_at').eq('class_id',cls.id)), audit: await result(c.server.from('product_audit').select('id,class_id,actor_id,action,reason,created_at').eq('class_id',cls.id).order('created_at', { ascending: false }).limit(100)) };
    }
    default: throw new ApiAccessError('This action has no production handler.', 422);
  }
}
