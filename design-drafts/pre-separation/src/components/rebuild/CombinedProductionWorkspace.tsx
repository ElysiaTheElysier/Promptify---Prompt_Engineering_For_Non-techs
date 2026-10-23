import React,{useMemo,useRef,useState,useEffect} from 'react';
import {HybridView,HybridRuntime} from '../hybrid/HybridView';
import {LessonHeaderBar} from '../lesson/LessonHeaderBar';
import {ProductNavbar} from '../navigation/ProductNavbar';
import {combinedLab,combinedCohort,combinedLearner} from '../../services/combinedUiAdapter';
import {productRequest} from '../../services/productionClientService';
import {supabase} from '../../services/supabaseClient';
import {useProductLanguage,setProductLanguage} from '../../services/productI18nService';
import {piiSignals} from '../../services/piiGuardService';
import type {WeightedEvaluation,ProductAttempt} from '../../types/production';
import type {AiEvaluationResult} from '../../types/database';
import type {Props} from './ProductionWorkspace';
function evaluationAdapter(value:WeightedEvaluation,lang:'en'|'vi'):AiEvaluationResult {
 const score=(key:string)=>{const c=value.criteria.find(row=>row.key===key);return c&&c.max>0?c.score/c.max*2:0;},f=value.feedback?.[lang];
 return {total:value.total,scores:{taskCompletion:score('taskCompletion'),groundedness:score('groundedness'),formatAdherence:score('formatAdherence'),constraintCompliance:score('constraintCompliance'),businessUsability:score('businessUsability')},strengths:f?.strengths||value.strengths,improvements:f?.improvements||value.improvements,nextHint:f?.nextHint||value.nextHint};
}
export default function CombinedProductionWorkspace(props:Props){
 const {snapshot,lesson,navigate}=props,lang=useProductLanguage(),labs=useMemo(()=>snapshot.lessons.map(combinedLab),[snapshot.lessons]),cohort=combinedCohort(snapshot.selectedClass!),learner=combinedLearner(snapshot),cache=useRef(new Map<string,ProductAttempt>()),[renderTick,setRenderTick]=useState(0),request=useRef<{prompt:string;id:string}|null>(null),draftRevision=useRef(snapshot.drafts?.find(d=>d.lesson_id===lesson.id)?.revision||0),[draftStatus,setDraftStatus]=useState('saved'),lastDraft=useRef(props.prompt),[draftPrompt,setDraftPrompt]=useState(props.prompt);
 useEffect(()=>{for(const a of snapshot.attempts)cache.current.set(a.id,a);},[snapshot.attempts]);
 useEffect(()=>{if(draftPrompt===lastDraft.current)return;const timer=setTimeout(()=>{setDraftStatus('saving');void productRequest<number>('saveDraft',{classId:cohort.id,lessonId:lesson.id,prompt:draftPrompt,expectedRevision:draftRevision.current}).then(revision=>{draftRevision.current=revision;lastDraft.current=draftPrompt;setDraftStatus('saved');}).catch(()=>setDraftStatus('conflict'));},1500);return()=>clearTimeout(timer);},[draftPrompt,cohort.id,lesson.id]);
 const runtime:HybridRuntime={
  initialPrompt:props.prompt,onPromptChange:value=>{setDraftPrompt(value);props.setPrompt(value);},blocked:props.busy||snapshot.controls.state!=='active',passThreshold:Number(lesson.studio?.awards.passThreshold??8),adaptEvaluation:value=>evaluationAdapter(value,lang),
  loadAttempts:async(_learner,_class,id)=>snapshot.attempts.filter(a=>a.lesson_ref_id===id).map(a=>({...a,lesson_id:a.lesson_ref_id})),
  execute:async(prompt,_system,lab,_config,onChunk)=>{
   if(snapshot.controls.state!=='active'||piiSignals(prompt).length)throw new Error(lang==='en'?'Session paused or sensitive data detected.':'Buổi học bị khóa hoặc phát hiện dữ liệu nhạy cảm.');
   if(request.current?.prompt!==prompt)request.current={prompt,id:crypto.randomUUID()};
   const result=await productRequest<any>('generate',{classId:cohort.id,lessonId:lab.id,prompt,requestId:request.current!.id});
   if(result.saved?.attempt)cache.current.set(result.saved.attempt.id,result.saved.attempt);setRenderTick(v=>v+1);onChunk(result.output);
   return {...result,mode:'gemini',tokenCount:result.tokens??result.tokenCount??0,latencyMs:result.latencyMs??0};
  },
  evaluate:async body=>{const evaluation=await productRequest<WeightedEvaluation>('judge',{classId:cohort.id,lessonId:body.lessonId,attemptId:body.attemptId});const row=cache.current.get(body.attemptId||'');if(row)cache.current.set(row.id,{...row,evaluation_json:evaluation});setRenderTick(v=>v+1);return evaluationAdapter(evaluation,lang);},
  unlock:async(id,kind)=>{await productRequest('unlockSupport',{classId:cohort.id,lessonId:id,kind:kind==='hint'?'hints':'solution'});},
  renderEvaluation:id=>{const value=cache.current.get(id||'')?.evaluation_json,f=value?.feedback?.[lang];return value?<section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4"><div className="flex justify-between"><h3 className="font-bold text-slate-900">AI Judge · {value.total}/10</h3><button className="text-sm text-emerald-700" onClick={()=>navigate(7)}>{lang==='en'?'Open scorecard':'Mở bảng điểm'}</button></div>{value.criteria.map(c=><div key={c.key} className="border-b border-slate-200 pb-3"><div className="flex justify-between text-sm"><strong>{c.label} · {c.weight}%</strong><span>{c.score}/{c.max}</span></div><p className="text-xs text-slate-600 mt-1">{f?.criteriaReasons[c.key]||c.reason}</p></div>)}<p className="text-sm">{f?.nextHint||value.nextHint}</p></section>:null;}
 };
 const config={mode:'live' as const,model:snapshot.attempts[0]?.model||'Gemini',temperature:0.3};
 return <div className="min-h-screen bg-slate-50 text-slate-900" data-combined-ui="UI-05"><ProductNavbar currentView="lesson" selectedCohort={cohort} availableCohorts={snapshot.classes.map(combinedCohort)} learner={learner} onSelectClass={async()=>false} onChangeClass={()=>navigate(4)} onNavigate={view=>navigate(view==='history'?6:view==='library'?8:4)} onLogout={()=>void supabase.auth.signOut()}/><LessonHeaderBar cohort={cohort} activeLab={combinedLab(lesson,0)} currentMode="hybrid" onSelectMode={()=>{}} onBackToDashboard={()=>navigate(4)} onOpenTutorial={()=>navigate(8)} onOpenPromptLibrary={()=>navigate(8)} onOpenHistory={()=>navigate(6)} apiConfig={config} onOpenApiModal={()=>navigate(8)}/><div className="max-w-[1560px] mx-auto px-6 py-2 flex justify-between text-xs"><span role="status">{draftStatus==='saved'?(lang==='en'?'Draft saved':'Đã lưu nháp'):draftStatus==='saving'?(lang==='en'?'Saving draft…':'Đang lưu nháp…'):(lang==='en'?'Draft conflict: reload before editing further.':'Xung đột bản nháp: tải lại trước khi sửa tiếp.')}</span><button onClick={()=>setProductLanguage(lang==='en'?'vi':'en')}>{lang.toUpperCase()} / {lang==='en'?'VI':'EN'}</button></div>{snapshot.messages.map(m=><p className="mx-6 mb-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm" key={m.id}>{m.message}</p>)}{snapshot.privateHints.map(h=><p className="mx-6 mb-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm" key={h.id}>{h.message}</p>)}<HybridView labs={labs} apiConfig={config} currentClassId={cohort.id} currentLearnerId={learner.id} initialLabId={lesson.id} runtime={runtime} onRecordRun={()=>void props.onAction('snapshot')} onOpenCompare={()=>navigate(6)} onOpenTutorial={()=>navigate(8)} onOpenApiModal={()=>navigate(8)}/></div>;
}
