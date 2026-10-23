import {authoredLessonText} from '../../services/learnerContentLanguageService';
import SopRequestReview from './SopRequestReview';
import PromptLibrary from './PromptLibrary';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabaseClient';
import { loadProduct, productRequest, ProductRequestError } from '../../services/productionClientService';
import { productText as t, setProductLanguage, useProductLanguage } from '../../services/productI18nService';
import type { ProductLesson, ProductSnapshot, WeightedEvaluation } from '../../types/production';
import { PromptifyMark } from '../common/PromptifyMark';
import { MarkdownView } from '../common/MarkdownView';
import { StagingLogin } from '../auth/StagingLogin';
import ProductionStudio from './ProductionStudioV2';
import ProductionStudioSource from './ProductionStudioSource';
import ProductionSop from './ProductionSop';
import ProductionSopSource from './ProductionSopSource';
import ProductionAnalytics from './ProductionAnalytics';
import ProductionAnalyticsSource from './ProductionAnalyticsSource';
import ProductionGovernanceSource from './ProductionGovernanceSource';
import ProductionRosterSource from './ProductionRosterSource';
import ProductionGovernance from './ProductionGovernance';
import ProductionRoster from './ProductionRoster';
import ProductionWorkshop from './ProductionWorkshop';
import ProductionWorkshopSource from './ProductionWorkshopSource';
import ProductionLearnerInspectorSource from './ProductionLearnerInspectorSource';
import ProductionEntry1 from './ProductionEntry1';
import ProductionEntry2 from './ProductionEntry2';
import ProductionEntry3 from './ProductionEntry3';
import ProductionCompareSource from './ProductionCompareSource';
import ProductionJudgeSource from './ProductionJudgeSource';
import ProductionSopInspectorSource from './ProductionSopInspectorSource';
import ProductionHub from './ProductionHub';
import CombinedProductionHub from './CombinedProductionHub';
import ProductionLanding from './ProductionLanding';
import {LandingLoginScreen} from '../auth/LandingLoginScreen';
import ProductionCohorts from './ProductionCohorts';
import ProductionCompare from './ProductionCompare';
import ProductionWorkspace from './ProductionWorkspace';
import CombinedProductionWorkspace from './CombinedProductionWorkspace';
import {ProductDialog} from '../common/ProductDialog';
import './production.css';
import ProductUseNotice from '../common/ProductUseNotice';

const titlePairs = [['Promptify','Promptify'],['Enterprise authentication','Đăng nhập doanh nghiệp'],['Profile confirmation','Xác nhận hồ sơ'],['Access denied','Truy cập bị từ chối'],['Learning dashboard','Tổng quan học tập'],['Codelab workspace','Không gian Codelab'],['Version comparison','So sánh phiên bản'],['AI Judge scorecard','Bảng điểm AI Judge'],['SOP inspector','Kiểm tra SOP'],['Workshop control','Điều hành workshop'],['Learner inspector','Kiểm tra bài làm'],['Curriculum Studio','Studio giáo trình'],['Learning analytics','Phân tích học tập'],['SOP contribution','Đóng góp SOP'],['System governance','Quản trị hệ thống'],['Roster connections','Kết nối danh sách học viên']];
export default function ProductionApp() {
  const language = useProductLanguage(); const pair = (en: string, vi: string) => language === 'en' ? en : vi;
  const [session, setSession] = useState<Session | null>(null), [authReady, setAuthReady] = useState(false);
  const [snapshot, setSnapshot] = useState<ProductSnapshot | null>(null), [busy, setBusy] = useState(false), [actionError, setError] = useState('');
  const [loadError,setLoadError]=useState('');
  const error=actionError||loadError;
  const [ui, setUi] = useState(() => Number(new URLSearchParams(location.search).get('ui')) || 0);
  const [classId, setClassId] = useState<string | undefined>(), [lessonId, setLessonId] = useState<string | undefined>();
  const [prompt, setPrompt] = useState(''), [selectedAttempt, setSelectedAttempt] = useState<string>(), [versions, setVersions] = useState<string[]>([]);
  const [fullName, setFullName] = useState(''), [reason, setReason] = useState(''), [message, setMessage] = useState('');
  const [learnerId, setLearnerId] = useState(''), [sourceId, setSourceId] = useState(''), [sopTitle, setSopTitle] = useState(''), [sopContent, setSopContent] = useState('');
  const [sheetUrl, setSheetUrl] = useState(''), [mapping, setMapping] = useState({tab:'Roster',range:'A1:D501',email:'Email',fullName:'Full Name',department:'Department',country:'Country'});
  const [governance, setGovernance] = useState<any>(), [notice, setNotice] = useState('');
  const [reflection,setReflection]=useState('');
  const [unlock, setUnlock] = useState<'hints'|'solution'|null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null), activeWrite = useRef(false), request = useRef<{ prompt: string; classId: string; lessonId: string; signature?:string; id: string } | undefined>(undefined);
  const latestLoad = useRef(0);
  const pendingLoad = useRef<{generation:number;classId?:string} | undefined>(undefined);
  const requestedClass = useRef<string | undefined>(undefined);
  const initializedProfile = useRef<string | undefined>(undefined);
  const refresh = useCallback(async (selectedClass?: string) => {
    if(selectedClass&&requestedClass.current&&selectedClass!==requestedClass.current)return;
    if(pendingLoad.current?.classId===selectedClass&&pendingLoad.current)return;
    const generation = ++latestLoad.current;
    pendingLoad.current={generation,classId:selectedClass};
    try { const state = await loadProduct(selectedClass); if (generation !== latestLoad.current) return; setSnapshot(state); setClassId(state.selectedClass?.id);requestedClass.current=state.selectedClass?.id; if(initializedProfile.current!==state.profile.id){setFullName(state.profile.full_name);initializedProfile.current=state.profile.id;} setLoadError(''); }
    catch (cause) { if (generation === latestLoad.current) {setLoadError((cause as Error).message);if(cause instanceof ProductRequestError&&cause.status===403){setSnapshot(null);setUi(3);}} }
    finally {if(pendingLoad.current?.generation===generation)pendingLoad.current=undefined;}
  }, []);
  const navigate = (next: number, selectedSource?: string) => { if(selectedSource)setSourceId(selectedSource);setUi(next); const url = new URL(location.href); url.searchParams.set('ui', String(next).padStart(2,'0')); history.pushState(null,'',url); };
  useEffect(()=>{document.title=language==='en'?'Promptify · Intrepid Learning Workspace':'Promptify · Không gian học tập Intrepid';},[language]);
  const profileHome = snapshot?.profile.role==='learner'?4:snapshot?.profile.role==='head'?12:snapshot?.profile.role==='admin'?14:9;
  useEffect(()=>{if(!snapshot)return;if(!snapshot.profile.profile_confirmed_at&&ui!==2){setUi(2);const url=new URL(location.href);url.searchParams.set('ui','02');history.replaceState(null,'',url);}else if(snapshot.profile.profile_confirmed_at&&ui===1){setUi(profileHome);const url=new URL(location.href);url.searchParams.set('ui',String(profileHome).padStart(2,'0'));history.replaceState(null,'',url);}},[snapshot?.profile.id,snapshot?.profile.profile_confirmed_at,ui,profileHome]);
  useEffect(() => { let mounted = true; supabase.auth.getSession().then(({data}) => {if(mounted){setSession(data.session);setAuthReady(true);}}).catch(cause=>{if(mounted){setError(cause.message);setAuthReady(true);}}); const {data} = supabase.auth.onAuthStateChange((_event,current) => {setSession(current);setAuthReady(true);}); return()=>{mounted=false;data.subscription.unsubscribe();}; }, []);
  useEffect(() => { latestLoad.current++;pendingLoad.current=undefined;setSnapshot(null);setClassId(undefined);requestedClass.current=undefined;initializedProfile.current=undefined;setLessonId(undefined);setSelectedAttempt(undefined);request.current=undefined;setPrompt('');setError('');setLoadError('');if(session)void refresh(); }, [session?.user.id]);
  useEffect(() => { const handle=()=>setUi(Number(new URLSearchParams(location.search).get('ui'))||0);window.addEventListener('popstate',handle);return()=>window.removeEventListener('popstate',handle); }, []);
  useEffect(() => { if(!session||!classId)return; const timer=setInterval(()=>{if(!activeWrite.current)void refresh(classId);},ui===9?5000:15000);return()=>clearInterval(timer); }, [session?.user.id,classId,refresh,ui]);
  useEffect(()=>{if(!session||!classId)return;const channel=supabase.channel('product-workshop-'+classId).on('postgres_changes',{event:'INSERT',schema:'public',table:'workshop_messages',filter:'class_id=eq.'+classId},()=>void refresh(classId)).on('postgres_changes',{event:'INSERT',schema:'public',table:'trainer_hints',filter:'class_id=eq.'+classId},()=>void refresh(classId)).subscribe();return()=>{void supabase.removeChannel(channel);};},[session?.user.id,classId,refresh]);
  const action = async (name: string, payload: Record<string, unknown> = {}, after?: (value:any)=>void) => {
    if(snapshot?.selectedClass?.id!==classId&&name!=='confirmProfile'&&name!=='profileCorrection')return;
    if(activeWrite.current)return;activeWrite.current=true;setBusy(true);setError('');setNotice('');
    try {const result=await productRequest(name,{classId,...payload});after?.(result);await refresh(classId);setNotice(pair('Saved on the server.','Đã lưu trên máy chủ.'));}
    catch(cause){setError((cause as Error).message);}finally{activeWrite.current=false;setBusy(false);}
  };
  const lesson = snapshot?.lessons.find(l=>l.id===lessonId) || snapshot?.lessons[0];
  const attempts = snapshot?.attempts.filter(a=>a.lesson_ref_id===lesson?.id) || [];
  const attempt = attempts.find(a=>a.id===selectedAttempt) || attempts[0];
  const evaluation = attempt?.evaluation_json as WeightedEvaluation | undefined;
  const feedback = evaluation?.feedback?.[language];
  const editor = !!snapshot?.selectedClass?.can_manage;
  const isLearner = snapshot?.profile.role === 'learner';
  const currentUi = Math.min(15,Math.max(0,ui));
  const accessible = currentUi < 4 || !!snapshot && (currentUi===13?true:currentUi < 9 ? isLearner : currentUi===12 ? !isLearner : currentUi===14 ? snapshot.profile.role==='admin' : editor);
  const run = (settings?:unknown,contextIds?:string[]) => { if(!classId||!lesson||!prompt.trim())return;const signature=JSON.stringify({settings,contextIds});const previous=request.current;if(!previous||previous.prompt!==prompt||previous.classId!==classId||previous.lessonId!==lesson.id||previous.signature!==signature)request.current={prompt,classId,lessonId:lesson.id,signature,id:crypto.randomUUID()};void action('generate',{lessonId:lesson.id,prompt,requestId:request.current!.id,settings,contextIds},value=>{setSelectedAttempt(value.saved?.attempt?.id);}); };
  const insert = (value:string) => {const area=promptRef.current;const start=area?.selectionStart??prompt.length,end=area?.selectionEnd??start;setPrompt(prompt.slice(0,start)+value+prompt.slice(end));requestAnimationFrame(()=>{area?.focus();area?.setSelectionRange(start+value.length,start+value.length);});};
  const scoreCard = () => evaluation?.contract==='weighted-v1' ? <section className="prod-card"><h2>{t('rubric')} · {evaluation.total}/10</h2>{evaluation.criteria.map(c=><div key={c.key} className="prod-criterion"><strong>{t(c.key as any)}</strong><span>{c.score}/{c.max}</span><p>{feedback?.criteriaReasons[c.key]||c.reason}</p></div>)}{(['strengths','improvements'] as const).map(key=><div key={key}><h3>{t(key)}</h3><ul>{(feedback?.[key]||evaluation[key]).map((value,i)=><li key={i}>{value}</li>)}</ul></div>)}<h3>{t('nextHint')}</h3><p>{feedback?.nextHint||evaluation.nextHint}</p></section> : <p>{t('noData')}</p>;
  const unlockDialog=()=>(unlock&&<ProductDialog title={unlock==='hints'?pair('Unlock hints?','Mở gợi ý?'):pair('Unlock solution?','Mở lời giải?')} onClose={()=>setUnlock(null)}><h2 id="unlock-title">{unlock==='hints'?pair('Unlock hints?','Mở gợi ý?'):pair('Unlock solution?','Mở lời giải?')}</h2><p>{pair('This support request is recorded on the server. It does not modify your prompt or AI score.','Yêu cầu hỗ trợ này được ghi trên máy chủ. Nội dung prompt và điểm AI của bạn không bị thay đổi.')}</p><label>{pair("Reflection before viewing the solution","Suy nghĩ của bạn trước khi xem lời giải")}<textarea value={reflection} onChange={e=>setReflection(e.target.value)} maxLength={1000}/></label><button onClick={()=>setUnlock(null)}>{t('cancel')}</button><button disabled={busy||(unlock==='solution'&&reflection.trim().length<20)} onClick={()=>{const kind=unlock;setUnlock(null);void action('unlockSupport',{lessonId:lesson?.id,kind,reflection});}}>{pair('Confirm unlock','Xác nhận mở')}</button></ProductDialog>);
  const scoped=(content:React.ReactNode)=><><nav aria-label={pair('Workspace navigation','Điều hướng không gian làm việc')} className={"source-ui source-scope-nav"+(currentUi===14?" source-scope-nav-dark":"")}><a className="workspace-brand" href="/?ui=09" onClick={e=>{e.preventDefault();navigate(profileHome);}}><PromptifyMark className="!h-8 !w-8"/><strong>Promptify</strong></a><select aria-label={pair('Cohort','Lớp học')} disabled={busy} value={classId||''} onChange={e=>{const id=e.target.value;requestedClass.current=id;setClassId(id);setLessonId(undefined);setSelectedAttempt(undefined);request.current=undefined;setError('');setPrompt('');void refresh(id);}}>{snapshot?.classes.map(c=><option key={c.id} value={c.id}>{c.department} · {c.class_code} · {c.client_name}</option>)}</select>{(isLearner?[4,13]:snapshot?.profile.role==='head'?[12]:snapshot?.profile.role==='admin'?[9,11,12,13,14,15]:[9,11,12,13,15]).map(index=><button key={index} aria-current={currentUi===index?'page':undefined} className="workspace-tab" onClick={()=>navigate(index)}>{titlePairs[index][language==='en'?0:1]}</button>)}<button className="ml-auto" onClick={()=>setProductLanguage(language==='en'?'vi':'en')}>VI / EN</button><button onClick={()=>void supabase.auth.signOut()}>{t('signOut')}</button></nav><div className="workspace-context" role="status"><strong>{snapshot?.selectedClass?.class_code}</strong><span>{snapshot?.selectedClass?.department}</span><span>{snapshot?.lessons.length} {pair('Codelabs','bài học')} · {snapshot?.learners.length} {pair('enrolled learners','học viên')}</span></div>{snapshot?.selectedClass?.class_code.startsWith("TRIAL-INTREPID-")&&<p className="source-ui mx-auto max-w-7xl px-6 py-3 bg-amber-50 text-amber-900" role="note">{pair("TRIAL: These five Basic lessons use fictional SOP context. This is not an approved Intrepid policy or completion certificate.","THỬ NGHIỆM: 5 bài Basic dùng SOP hư cấu. Đây không phải chính sách Intrepid đã duyệt hoặc chứng nhận hoàn thành chính thức.")}</p>}{snapshot?.selectedClass?.id!==classId?<section className="workspace-loading" role="status">{loadError?<><p role="alert">{loadError}</p><button onClick={()=>void refresh(classId)}>{pair('Retry','Thử lại')}</button></>:pair('Loading selected cohort…','Đang tải lớp được chọn…')}</section>:content}<ProductUseNotice/></>;
  if(!authReady)return <main className="prod-shell" role="status">{t('loading')}</main>;
  if(currentUi===0)return <><ProductionLanding/><ProductUseNotice/></>;
  if(currentUi===1||!session&&currentUi>=2)return <ProductionEntry1 email={session?.user.email}/>;
  if(currentUi===2&&snapshot)return <ProductionEntry2 snapshot={snapshot} email={snapshot.profile.email} onConfirmed={async()=>{activeWrite.current=true;latestLoad.current++;try{const fresh=await loadProduct(classId);if(!fresh.profile.profile_confirmed_at)throw Error(pair('Profile confirmation could not be verified. Please retry.','Chưa xác minh được hồ sơ đã lưu. Hãy thử lại.'));setSnapshot(fresh);navigate(fresh.profile.role==='learner'?4:fresh.profile.role==='head'?12:fresh.profile.role==='admin'?14:9);}finally{activeWrite.current=false;}}}/>;
  if(currentUi===3||session&&snapshot&&!accessible)return <ProductionEntry3 email={session?.user.email} viewDenied={!!snapshot&&!accessible} onHome={()=>navigate(profileHome)}/>;
  if(session&&!snapshot&&currentUi!==3)return <main className="source-ui min-h-screen grid place-items-center"><section role="status">{error?<><p role="alert">{error}</p><div className="flex gap-3 flex-wrap"><button onClick={()=>void refresh(classId)}>{pair('Retry','Thử lại')}</button><button onClick={async()=>{await supabase.auth.signOut({scope:'local'});setSession(null);navigate(1);}}>{pair('Sign in again','Đăng nhập lại')}</button></div></>:t('loading')}</section></main>;
  if(currentUi===9&&snapshot&&accessible)return scoped(<><ProductionWorkshopSource key={snapshot.selectedClass?.id} snapshot={snapshot} busy={busy} onAction={action} navigate={navigate} onInspect={id=>{setLearnerId(id);navigate(10);}} onSelectClass={id=>{requestedClass.current=id;setClassId(id);setLessonId(undefined);setSelectedAttempt(undefined);request.current=undefined;setError('');setPrompt('');void refresh(id);}}/>{error&&<p role="alert" className="fixed bottom-4 left-4 z-[80] p-4 bg-red-50 text-red-800">{error}</p>}</>);
  if(currentUi===10&&snapshot&&accessible)return scoped(<><ProductionLearnerInspectorSource key={snapshot.selectedClass?.id} snapshot={snapshot} learnerId={learnerId} busy={busy} onAction={action} navigate={navigate}/>{error&&<p role="alert" className="fixed bottom-4 left-4 z-[80] p-4 bg-red-50 text-red-800">{error}</p>}</>);
  if(currentUi===11&&snapshot&&accessible&&snapshot.selectedClass)return scoped(<><ProductionStudioSource key={snapshot.selectedClass?.id} snapshot={snapshot} busy={busy} onAction={action} navigate={navigate}/><SopRequestReview snapshot={snapshot} busy={busy} onAction={action}/>{error&&<p role="alert" className="fixed bottom-4 left-4 z-[80] p-4 bg-red-50 text-red-800">{error}</p>}</>);
  if(currentUi===12&&snapshot&&accessible)return scoped(<><ProductionAnalyticsSource key={snapshot.selectedClass?.id} snapshot={snapshot}/><PromptLibrary snapshot={snapshot} busy={busy} onAction={action}/></>);
  if(currentUi===14&&snapshot&&accessible)return scoped(<><ProductionGovernanceSource key={snapshot.selectedClass?.id} snapshot={snapshot} busy={busy} onAction={action}/>{error&&<p role="alert" className="fixed bottom-4 left-4 z-[80] p-4 bg-red-50 text-red-800">{error}</p>}</>);
  if(currentUi===15&&snapshot&&accessible)return scoped(<><ProductionRosterSource key={snapshot.selectedClass?.id} snapshot={snapshot} busy={busy} onAction={action}/>{error&&<p role="alert" className="fixed bottom-4 left-4 z-[80] p-4 bg-red-50 text-red-800">{error}</p>}</>);
  if(currentUi===13&&snapshot&&accessible&&snapshot.selectedClass)return scoped(<><ProductionSopSource key={snapshot.selectedClass?.id} snapshot={snapshot} busy={busy} onAction={action}/>{error&&<p role="alert" className="fixed top-4 left-4 z-[80] p-4 bg-red-50 text-red-800">{error}</p>}</>);
  if(currentUi===6&&snapshot&&lesson)return scoped(<ProductionCompareSource key={lesson.id} attempts={attempts} title={lesson.title} navigate={navigate} restore={(value:string,id?:string)=>{setPrompt(value);if(id)setSelectedAttempt(id);navigate(5);}}/>);
  if([5,7,8].includes(currentUi)&&snapshot&&lesson)return scoped(<><ProductionWorkspace actionError={error} selectAttempt={setSelectedAttempt} key={snapshot.selectedClass!.id+lesson.id} snapshot={snapshot} lesson={lesson} prompt={prompt} setPrompt={setPrompt} promptRef={promptRef} insert={insert} run={run} busy={busy} attempt={attempt} scoreCard={scoreCard} unlock={setUnlock} onAction={action} navigate={navigate}/>{unlockDialog()}{error&&<p role="alert" className="fixed bottom-4 right-4 bg-red-50 text-red-800 p-4 rounded-xl z-[70]">{error}</p>}{currentUi===7&&<ProductionJudgeSource evaluation={evaluation} passThreshold={Number(lesson.studio?.awards?.passThreshold??8)} busy={busy||!attempt} judge={()=>action('judge',{lessonId:lesson.id,attemptId:attempt?.id})} onClose={()=>navigate(5)} insertHint={insert}/>} {currentUi===8&&(snapshot.sops.find(source=>source.id===sourceId)||snapshot.sops[0])&&<ProductionSopInspectorSource classId={snapshot.selectedClass!.id} source={snapshot.sops.find(source=>source.id===sourceId)||snapshot.sops[0]} onClose={()=>navigate(5)}/>}</>);
  if(currentUi===4&&snapshot)return scoped(<ProductionHub busy={busy} onAction={action} key={snapshot.selectedClass?.id} snapshot={snapshot} navigate={navigate} onOpen={id=>{setLessonId(id);setPrompt(snapshot.drafts?.find(d=>d.lesson_id===id)?.prompt||authoredLessonText(snapshot.lessons.find(l=>l.id===id)?.starter_prompt,'en')||'');navigate(5);}}/>);
  if(currentUi===3||session&&snapshot&&!accessible)return <ProductionEntry3 email={session?.user.email} viewDenied={!!snapshot&&!accessible} onHome={()=>navigate(profileHome)}/>;
  return <div className="prod-app"><header className="prod-header"><a href="?ui=00" onClick={e=>{e.preventDefault();navigate(0);}}><PromptifyMark className="h-9 w-9"/><strong>Promptify</strong></a><div><button onClick={()=>setProductLanguage(language==='en'?'vi':'en')}>{language.toUpperCase()} / {language==='en'?'VI':'EN'}</button>{session&&<button onClick={()=>void supabase.auth.signOut()}>{t('signOut')}</button>}</div></header>
    {snapshot&&<nav className="prod-nav"><select disabled={busy} aria-label={pair('Select class','Chọn lớp')} value={classId||''} onChange={e=>{requestedClass.current=e.target.value;setClassId(e.target.value);setLessonId(undefined);setSelectedAttempt(undefined);setVersions([]);setPrompt('');void refresh(e.target.value);}}>{snapshot.classes.map(c=><option key={c.id} value={c.id}>{c.class_code} · {c.department}</option>)}</select>{(isLearner?[4,5,6,7,8,13]:snapshot.profile.role==='head'?[12,13]:snapshot.profile.role==='admin'?[9,10,11,12,13,14,15]:[9,10,11,12,13,15]).map(i=><button key={i} aria-current={currentUi===i?'page':undefined} onClick={()=>navigate(i)}>{titlePairs[i][language==='en'?0:1]}</button>)}</nav>}
    <main className="prod-shell"><h1>{titlePairs[currentUi][language==='en'?0:1]}</h1>{error&&<div role="alert" className="prod-error">{error}<button onClick={()=>void refresh(classId)}>{t('refresh')}</button></div>}{notice&&<p role="status" className="prod-notice">{notice}</p>}
    {currentUi===0&&<section className="prod-hero"><p>Promptify · Intrepid</p><h2>{pair('Output is the destination. Prompting is the means.','Kết quả là đích đến. Prompt là phương tiện.')}</h2><p>{pair('Practice real business tasks with authorized SOP context and evidence-based AI feedback.','Thực hành nhiệm vụ công việc với SOP được cấp quyền và phản hồi AI dựa trên bài làm.')}</p><button className="prod-primary" onClick={()=>navigate(session?4:1)}>{pair('Start learning','Bắt đầu học')}</button></section>}
    {currentUi===1&&<section className="prod-card prod-auth"><h2>{pair('Single Sign-On enforced','Yêu cầu đăng nhập SSO')}</h2><p>{t('signIn')}</p><button className="prod-primary" onClick={async()=>{setBusy(true);const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/production?ui=02'}});if(error)setError(error.message);setBusy(false);}} disabled={busy}>{pair('Continue with Google','Tiếp tục với Google')}</button><StagingLogin/></section>}
    {currentUi>=2&&!session&&<section className="prod-card"><p>{t('signIn')}</p><button onClick={()=>navigate(1)}>{pair('Sign in','Đăng nhập')}</button></section>}
    {session&&currentUi===2&&snapshot&&<section className="prod-card"><p>{snapshot.profile.email}</p><label>{pair('Full name','Họ tên')}<input value={fullName} onChange={e=>setFullName(e.target.value)}/></label><p>{snapshot.selectedClass?.department}</p><button disabled={busy||!fullName.trim()} onClick={()=>void action('confirmProfile',{fullName},()=>navigate(profileHome))}>{pair('Confirm profile','Xác nhận hồ sơ')}</button><label>{pair('Request a correction','Yêu cầu sửa hồ sơ')}<textarea value={reason} onChange={e=>setReason(e.target.value)}/></label><button disabled={busy||!reason.trim()} onClick={()=>void action('profileCorrection',{reason,requestId:crypto.randomUUID()})}>{pair('Submit correction','Gửi yêu cầu sửa')}</button></section>}
    {(currentUi===3||session&&snapshot&&!accessible)&&<section className="prod-card"><p>{pair('Your verified account does not have access to this view.','Tài khoản đã xác thực của bạn chưa được cấp quyền vào màn hình này.')}</p></section>}
    {session&&snapshot&&accessible&&currentUi>=4&&<>{!snapshot.selectedClass?<p>{t('noClasses')}</p>:<>
      {editor&&[9,11,14,15].includes(currentUi)&&<ProductionCohorts snapshot={snapshot} busy={busy} onAction={action}/>}
      {currentUi===4&&<><section className="prod-grid"><div className="prod-card"><h2>{snapshot.profile.full_name}</h2><p>{snapshot.selectedClass.department}</p></div><div className="prod-card"><h2>{snapshot.analytics.attempts??0}</h2><p>{t('history')}</p></div><div className="prod-card"><h2>{snapshot.analytics.average_score?.toFixed(2)??'—'}/10</h2><p>{t('total')}</p></div></section><section className="prod-grid">{snapshot.lessons.map(l=><button className="prod-card" key={l.id} onClick={()=>{setLessonId(l.id);setPrompt(snapshot.drafts?.find(d=>d.lesson_id===l.id)?.prompt||l.starter_prompt||'');navigate(5);}}><strong>{l.lesson_key} · {l.title}</strong><p>{l.task_goal}</p></button>)}</section></>}
      {[5,6,7,8].includes(currentUi)&&<select aria-label={pair('Select Codelab','Chọn Codelab')} value={lesson?.id||''} onChange={e=>{setLessonId(e.target.value);setSelectedAttempt(undefined);}}>{snapshot.lessons.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select>}
      {currentUi===5&&lesson&&<ProductionWorkspace actionError={error} selectAttempt={setSelectedAttempt} key={snapshot.selectedClass.id+lesson.id} snapshot={snapshot} lesson={lesson} prompt={prompt} setPrompt={setPrompt} promptRef={promptRef} insert={insert} run={run} busy={busy} attempt={attempt} scoreCard={scoreCard} unlock={setUnlock} onAction={action} navigate={navigate}/>}
      {currentUi===6&&<ProductionCompare key={lesson?.id} attempts={attempts} restore={(value:string,id?:string)=>{setPrompt(value);if(id)setSelectedAttempt(id);navigate(5);}}/>}
      {currentUi===7&&<><select value={attempt?.id||''} onChange={e=>setSelectedAttempt(e.target.value)}>{attempts.map(a=><option key={a.id} value={a.id}>#{a.attempt_number} · {new Date(a.created_at).toLocaleString()}</option>)}</select>{scoreCard()}</>}
      {currentUi===8&&<><select value={sourceId} onChange={e=>setSourceId(e.target.value)}><option value="">{t('sources')}</option>{snapshot.sops.map(s=><option key={s.id} value={s.id}>{s.title} · v{s.version}</option>)}</select>{snapshot.sops.filter(s=>s.id===sourceId).map(s=><section key={s.id} className="prod-card"><h2>{s.title}</h2><code>{s.citation}</code><button onClick={()=>void navigator.clipboard.writeText(s.citation)}>{pair('Copy citation','Sao chép trích dẫn')}</button><MarkdownView content={s.content}/></section>)}</>}
      {currentUi===9&&<ProductionWorkshop key={snapshot.selectedClass.id} snapshot={snapshot} busy={busy} onAction={action} navigate={navigate}/>}
      {currentUi===10&&<><select value={learnerId} onChange={e=>setLearnerId(e.target.value)}><option value="">{pair('Select learner','Chọn học viên')}</option>{snapshot.learners.map(l=><option key={l.id} value={l.id}>{l.full_name}</option>)}</select>{snapshot.attempts.filter(a=>a.learner_id===learnerId).map(a=><section className="prod-card" key={a.id}><h2>#{a.attempt_number}</h2><pre>{a.prompt_text}</pre><MarkdownView content={a.ai_output}/><label>{pair('Trainer note / reason','Ghi chú / lý do của giảng viên')}<textarea value={reason} onChange={e=>setReason(e.target.value)}/></label><button disabled={busy||!reason.trim()} onClick={()=>void action('trainerAction',{attemptId:a.id,requestId:crypto.randomUUID(),kind:'note',reason})}>{pair('Save note','Lưu ghi chú')}</button></section>)}<label>{pair('Private coaching','Hướng dẫn riêng')}<textarea value={message} onChange={e=>setMessage(e.target.value)}/></label><button disabled={busy||!learnerId||!message.trim()} onClick={()=>void action('privateHint',{learnerId,message})}>{pair('Send coaching','Gửi hướng dẫn')}</button></>}
      {currentUi===11&&<ProductionStudio key={snapshot.selectedClass.id} snapshot={snapshot} busy={busy} onAction={action}/>}
      {currentUi===12&&<ProductionAnalytics key={snapshot.selectedClass.id} snapshot={snapshot}/>}
      {currentUi===13&&<ProductionSop snapshot={snapshot} busy={busy} onAction={action}/>}
      {currentUi===14&&<ProductionGovernance key={snapshot.selectedClass.id} snapshot={snapshot} busy={busy} onAction={action}/>}
      {currentUi===15&&<ProductionRoster key={snapshot.selectedClass.id} snapshot={snapshot} busy={busy} onAction={action}/>}
    </>}</>}
    {session&&snapshot?.messages.map((m:any)=><aside className="prod-notice" key={m.id}>{m.message}</aside>)}{session&&snapshot?.privateHints.map((m:any)=><aside className="prod-notice" key={m.id}>{m.message}</aside>)}
    </main>{unlockDialog()}</div>;
}
