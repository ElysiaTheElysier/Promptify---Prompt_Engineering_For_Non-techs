import {generationAsyncEnabled} from './generationQueueService';
import {requireWorkspaceSource,requireWorkspaceFileUrl} from './workspaceSourcePolicyService';
import {driveFolderId} from './driveFolderService';
import {withServiceScope,sqlTransaction} from './cloudPostgresService';
import {bindPromptVariables} from './promptVariableService';
import {readRosterSource,finishWorkbookSync} from './rosterWorkbookService';
import {requireAwardRuleEngine,accessInbox,resolveAccessRequest,feedbackSnapshot,saveProfileDetails,saveWorkspacePreferences,publicSupport,accessRequest,recordUiEvents,recordOutcome,feedbackAnalytics} from './mentorFeedbackService';
import {resolveClassLesson} from './classLessonConfigService.js';
import {vertexEnabled} from './vertexAiService';
import {readWarehouseAnalytics} from './cloudAnalyticsService';
import {searchWarehouseSop} from './cloudBigQueryService';
import {piiSignals} from './piiGuardService.js';
import {validateLearnerSettings} from './learnerSettingsService.js';
import {readGenerationTelemetry} from './governanceTelemetryService.js';
import {codelabAvailable} from './codelabLifecycleService.js';
import {createHash} from 'node:crypto';
import {validateStudioShape} from './studioValidationService.js';
import {classHintRequests,learnerHintRequests,createHintRequest,reviewHintRequest} from './workshopSupportService';
import {accessExpiryEnabled,assertWritableAccess,learnerAccess,aiSessions,sessionTokenCap,resetAiSession,setAccessExpiry,classAccessExpiries,lessonInClass,ACCESS_EXPIRY_WARNING_DAYS} from './learnerSafeguardService';
/** TC-AUTH-04: learner actions refused once class access has expired (reads, drafts and telemetry stay available). */
const READ_ONLY_BLOCKED=new Set(['generate','judge','savePromptLibrary','uploadLearnerContext','submitSop','prepareSopUpload','requestSopSync','unlockSupport','recordOutcome','resetAiSession','requestHint']);
import {createDatabaseClient,requireCloudDatabase,type CloudDatabaseClient} from './cloudDatabaseService';
import { ApiAccessError } from './apiAuthorizationService.js';
import { generateSavedRun, evaluateSavedRun, enqueueJudge, judgeStatus, generationStatus } from './rebuildRunService.js';
import { judgeAsyncEnabled } from './judgeQueueService.js';
import { validateRubric, DEFAULT_RUBRIC } from './weightedRubricService.js';
import type { ProductProfile } from '../types/production.js';
import { readRoster } from './googleRosterService.js';
import {listDriveFolder} from './driveFolderService.js';
import {awardData,renderCertificate} from './awardDocumentService.js';
import { productionGenerate, productionEvaluate } from './productionAiService.js';
import {extractSop,extractDriveSop,embedSopChunks} from './sopIngestionService.js';
import {indexPendingContribution} from './sopIndexingService.js';
import {inspectWorkspaceSource} from './workspaceInspectionService';

type Context = { reader: CloudDatabaseClient; server: CloudDatabaseClient; profile: ProductProfile; classList?:Promise<any[]> };
const uuid = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) throw new ApiAccessError('A canonical UUID is required.', 422);
  return value;
};
const text = (value: unknown, max = 2000): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ApiAccessError('Invalid text field.', 422);
  return value.trim();
};
function originalSnapshotPointer(current:Record<string,any>,stored:Record<string,any>){
 return {storageBucket:stored.storageBucket,storagePath:stored.storagePath,
  ...(stored.snapshotGeneration?{snapshotGeneration:stored.snapshotGeneration}:{}),
  ...(!current.sourceMimeType&&stored.sourceMimeType?{sourceMimeType:stored.sourceMimeType}:{}),
  ...(!current.snapshotKind&&stored.snapshotKind?{snapshotKind:stored.snapshotKind}:{})};
}
async function context(authorization: string): Promise<Context> {
  if (!/^Bearer\s+\S+$/i.test(authorization)) throw new ApiAccessError('Please sign in.', 401);
  try{requireCloudDatabase();}catch{throw new ApiAccessError('Cloud SQL server configuration is missing.',503);}
  const reader=createDatabaseClient(authorization),server=createDatabaseClient();
  const { data: identity, error } = await reader.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  if (error && ['ECONNRESET','ECONNREFUSED','ETIMEDOUT','ENOTFOUND','EAI_AGAIN','08001','08006','28P01','53300','57P01'].includes(String((error as any).code))) {
    throw new ApiAccessError('Identity service is temporarily unavailable. Retry without signing out.', 503);
  }
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
    if(error.code==='P0001'&&error.message==='AI run quota exceeded')throw new ApiAccessError('Your AI run limit has been reached (40 per hour, 200 per day). Try again after the limit resets.',429);
    if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error.code)) throw new ApiAccessError('The production schema upgrade has not been applied.', 503);
    throw new ApiAccessError('The database operation was not confirmed. Refresh before retrying.', 409);
  }
  return data as T;
}
async function classes(c: Context) {
 return c.classList??=readClasses(c);
}
async function readClasses(c: Context) {return withServiceScope(()=>readClassesScoped(c));}
async function readClassesScoped(c: Context) {
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
  const manageable = c.profile.role==='admin'?rows.map(()=>({data:true})):await Promise.all(rows.map(row => c.reader.rpc('rebuild_can_manage_class', { p_class: row.id })));
  return rows.map((row, i) => ({ ...row, client_name: row.client?.name || '', course_title: row.course?.title || '', can_manage: manageable[i].data === true || c.profile.role === 'admin' }));
}
async function classScope(c: Context, id: unknown, manage = false) {
  const selected = (await classes(c)).find(row => row.id === uuid(id));
  if (!selected || manage && !selected.can_manage) throw new ApiAccessError('This class is outside your assigned access.', 403);
  return selected;
}
async function departmentOptions(c: Context, available: any[]) {
  // Names only: requesting a correction never grants class or SOP access.
  const clientIds = [...new Set(available.map(row => row.client_id))];
  if (!clientIds.length) return [];
  const rows = await result<any[]>(c.server.from('classes').select('department').in('client_id', clientIds));
  return [...new Set(rows.map(row => row.department.trim()).filter(Boolean))].sort();
}
async function snapshot(c: Context, classId?: string, onboarding = false) {
  const [available,latestCorrection] = await Promise.all([classes(c),result<any[]>(c.server.from('product_profile_corrections').select('target_class_id').eq('user_id',c.profile.id).eq('auto_approved',true).order('created_at',{ascending:false}).limit(1))]);
  const preferred=available.find(row=>row.id===latestCorrection[0]?.target_class_id);
  const selectedClass = classId ? available.find(row => row.id === uuid(classId)) : preferred||available[0];
  if (classId && !selectedClass) throw new ApiAccessError('Class access denied.', 403);
  const [departments,feedback]=await Promise.all([onboarding||!c.profile.profile_confirmed_at?departmentOptions(c,available):Promise.resolve(undefined),feedbackSnapshot(c.profile.id,selectedClass?.id)]);
  const empty = { ...feedback,departments, profile: c.profile, classes: available, selectedClass: selectedClass || null, lessons: [], attempts: [], sops: [], messages: [], privateHints: [], learners: [], analytics: {}, controls: { state: 'active', revision: 0 }, connections: [], audit: [] };
  if (!selectedClass || onboarding || !c.profile.profile_confirmed_at) return empty;
  return withServiceScope(async()=>{
  let moduleQuery = c.server.from('course_modules').select('id').eq('course_id', selectedClass.course_id);
  if (!selectedClass.can_manage) moduleQuery = moduleQuery.eq('status', 'published');
  const [modules,configs,controls]=await Promise.all([result<any[]>(moduleQuery),result<any[]>(c.server.from('product_studio').select('lesson_id,config,revision').eq('class_id',selectedClass.id)),result<any>(c.server.from('product_session_controls').select('state,revision').eq('class_id',selectedClass.id).maybeSingle())]);
  let lessonQuery = c.server.from('lessons').select('*,resources:lesson_resources(*),raw_rubric:lesson_rubric_criteria(*)').in('module_id', modules.map(m => m.id));
  let lessons = modules.length ? await result<any[]>(lessonQuery.order('position')) : [];
  lessons=lessons.map(l=>resolveClassLesson(l,configs.find(row=>row.lesson_id===l.id)?.config));
  const accessTier=selectedClass.class_code==='PUBLIC-BASIC'?'BASIC Free':'ADVANCE Paid';
  const lockedLessons=!selectedClass.can_manage?lessons.filter(l=>l.status==='published'&&!['DRAFT','ARCHIVED'].includes(configs.find(row=>row.lesson_id===l.id)?.config?.state)&&!codelabAvailable(l.status,configs.find(row=>row.lesson_id===l.id)?.config,Date.now(),accessTier)).map(l=>{const config=configs.find(row=>row.lesson_id===l.id)?.config;return {accessTier:config?.awards?.accessTier||accessTier,lockReason:accessTier==='BASIC Free'&&config?.awards?.accessTier==='ADVANCE Paid'?'tier':'schedule',id:l.id,title:l.title,lesson_key:l.lesson_key,pillar:config?.pillar||'',startTime:config?.startTime||'',endTime:config?.endTime||'',state:config?.state||''};}):[];
  if(!selectedClass.can_manage)lessons=lessons.filter(l=>codelabAvailable(l.status,configs.find(row=>row.lesson_id===l.id)?.config,Date.now(),accessTier));
  let attemptsQuery = c.server.from('prompt_attempts').select('*').eq('class_id', selectedClass.id).order('created_at', { ascending: false }).limit(200);
  let learnerId: string | undefined;
  if (c.profile.role === 'learner') {
    const learner = await result<any>(c.server.from('learners').select('id').eq('user_id', c.profile.id).single());
    learnerId = learner.id;
    attemptsQuery = attemptsQuery.eq('learner_id', learner.id);
  }
  let contributionQuery=c.server.from('product_sop_contributions').select('id,actor_id,title,lesson_id,status,metadata,created_at,version_id,review_reason,indexing_claim').eq('class_id',selectedClass.id).order('created_at',{ascending:false}).limit(100);
  if(!selectedClass.can_manage)contributionQuery=contributionQuery.eq('actor_id',c.profile.id);
  let progressQuery=c.server.from('lesson_progress').select('learner_id,lesson_id,status,attempts_count,best_score,updated_at').eq('class_id',selectedClass.id);if(learnerId)progressQuery=progressQuery.eq('learner_id',learnerId);
  let libraryQuery=c.server.from('product_prompt_library').select('id,owner_id,lesson_id,title,prompt,category,settings,variables,score,status,review_reason,created_at').eq('class_id',selectedClass.id);
  if(c.profile.role==='head')libraryQuery=libraryQuery.or(`owner_id.eq.${c.profile.id},status.eq.pending,status.eq.approved`);
  else if(c.profile.role!=='admin')libraryQuery=libraryQuery.or(`owner_id.eq.${c.profile.id},status.eq.approved`);
  // All branches retain their original actor/class/lesson filters. The bounded SQL pool limits concurrency.
  const [attempts,support,enrollmentRows,sopDocs,bindings,rawContributions,messages,privateHints,connections,syncLogs,drafts,progress,promptLibrary,learnerContexts]=await Promise.all([
    result<any[]>(attemptsQuery),
    learnerId?result<any[]>(c.server.from('product_learner_support').select('lesson_id,kind').eq('learner_id',learnerId).eq('class_id',selectedClass.id)):Promise.resolve([]),
    result<any[]>(c.server.from('enrollments').select('learner_id,learner:learners(id,user:users(full_name,email))').eq('class_id',selectedClass.id).eq('status','active')),
    result<any[]>(c.server.from('rebuild_sop_documents').select('id,title').eq('class_id',selectedClass.id)),
    lessons.length?result<any[]>(c.server.from('rebuild_sop_bindings').select('version_id,lesson_id').eq('class_id',selectedClass.id).in('lesson_id',lessons.map(l=>l.id))):Promise.resolve([]),
    result<any[]>(contributionQuery),
    c.profile.role==='learner'?result<any[]>(c.reader.rpc('rebuild_workshop_inbox',{p_class:selectedClass.id})):Promise.resolve([]),
    learnerId?result<any[]>(c.reader.from('trainer_hints').select('id,message,created_at').eq('class_id',selectedClass.id).eq('learner_id',learnerId).order('created_at',{ascending:false}).limit(20)):Promise.resolve([]),
    selectedClass.can_manage?result<any[]>(c.server.from('product_sheet_connections').select('id,class_id,sheet_id,name,column_mapping,last_synced_at,status,auto_sync,last_attempt_at').eq('class_id',selectedClass.id)):Promise.resolve([]),
    selectedClass.can_manage?result<any[]>(c.server.from('product_sync_logs').select('id,connection_id,status,processed,result,error_code,created_at,finished_at').eq('class_id',selectedClass.id).order('created_at',{ascending:false}).limit(100)):Promise.resolve([]),
    result<any[]>(c.server.from('product_prompt_drafts').select('lesson_id,prompt,revision').eq('user_id',c.profile.id).eq('class_id',selectedClass.id)),
    result<any[]>(progressQuery),result<any[]>(libraryQuery.order('created_at',{ascending:false}).limit(100)),
    result<any[]>(c.server.from('product_learner_context').select('id,title,lesson_id,created_at').eq('owner_id',c.profile.id).eq('class_id',selectedClass.id).order('created_at',{ascending:false}).limit(20))
  ]);
  const learners=enrollmentRows.filter(row=>c.profile.role!=='learner'||row.learner_id===learnerId).map(row=>({id:row.learner_id,full_name:row.learner?.user?.full_name,email:row.learner?.user?.email}));
  const contributions=rawContributions.map(({indexing_claim,...r})=>({...r,indexing:!!indexing_claim&&r.status==='pending'}));
  const versionIds=[...new Set(bindings.map(b=>b.version_id))];
  const [runs,trainerNotes,versions,indexed,sourceMetadata]=await Promise.all([
    attempts.length?result<any[]>(c.server.from('rebuild_runs').select('attempt_id,snapshot,result').in('attempt_id',attempts.map(a=>a.id))):Promise.resolve([]),
    selectedClass.can_manage&&attempts.length?result<any[]>(c.server.from('rebuild_trainer_actions').select('id,attempt_id,action,reason,created_at').in('attempt_id',attempts.map(a=>a.id)).order('created_at',{ascending:false}).limit(100)):Promise.resolve([]),
    versionIds.length?result<any[]>(c.server.from('rebuild_sop_versions').select('id,document_id,version,content,created_at').in('id',versionIds)):Promise.resolve([]),
    versionIds.length?result<any[]>(c.server.from('product_sop_chunks').select('version_id,position,page,indexed_at').in('version_id',versionIds)):Promise.resolve([]),
    versionIds.length?result<any[]>(c.server.from('product_sop_contributions').select('version_id,metadata').eq('class_id',selectedClass.id).eq('status','published').in('version_id',versionIds)):Promise.resolve([])
  ]);
  // JUDGE_MODE=async: ungraded attempts carry their job state so the Workspace can resume polling after reload.
  // Skipped in sync mode (migration 012 may not exist); a lookup failure never breaks the snapshot.
  if(judgeAsyncEnabled()){
    const ungraded=attempts.filter(a=>!a.evaluation_json).map(a=>a.id);
    if(ungraded.length){try{const jobs=await result<any[]>(c.server.from('product_judge_jobs').select('attempt_id,status,expires_at').in('attempt_id',ungraded));
      for(const job of jobs){const attempt=attempts.find(a=>a.id===job.attempt_id);if(attempt)attempt.judge_status=['queued','running','retry_wait'].includes(job.status)&&Date.parse(job.expires_at)<=Date.now()?'expired':job.status;}
    }catch{}}
  }
  for(const attempt of attempts){const run=runs.find(r=>r.attempt_id===attempt.id);attempt.settings=run?.snapshot?.generation_settings;attempt.contextIds=run?.snapshot?.learner_context_ids||[];attempt.variableValues=run?.snapshot?.prompt_variable_values||{};attempt.promptTemplate=run?.snapshot?.prompt_template||attempt.prompt_text;attempt.tokens=run?.result?.tokens;attempt.reasoningSummary=run?.result?.reasoningSummary;attempt.groundingSources=run?.result?.groundingSources||[];attempt.searchSuggestions=run?.result?.searchSuggestions||'';}
  const sops=versions.map(v=>({...v,metadata:sourceMetadata.find(row=>row.version_id===v.id)?.metadata||{},version_id:v.id,title:sopDocs.find(d=>d.id===v.document_id)?.title||'',citation:`[SOP:${v.id}:v${v.version}]`,lessonIds:bindings.filter(b=>b.version_id===v.id).map(b=>b.lesson_id),chunks:indexed.filter(chunk=>chunk.version_id===v.id)}));
  // Award refresh must complete before its dependent read.
  if(learnerId)await result(c.server.rpc('product_refresh_awards',{p_class:selectedClass.id,p_learner:learnerId}));
  let awardQuery=c.server.from('product_awards').select('*').eq('class_id',selectedClass.id),attendanceQuery=c.server.from('product_attendance').select('lesson_id,learner_id,present,updated_at').eq('class_id',selectedClass.id);
  if(learnerId){awardQuery=awardQuery.eq('learner_id',learnerId);attendanceQuery=attendanceQuery.eq('learner_id',learnerId);}
  const [awards,attendance]=await Promise.all([result<any[]>(awardQuery),result<any[]>(attendanceQuery)]);
  const isLearner=c.profile.role==='learner';
  const [access,sessions,expiries,supportQueue,ownHintRequests]=await Promise.all([isLearner?learnerAccess(c.profile.id,selectedClass.id):Promise.resolve(undefined),isLearner?aiSessions(c.profile.id,selectedClass.id):Promise.resolve([]),selectedClass.can_manage&&accessExpiryEnabled()?classAccessExpiries(selectedClass.id):Promise.resolve({} as Record<string,string>),selectedClass.can_manage?classHintRequests(selectedClass.id):Promise.resolve([]),learnerId?learnerHintRequests(learnerId,selectedClass.id):Promise.resolve([])]);
  const totals = attempts.map(a => a.evaluation_json?.total).filter(v => typeof v === 'number');
  return { ...empty, lockedLessons,promptLibrary,learnerContexts,modelInfo:{name:process.env.GEMINI_MODEL||'gemini-2.5-flash',allowed:[process.env.GEMINI_MODEL||'gemini-2.5-flash',process.env.GEMINI_FALLBACK_MODEL].filter(Boolean)},awards,attendance,contributions,syncLogs,trainerNotes,drafts,progress, controls: controls || { state: 'active', revision: 0 }, attempts: c.profile.role === 'head' ? [] : attempts, learners:learners.map(row=>({...row,access_expires_at:expiries[row.id]||null})), sops, learnerAccess:access&&{...access,warningDays:ACCESS_EXPIRY_WARNING_DAYS}, aiSessions:sessions, aiSessionCap:isLearner?sessionTokenCap():0, accessExpiryEnabled:selectedClass.can_manage&&accessExpiryEnabled(), supportRequests:supportQueue, hintRequests:ownHintRequests, messages, privateHints, connections,
    lessons: lessons.map(l => {
      const config = configs.find(r => r.lesson_id === l.id);
      const { improved_prompt: solution, hints, system_instruction: system, ...safeLesson } = l;
      if (!selectedClass.can_manage) {
        safeLesson.hints = support.some(s => s.lesson_id === l.id && s.kind === 'hints') ? hints : [];
        safeLesson.improved_prompt = support.some(s => s.lesson_id === l.id && s.kind === 'solution') ? solution : '';
      }
      return { ...(selectedClass.can_manage ? l : safeLesson), studio: config ? { ...config.config, ...(selectedClass.can_manage?{}:{lessonOverrides:undefined}), revision: config.revision } : null, rubric: config?.config?.rubric || DEFAULT_RUBRIC };
    }),
    analytics: { enrolled: enrollmentRows.length, attempts: attempts.length, evaluated: totals.length, average_score: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null, data_limit: 200, truncated: attempts.length === 200 },
  };
  });
}
export async function handleProductRequest(authorization: string, body: any) {
  if(body?.action==='supportConfig')return publicSupport(uuid(body.classId));
  if(body?.action==='accessRequest'){const identity=await createDatabaseClient().auth.getUser(authorization.replace(/^Bearer\s+/i,''));const user=identity.data.user;if(identity.error||!user?.email_confirmed_at||!user.email)throw new ApiAccessError('Verified Google identity required.',401);return accessRequest(uuid(body.requestId),user.id,user.email,body.classId?uuid(body.classId):null,text(body.message,1500));}
  if (body?.action === 'enterpriseRequest') {
    try{requireCloudDatabase();}catch{throw new ApiAccessError('Request service unavailable.',503);}
    const email=text(body.email,254).toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['50 - 200 staff','200 - 1,000 staff','1,000+ staff'].includes(body.employees))throw new ApiAccessError('Invalid contact details.',422);
    const server=createDatabaseClient();
    return result(server.rpc('product_submit_enterprise_request',{p_request:uuid(body.requestId),p_company:text(body.company,200),p_tax:typeof body.taxId==='string'?body.taxId.slice(0,80):'',p_employees:body.employees,p_email:email}));
  }
  if(body?.action==='enrollBasic'){
    if(!/^Bearer\s+\S+$/i.test(authorization))throw new ApiAccessError('Please sign in.',401);
    try{requireCloudDatabase();}catch{throw new ApiAccessError('Cloud SQL server configuration unavailable.',503);}
    const server=createDatabaseClient();
    const identity=await server.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
    const user=identity.data.user;
    if(identity.error||!user?.email_confirmed_at||!user.email||!user.app_metadata.providers?.includes('google'))throw new ApiAccessError('Verified Google identity required.',401);
    return {classId:await result(server.rpc('product_enroll_basic',{p_subject:user.id,p_email:user.email.trim().toLowerCase()}))};
  }
  const c = await context(authorization);
  if (!body || typeof body.action !== 'string') throw new ApiAccessError('Action required.', 422);
  if (body.action === 'snapshot') return snapshot(c, body.classId, body.onboarding === true);
  if(body.action==='saveProfileDetails')return saveProfileDetails(c.profile.id,body);
  if (body.action === 'confirmProfile') return result(c.reader.rpc('rebuild_confirm_profile', { p_full_name: text(body.fullName, 120) }));
  if(body.action==='departmentCorrections'){if(c.profile.role!=='admin')throw new ApiAccessError('L&D administrator access required.',403);return result(c.server.from('product_profile_corrections').select('id,reason,status,assigned_department,requested_department,auto_approved,created_at,user:users(full_name,email)').order('created_at',{ascending:false}).limit(100));}
  if(body.action==='profileCorrection'&&body.department!==undefined)return result(c.reader.rpc('product_auto_correct_department',{p_request:uuid(body.requestId),p_source:uuid(body.sourceClassId),p_department:text(body.department,120),p_reason:text(body.reason,1800),p_full_name:text(body.fullName,120)}));
  if (body.action === 'profileCorrection') return result(c.reader.rpc('product_request_correction', { p_request: uuid(body.requestId), p_reason: text(body.reason) }));
  if(body.action==='analytics'){
    if(c.profile.role==='learner')throw new ApiAccessError('Department reporting access required.',403);
    const allowed=await classes(c),ids=body.classId?[ (await classScope(c,body.classId)).id ]:allowed.filter(row=>!body.clientId||row.client_id===body.clientId).map(row=>row.id);
    const start=body.start?new Date(body.start):new Date('2000-01-01T00:00:00Z'),end=body.end?new Date(body.end):new Date();
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new ApiAccessError('Invalid report date range.',422);
    const feedback=await feedbackAnalytics(ids,start.toISOString(),end.toISOString());
    if(process.env.GCP_ANALYTICS_MODE==='bigquery')return {...await readWarehouseAnalytics(ids,start.toISOString(),end.toISOString()),feedback};
    const report=await result<any>(c.server.rpc('product_analytics',{p_classes:ids,p_start:start.toISOString(),p_end:end.toISOString()}));
    const published=ids.length?await result<any[]>(c.server.from('product_sop_contributions').select('class_id').in('class_id',ids).eq('status','published').gte('created_at',start.toISOString()).lt('created_at',end.toISOString())):[];
    return {...report,feedback,published_sops:published.length,classes:(report.classes||[]).map((row:any)=>({...row,published_sops:published.filter(source=>source.class_id===row.id).length}))};
  }
  const cls = await classScope(c, body.classId, ['backfillDriveOriginal','saveWorkspacePreferences','accessRequests','reviewAccessRequest','setSheetAutoSync','reviewSopPreview','saveDomain','setAccess','saveClass','reviewSop','sandboxGenerate','sandboxJudge','saveStudio', 'createLesson', 'createCohort', 'sessionControl', 'broadcast', 'privateHint', 'trainerAction', 'saveSheet', 'syncSheet', 'publishSop', 'governance','setAccessExpiry','reviewHintRequest','promoteLearner'].includes(body.action));
  if(c.profile.role==='learner'&&accessExpiryEnabled()&&READ_ONLY_BLOCKED.has(body.action))await assertWritableAccess(c.profile.id,cls.id);
  switch (body.action) {
    case 'accessRequests':return accessInbox(cls.id,c.profile.role==='admin');
    case 'reviewAccessRequest':return resolveAccessRequest(cls.id,uuid(body.requestId),c.profile.role==='admin');
    case 'saveWorkspacePreferences':return saveWorkspacePreferences(cls.id,body);
    case 'uiEvents':return recordUiEvents(c.profile.id,cls.id,body.events);
    case 'recordOutcome':{const lessonId=uuid(body.lessonId),state=await snapshot(c,cls.id);if(!state.lessons.some((l:any)=>l.id===lessonId))throw new ApiAccessError('Lesson scope denied.',403);return recordOutcome(c.profile.id,cls.id,lessonId,{...body,requestId:uuid(body.requestId)});}

    case 'savePromptLibrary': {
      const title=text(body.title,200),prompt=text(body.prompt,24000),requestId=uuid(body.requestId),lessonId=uuid(body.lessonId);
      if(piiSignals(prompt).length)throw new ApiAccessError('Remove personal information before saving.',422);
      const state=await snapshot(c,cls.id);if(!state.lessons.some((l:any)=>l.id===lessonId))throw new ApiAccessError('Lesson scope denied.',403);
      const attempt=body.attemptId?state.attempts.find((a:any)=>a.id===uuid(body.attemptId)&&a.lesson_ref_id===lessonId):null;
      if(attempt){const own=await result<any>(c.server.from('learners').select('id').eq('user_id',c.profile.id).maybeSingle());if(attempt.learner_id!==own?.id)throw new ApiAccessError('Own attempt required.',403);}
      if(attempt&&attempt.prompt_text.trim()!==bindPromptVariables(prompt,state.lessons.find((l:any)=>l.id===lessonId)?.studio?.variables||[],body.variableValues||{}).prompt)throw new ApiAccessError('Score applies only to the saved attempt prompt.',409);
      if(body.attemptId&&!attempt)throw new ApiAccessError('Attempt scope denied.',403);
      const settings=validateLearnerSettings(body.settings);if(attempt&&JSON.stringify(validateLearnerSettings(attempt.settings))!==JSON.stringify(settings))throw new ApiAccessError('Score applies only to the original settings.',409);const category=body.category?text(body.category,160):'General';
      if(piiSignals(settings.personalInstruction||'').length)throw new ApiAccessError('Remove personal information from the learner instruction.',422);
      const existing=await result<any>(c.server.from('product_prompt_library').select('*').eq('owner_id',c.profile.id).eq('request_id',requestId).maybeSingle());
      if(existing){if(existing.prompt!==prompt||existing.title!==title||existing.lesson_id!==lessonId||existing.class_id!==cls.id||existing.category!==category||JSON.stringify(validateLearnerSettings(existing.settings))!==JSON.stringify(settings)||['pending','approved','rejected'].includes(existing.status)!==(body.share===true))throw new ApiAccessError('Library request conflict.',409);return existing;}
      return result(c.server.from('product_prompt_library').insert({owner_id:c.profile.id,class_id:cls.id,lesson_id:lessonId,attempt_id:attempt?.id||null,request_id:requestId,title,prompt,category,settings,variables:(state.lessons.find((l:any)=>l.id===lessonId)?.studio?.variables||[]).map((v:any)=>({...v,sample:typeof body.variableValues?.[v.name]==='string'?body.variableValues[v.name]:v.sample})),score:attempt?.evaluation_json?.total??null,status:body.share===true?'pending':'personal'}).select('id,status').single());
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
      const signed=await result<any>(c.server.storage.from('product-sop-originals').createSignedUrl(metadata.storagePath,300,{download:metadata.filename||true}));
      return {url:signed.signedUrl};
    }
    case 'backfillDriveOriginal':{
      if(c.profile.role!=='admin')throw new ApiAccessError('Administrator required to restore a Drive original snapshot.',403);
      const versionId=uuid(body.versionId),expectedSha256=text(body.expectedSha256,64);
      if(!/^[a-f0-9]{64}$/.test(expectedSha256))throw new ApiAccessError('An exact original SHA-256 is required.',422);
      const source=(await snapshot(c,cls.id)).sops.find(s=>s.id===versionId);
      if(!source)throw new ApiAccessError('Source access denied.',403);
      const metadata=source.metadata;
      if(metadata.sha256!==expectedSha256||typeof metadata.driveFileId!=='string'||!/^[A-Za-z0-9_-]+$/.test(metadata.driveFileId))throw new ApiAccessError('The canonical Drive original hash does not match.',409);
      requireWorkspaceSource(cls.id,'files',metadata.driveFileId);
      if(metadata.storageBucket==='product-sop-originals'&&metadata.storagePath)return {versionId,restored:false};
      const extracted=await extractDriveSop(`https://drive.google.com/file/d/${metadata.driveFileId}/view`,{classId:cls.id,expectedSha256});
      const originalPointer=originalSnapshotPointer(metadata,extracted.metadata);
      return sqlTransaction(undefined,async db=>{
        const updated=await db.query(`UPDATE public.product_sop_contributions SET metadata=metadata||$4::jsonb
          WHERE class_id=$1 AND version_id=$2 AND status='published' AND metadata->>'sha256'=$3
          AND metadata->>'driveFileId'=$5 AND NOT(metadata ? 'storagePath')
          AND EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b WHERE b.class_id=$1 AND b.version_id=$2)
          RETURNING id`,[cls.id,versionId,expectedSha256,JSON.stringify(originalPointer),metadata.driveFileId]);
        if(updated.rows.length!==1){
          const current=(await db.query("SELECT metadata FROM public.product_sop_contributions c WHERE class_id=$1 AND version_id=$2 AND status='published' AND EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b WHERE b.class_id=$1 AND b.version_id=$2)",[cls.id,versionId])).rows;
          if(current.length===1&&current[0].metadata?.sha256===expectedSha256&&current[0].metadata?.driveFileId===metadata.driveFileId&&current[0].metadata?.storagePath===originalPointer.storagePath&&current[0].metadata?.storageBucket==='product-sop-originals')return {versionId,restored:false};
          throw new ApiAccessError('Source changed during snapshot restoration. Refresh before retrying.',409);
        }
        await db.query("INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES($1,$2,'sop.original.restore',$3)",[cls.id,c.profile.id,`${versionId} / ${expectedSha256}`]);
        return {versionId,restored:true,sha256:expectedSha256};
      });
    }
    case 'saveDraft':return result(c.reader.rpc('product_save_draft',{p_class:cls.id,p_lesson:uuid(body.lessonId),p_prompt:typeof body.prompt==='string'&&body.prompt.length<=24000?body.prompt:null,p_expected_revision:body.expectedRevision}));
    case 'searchSop':{
      const lessonId=uuid(body.lessonId),lab=(await snapshot(c,cls.id)).lessons.find((l:any)=>l.id===lessonId);if(!lab)throw new ApiAccessError('Lesson scope denied.',403);
      const bindings=await result<any[]>(c.server.from('rebuild_sop_bindings').select('version_id').eq('class_id',cls.id).eq('lesson_id',lessonId)),ids=bindings.map(b=>b.version_id);
      if(!ids.length)return [];
      const chunks=await result<any[]>(c.server.from('product_sop_chunks').select('version_id,position,page,content,embedding').in('version_id',ids).limit(1000));
      let queryVector:number[]|undefined;
      if(body.query){if(!await result<boolean>(c.server.rpc('product_take_budget',{p_actor:c.profile.id,p_operation:'sop.search',p_limit:60})))throw new ApiAccessError('Search quota exceeded.',429);queryVector=(await embedSopChunks([{position:1,page:null,content:text(body.query,1000)}],'RETRIEVAL_QUERY'))[0].embedding;}
      // Retrieval/embedding can outlive an administrator removing or replacing a binding.
      const currentBindings=await result<any[]>(c.server.from('rebuild_sop_bindings').select('version_id').eq('class_id',cls.id).eq('lesson_id',lessonId));
      const currentIds=ids.filter(id=>currentBindings.some(binding=>binding.version_id===id));
      if(!currentIds.length)return [];
      if(process.env.GCP_VECTOR_MODE==='pgvector'&&queryVector){const ranked=await result<any[]>(c.reader.rpc('intrepid_search_sop',{p_class:cls.id,p_lesson:lessonId,p_versions:currentIds,p_vector:queryVector}));return ranked.map(row=>({...row,id:`${row.version_id}:${row.position}`,versionId:row.version_id}));}
      if(process.env.GCP_VECTOR_MODE==='bigquery'&&queryVector){const candidates=await searchWarehouseSop(ids,queryVector);const fresh=(await snapshot(c,cls.id)).sops.filter(s=>s.lessonIds.includes(lessonId));const allowed=new Set(fresh.map(s=>s.id));const ranked=candidates.filter(row=>allowed.has(row.version_id));if(!ranked.length)return [];const canonical=await result<any[]>(c.server.from('product_sop_chunks').select('version_id,position,page,content,model').in('version_id',[...allowed]).in('position',ranked.map(row=>Number(row.position))));return ranked.flatMap(row=>{const chunk=canonical.find(c=>c.version_id===row.version_id&&c.position===Number(row.position)&&c.model===(process.env.EMBEDDING_MODEL||'gemini-embedding-001')),parent=fresh.find(s=>s.id===row.version_id);return chunk&&parent?[{...chunk,id:`${chunk.version_id}:${chunk.position}`,versionId:chunk.version_id,title:parent.title,similarity:row.similarity,citation:`[SOP:${chunk.version_id}:v${parent.version}]${chunk.page?` [Page ${chunk.page}]`:''}`}]:[];});}
      const versions=await result<any[]>(c.server.from('rebuild_sop_versions').select('id,document_id,version').in('id',ids));const docs=await result<any[]>(c.server.from('rebuild_sop_documents').select('id,title').eq('class_id',cls.id));
      const similarity=(embedding:number[])=>{if(!queryVector)return 0;let dot=0,a=0,b=0;for(let i=0;i<768;i++){dot+=embedding[i]*queryVector[i];a+=embedding[i]**2;b+=queryVector[i]**2;}return a&&b?dot/Math.sqrt(a*b):0;};
      return chunks.filter(chunk=>currentIds.includes(chunk.version_id)).map(chunk=>{const v=versions.find(v=>v.id===chunk.version_id);return {id:`${chunk.version_id}:${chunk.position}`,versionId:chunk.version_id,title:docs.find(d=>d.id===v?.document_id)?.title,page:chunk.page,content:chunk.content,citation:`[SOP:${chunk.version_id}:v${v?.version}]${chunk.page?` [Page ${chunk.page}]`:''}`,similarity:similarity(chunk.embedding)};}).sort((a,b)=>b.similarity-a.similarity).slice(0,10);
    }
    case 'saveDomain':{
      if(c.profile.role!=='admin')throw new ApiAccessError('Administrator required.',403);
      const domain=text(body.domain,253).toLowerCase().replace(/^@/,'');if(!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(domain)||typeof body.active!=='boolean')throw new ApiAccessError('Invalid domain policy.',422);
      await result(c.reader.rpc('product_save_domain',{p_class:cls.id,p_domain:domain,p_active:body.active}));return {saved:true};
    }
    case 'promoteLearner': {
      // Admin-only, audited learner -> facilitator change (019); Class access still handles new or non-learner accounts.
      if(c.profile.role!=='admin')throw new ApiAccessError('System administrator required.',403);
      const {data,error}=await c.reader.rpc('product_promote_learner_to_instructor',{p_class:cls.id,p_email:text(body.email,254).toLowerCase(),p_permission:body.permission,p_reason:text(body.reason,500)});
      if(error){
        const message=String(error.message||'');
        if(/User not found/.test(message))throw new ApiAccessError('No account uses this email. Use Class access to invite a new facilitator.',404);
        if(/Only a learner can be promoted/.test(message))throw new ApiAccessError(message.slice(message.indexOf('Only a learner')),409);
        if(/Invalid permission|Reason must be/.test(message))throw new ApiAccessError(message.slice(message.search(/Invalid permission|Reason must be/)),422);
        if(/administrator required/i.test(message))throw new ApiAccessError('System administrator required.',403);
        if(['PGRST202','42883'].includes(error.code))throw new ApiAccessError('The role promotion schema upgrade (019) has not been applied.',503);
        throw new ApiAccessError('The database operation was not confirmed. Refresh before retrying.',409);
      }
      return {userId:data};
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
      const signed=await c.server.storage.from('product-sop-originals').createSignedUploadUrl(path,{upsert:false,size:body.size});
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
      const document=await renderCertificate(awardData(award,learner.user?.full_name,cls.course_title),'en');
      return {base64:document.base64,svg:document.svg,filename:'Promptify-'+award.id+'.pdf'};
    }
    case 'listDriveFolder':{
      if(!cls.can_manage)throw new ApiAccessError('Assigned editor required to browse a Drive folder.',403);
      const url=text(body.url,1000);requireWorkspaceSource(cls.id,'folders',driveFolderId(url));
      return listDriveFolder(url);
    }
    case 'submitSop':{
      const requestId=uuid(body.requestId),lessonId=uuid(body.lessonId),title=text(body.title,160);
      const prior=await result<any>(c.server.from('product_sop_contributions').select('id,title,lesson_id,class_id,metadata').eq('actor_id',c.profile.id).eq('request_id',requestId).maybeSingle());
      if(prior){if(prior.class_id!==cls.id||prior.title!==title||prior.lesson_id!==lessonId)throw new ApiAccessError('Contribution request conflict.',409);return {id:prior.id};}
      const modules=await result<any[]>(c.server.from('course_modules').select('id').eq('course_id',cls.course_id));
      const target=await result<any>(c.server.from('lessons').select('id,status').eq('id',lessonId).in('module_id',modules.map(m=>m.id)).maybeSingle());
      if(!target||!cls.can_manage&&!(await snapshot(c,cls.id)).lessons.some((lesson:any)=>lesson.id===lessonId))throw new ApiAccessError('Lesson scope denied.',403);
      let source;
      if(body.driveUrl){const url=text(body.driveUrl,1000);requireWorkspaceFileUrl(cls.id,url);source=await extractDriveSop(url,{classId:cls.id});}
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
        requireWorkspaceFileUrl(cls.id,source.metadata.driveUrl);
        const extracted=await extractDriveSop(source.metadata.driveUrl,{classId:cls.id});
        source={...source,...extracted,metadata:{...source.metadata,...extracted.metadata}};
        await result(c.server.from('product_sop_contributions').update({content:source.content,chunks:source.chunks,metadata:source.metadata}).eq('id',id).eq('status','pending'));
      }
      if(source.metadata?.driveFileId){
        requireWorkspaceSource(cls.id,'files',source.metadata.driveFileId);
        if(!source.metadata.storagePath){
          if(!/^[a-f0-9]{64}$/.test(source.metadata.sha256||''))throw new ApiAccessError('The pending Drive source requires a canonical original hash before publication.',409);
          const stored=await extractDriveSop(`https://drive.google.com/file/d/${source.metadata.driveFileId}/view`,{classId:cls.id,expectedSha256:source.metadata.sha256});
          const pointer=originalSnapshotPointer(source.metadata,stored.metadata);
          const saved=await sqlTransaction(undefined,async db=>(await db.query("UPDATE public.product_sop_contributions SET metadata=metadata||$4::jsonb WHERE id=$1 AND class_id=$2 AND status='pending' AND metadata->>'sha256'=$3 AND metadata->>'driveFileId'=$5 RETURNING id",[id,cls.id,source.metadata.sha256,JSON.stringify(pointer),source.metadata.driveFileId])).rows);
          if(saved.length!==1)throw new ApiAccessError('Pending source changed while restoring its original. Refresh before retrying.',409);
          source={...source,metadata:{...source.metadata,...pointer}};
        }
      }
      const chunks=await indexPendingContribution(c.server,source);
      return {versionId:await result(c.reader.rpc('product_publish_contribution',{p_contribution:id,p_chunks:chunks}))};
    }
    case 'sandboxGenerate': {
      if(process.env.AI_WORKER_ISOLATED==='true')throw new ApiAccessError('Studio AI preview is unavailable while AI workers are isolated. Use the learner workspace for asynchronous Runs.',503);
      const requestId=uuid(body.requestId),lessonId=uuid(body.lessonId),prompt=text(body.prompt,24000);
      const prior=await result<any>(c.server.from('product_sandbox_runs').select('lesson_id,class_id,prompt,result').eq('actor_id',c.profile.id).eq('request_id',requestId).maybeSingle());
      if(prior){if(prior.class_id!==cls.id||prior.lesson_id!==lessonId||prior.prompt!==prompt)throw new ApiAccessError('Sandbox request conflict.',409);if(prior.result)return prior.result;throw new ApiAccessError('Sandbox request is processing or uncertain.',409);}
      const modules=await result<any[]>(c.server.from('course_modules').select('id').eq('course_id',cls.course_id));
      let lab=await result<any>(c.server.from('lessons').select('*').eq('id',lessonId).in('module_id',modules.map(m=>m.id)).single());
      const studio=await result<any>(c.server.from('product_studio').select('config,revision').eq('class_id',cls.id).eq('lesson_id',lessonId).maybeSingle());
      lab=resolveClassLesson(lab,studio?.config);
      // An unsaved draft rubric may be previewed here; learners only ever get the saved one (frozen per Run).
      let rubric;try{rubric=validateRubric(body.rubric??studio?.config?.rubric??DEFAULT_RUBRIC);}catch(error){throw new ApiAccessError((error as Error).message,422);}
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
      if(process.env.AI_WORKER_ISOLATED==='true')throw new ApiAccessError('Studio AI preview is unavailable while AI workers are isolated. Use the learner workspace for asynchronous Runs.',503);
      const requestId=uuid(body.requestId);
      const run=await result<any>(c.server.from('product_sandbox_runs').select('*').eq('actor_id',c.profile.id).eq('request_id',requestId).eq('class_id',cls.id).single());
      if(run.evaluation)return run.evaluation;
      if(!run.result)throw new ApiAccessError('Sandbox output has not been saved.',409);
      const claim=crypto.randomUUID();
      const acquired=await result<any>(c.server.from('product_sandbox_runs').update({judge_claim:claim}).eq('actor_id',c.profile.id).eq('request_id',requestId).is('judge_claim',null).select('request_id').maybeSingle());
      if(!acquired)throw new ApiAccessError('Sandbox Judge is processing or uncertain.',409);
      let evaluation;
      try{evaluation=await productionEvaluate({learnerPrompt:run.prompt,generatedOutput:run.result.output,scenario:run.snapshot.scenario,taskRequirement:run.snapshot.taskRequirement,controlData:run.snapshot.inputContext,lessonRubric:run.snapshot.rubric,language:body.language==='en'?'en':'vi'});}
      catch(error){
        // Provider work has settled without a saved score; release this claim so the trainer can retry instead of a permanent 409.
        try{await c.server.from('product_sandbox_runs').update({judge_claim:null}).eq('actor_id',c.profile.id).eq('request_id',requestId).eq('judge_claim',claim).is('evaluation',null);}catch{}
        throw error;
      }
      await result(c.server.from('product_sandbox_runs').update({evaluation}).eq('actor_id',c.profile.id).eq('request_id',requestId).eq('judge_claim',claim));
      return evaluation;
    }
    case 'requestHint': {
      if(c.profile.role!=='learner')throw new ApiAccessError('A learner session is required.',403);
      const lessonId=uuid(body.lessonId);if(!await lessonInClass(cls.id,lessonId))throw new ApiAccessError('Lesson scope denied.',403);
      return createHintRequest(c.profile.id,cls.id,lessonId,uuid(body.requestId),typeof body.reason==='string'?body.reason:'');
    }
    case 'reviewHintRequest':return reviewHintRequest(cls.id,uuid(body.hintRequestId),body.decision,typeof body.note==='string'?body.note:'',c.profile.id);
    case 'unlockSupport': {
      // Hints now need facilitator approval (requestHint) and the benchmark solution is not offered to learners.
      if(c.profile.role==='learner')throw new ApiAccessError('Hints are now requested from your facilitator, and the benchmark solution is not available to learners.',403);
      if(body.kind==='solution'&&text(body.reflection,1000).length<20)throw new ApiAccessError('Write at least 20 characters of reflection before requesting the solution.',422);
      return result(c.reader.rpc('product_unlock_support_reflected',{p_class:cls.id,p_lesson:uuid(body.lessonId),p_kind:body.kind,p_reflection:body.kind==='solution'?body.reflection:null}));
    }
    // Learner acknowledges a trainer broadcast; the receipt hides it from the learner inbox.
    case 'ackMessage': return result(c.reader.rpc('rebuild_ack_workshop_message',{p_message:uuid(body.messageId)}));
    case 'resetAiSession': {
      if(c.profile.role!=='learner')throw new ApiAccessError('A learner session is required.',403);
      const lessonId=uuid(body.lessonId);if(!await lessonInClass(cls.id,lessonId))throw new ApiAccessError('Lesson scope denied.',403);
      return resetAiSession(c.profile.id,cls.id,lessonId);
    }
    case 'setAccessExpiry':return setAccessExpiry(cls.id,uuid(body.learnerId),body.expiresAt===null||body.expiresAt===''?null:text(body.expiresAt,40),c.profile.id);
    case 'generate': {
      if((process.env.GENERATION_MODE==='async'||process.env.AI_WORKER_ISOLATED==='true')&&!generationAsyncEnabled())throw new ApiAccessError('Asynchronous generation is not configured.',503);
      return generateSavedRun(authorization, { classId: cls.id, lessonId: uuid(body.lessonId), requestId: uuid(body.requestId), prompt: text(body.prompt, 24000), settings:body.settings,contextIds:body.contextIds,variableValues:body.variableValues }, generationAsyncEnabled());
    }
    case 'judge': {
      if((process.env.JUDGE_MODE==='async'||process.env.AI_WORKER_ISOLATED==='true')&&!judgeAsyncEnabled())throw new ApiAccessError('Asynchronous Judge is not configured.',503);
      const judgeBody={ classId: cls.id, lessonId: uuid(body.lessonId), attemptId: uuid(body.attemptId), language: body.language === 'en' ? 'en' : 'vi' };
      return judgeAsyncEnabled() ? enqueueJudge(authorization, judgeBody) : evaluateSavedRun(authorization, judgeBody);
    }
    case 'generationStatus': return generationStatus(authorization,{classId:cls.id,lessonId:uuid(body.lessonId),requestId:uuid(body.requestId)});
    case 'judgeStatus': return judgeStatus(authorization, { classId: cls.id, lessonId: uuid(body.lessonId), attemptId: uuid(body.attemptId) });
    case 'saveStudio': {
      validateStudioShape(body.config);if((body.config.awards.badges||[]).some((b:any)=>(b.ruleType&&b.ruleType!=='passed_lesson')||b.attemptScope==='first'))await requireAwardRuleEngine();
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
    case 'inspectWorkspaceSource':{
      if(c.profile.role!=='admin')throw new ApiAccessError('Administrator required to inspect company Workspace sources.',403);
      return inspectWorkspaceSource(text(body.url,1000),text(body.tab,100));
    }
    case 'saveSheet': {
      const match = String(body.url).match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
      if (!match) throw new ApiAccessError('A Google Sheets URL is required.', 422);
      requireWorkspaceSource(cls.id,'sheets',match[1]);
      return result(c.reader.rpc('product_save_sheet', { p_class: cls.id, p_sheet: match[1], p_name: text(body.name, 160), p_mapping: body.mapping }));
    }
    case 'setSheetAutoSync': {
      if(typeof body.enabled!=='boolean')throw new ApiAccessError('A synchronization setting is required.',422);
      return result(c.reader.rpc('product_set_sheet_auto_sync',{p_class:cls.id,p_connection:uuid(body.connectionId),p_enabled:body.enabled}));
    }
    case 'syncSheet': {
      const connection = await result<any>(c.server.from('product_sheet_connections').select('id,sheet_id,column_mapping').eq('id', uuid(body.connectionId)).eq('class_id', cls.id).single());
      requireWorkspaceSource(cls.id,'sheets',connection.sheet_id);
      const requestId=uuid(body.requestId),prior=await result<any>(c.server.from('product_sync_logs').select('*').eq('actor_id',c.profile.id).eq('request_id',requestId).maybeSingle());
      if(prior){if(prior.connection_id!==connection.id)throw new ApiAccessError('Sync request conflict.',409);if(prior.status==='success')return prior.result;throw new ApiAccessError('Sync request is processing or failed; inspect the saved log.',409);}
      const log=await result<any>(c.server.from('product_sync_logs').insert({connection_id:connection.id,class_id:cls.id,actor_id:c.profile.id,request_id:requestId,status:'running'}).select('id').single());
      try{
        const bundle=await readRosterSource(connection.sheet_id,connection.column_mapping,cls.department);
        const rows = bundle?.rows||await readRoster(connection.sheet_id, connection.column_mapping, cls.department);
        if(bundle)return await finishWorkbookSync(log.id,rows,bundle);
        const imported:any = await result(c.reader.rpc('product_import_roster', { p_class: cls.id, p_request: requestId, p_rows: rows }));
        await result(c.server.from('product_sheet_connections').update({ status: 'synced', last_synced_at: new Date().toISOString() }).eq('id', connection.id));
        await result(c.server.from('product_sync_logs').update({status:'success',processed:imported.processed,result:imported,finished_at:new Date().toISOString()}).eq('id',log.id));return imported;
      }catch(error){await c.server.from('product_sync_logs').update({status:'failed',error_code:error instanceof ApiAccessError?String(error.statusCode):'500',finished_at:new Date().toISOString()}).eq('id',log.id);throw error;}
    }
    case 'requestRotation': {
      if(c.profile.role!=='admin'||!['gemini','sheets'].includes(body.provider))throw new ApiAccessError('Administrator and valid provider required.',403);
      if(body.provider==='gemini'&&vertexEnabled()||body.provider==='sheets'&&process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT&&!process.env.GOOGLE_SERVICE_ACCOUNT_JSON)throw new ApiAccessError('This provider uses IAM service identity; manage access in Google Cloud.',422);
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
      return { telemetry:await readGenerationTelemetry(c.server,cls.id),rotations:await result(c.server.from('product_rotation_requests').select('id,provider,status,requested_by,reason,created_at,applied_at,deployment_id,approvals:product_rotation_approvals(user_id,created_at)').eq('class_id',cls.id).order('created_at',{ascending:false}).limit(30)),ai: { configured: Boolean(vertexEnabled()||process.env.GEMINI_API_KEY),credentialMode:vertexEnabled()?'iam':'secret',projectId:process.env.GOOGLE_CLOUD_PROJECT||null, model: process.env.GEMINI_MODEL || null,fallback:process.env.GEMINI_FALLBACK_MODEL||null }, sheets: { configured: Boolean(process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT||process.env.GOOGLE_SERVICE_ACCOUNT_JSON),credentialMode:process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT?'iam':'secret' }, secrets: 'server-only', domains:await result(c.server.from('product_domains').select('client_id,domain,active,updated_at').eq('client_id',cls.client_id)),controls: await result(c.server.from('product_session_controls').select('class_id,state,revision,updated_at').eq('class_id',cls.id)), audit: await result(c.server.from('product_audit').select('id,class_id,actor_id,action,reason,created_at').eq('class_id',cls.id).order('created_at', { ascending: false }).limit(100)) };
    }
    default: throw new ApiAccessError('This action has no production handler.', 422);
  }
}
