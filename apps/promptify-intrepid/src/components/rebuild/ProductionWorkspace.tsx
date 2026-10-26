import {startLearningTelemetry} from '../../services/learningTelemetryService';
import ProductionWorkspaceSource from './ProductionWorkspaceV7';
import React,{useEffect,useRef,useState} from 'react';
import {BookOpen,Search,ShieldAlert,Sparkles,History,PanelLeftClose} from 'lucide-react';
import type {ProductSnapshot,ProductLesson,ProductAttempt} from '../../types/production';
import {productText as t,useProductLanguage} from '../../services/productI18nService';
import {productRequest,ProductRequestError,type JudgeCriterionProgress} from '../../services/productionClientService';
import {piiSignals,scrubPrompt} from '../../services/piiGuardService';
import {MarkdownView} from '../common/MarkdownView';
import {ProductDialog} from '../common/ProductDialog';
export type Props={streamText?:string;executionPhase?:'generating'|'judging';judgeProgress?:'queued'|'running'|'retry_wait';liveCriteria?:JudgeCriterionProgress[];judgeGraded?:number;actionError?:string;selectAttempt?:(id:string)=>void;snapshot:ProductSnapshot;lesson:ProductLesson;prompt:string;setPrompt:(v:string)=>void;promptRef:React.RefObject<HTMLTextAreaElement|null>;insert:(v:string)=>void;run:(settings?:unknown,contextIds?:string[],variableValues?:Record<string,string>)=>void;busy:boolean;attempt:ProductAttempt|undefined;scoreCard:()=>React.ReactNode;unlock:(kind:'hints'|'solution')=>void;onAction:(name:string,payload?:Record<string,unknown>,after?:(v:any)=>void)=>Promise<void>;navigate:(ui:number,sourceId?:string)=>void};
export default function ProductionWorkspace({snapshot,lesson,prompt,setPrompt,promptRef,insert,run,busy,attempt,scoreCard,unlock,onAction,navigate,selectAttempt,actionError,executionPhase,judgeProgress,liveCriteria,judgeGraded,streamText}:Props){
 const telemetryRoot=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(snapshot.feedbackAvailable&&telemetryRoot.current)return startLearningTelemetry(telemetryRoot.current,snapshot.selectedClass!.id,lesson.id);},[snapshot.feedbackAvailable,snapshot.selectedClass?.id,lesson.id]);
 const lang=useProductLanguage(),p=(en:string,vi:string)=>lang==='en'?en:vi;
 const [taskTab,setTaskTab]=useState('task'),[mobileTab,setMobileTab]=useState('compose'),[collapsed,setCollapsed]=useState(false),[drawer,setDrawer]=useState(false),[query,setQuery]=useState(''),[results,setResults]=useState<any[]>([]),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState(''),[draftStatus,setDraftStatus]=useState('saved');
 const draft=snapshot.drafts?.find(d=>d.lesson_id===lesson.id),revision=useRef(draft?.revision||0),savedPrompt=useRef(draft?.prompt||''),draftSaving=useRef(false);
 const [saveCycle,setSaveCycle]=useState(0);
 const [chip,setChip]=useState<string|null>(null);
 const signals=piiSignals(prompt),sources=snapshot.sops.filter(s=>s.lessonIds.includes(lesson.id));
 useEffect(()=>{if(!prompt)setPrompt(draft?.prompt||lesson.starter_prompt||'');},[]);
 useEffect(()=>{if(prompt===savedPrompt.current)return;setDraftStatus('pending');const timer=setTimeout(async()=>{if(draftSaving.current)return;draftSaving.current=true;setDraftStatus('saving');try{const value=await productRequest<number>('saveDraft',{classId:snapshot.selectedClass!.id,lessonId:lesson.id,prompt,expectedRevision:revision.current});revision.current=value;savedPrompt.current=prompt;setDraftStatus('saved');setSaveCycle(c=>c+1);}catch(error){setDraftStatus(error instanceof ProductRequestError&&error.status===409?'conflict':'error');}finally{draftSaving.current=false;}},1500);return()=>clearTimeout(timer);},[prompt,snapshot.selectedClass?.id,lesson.id,saveCycle]);
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.ctrlKey&&e.code==='Backslash'){e.preventDefault();setDrawer(open=>!open);}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[]);
 const search=async()=>{if(searching)return;setSearching(true);setSearchError('');try{setResults(await productRequest('searchSop',{classId:snapshot.selectedClass?.id,lessonId:lesson.id,query}));}catch(e){setSearchError((e as Error).message);}finally{setSearching(false);}};
 const resolveDraft=async(keepLocal:boolean)=>{if(draftSaving.current)return;try{const latest=await productRequest<ProductSnapshot>('snapshot',{classId:snapshot.selectedClass!.id});const current=latest.drafts?.find(row=>row.lesson_id===lesson.id);revision.current=current?.revision||0;savedPrompt.current=current?.prompt||'';if(!keepLocal)setPrompt(savedPrompt.current);setDraftStatus(keepLocal?'pending':'saved');setSaveCycle(c=>c+1);}catch{setDraftStatus('error');}};
 const activeChip=lesson.studio?.scaffold.find(c=>c.id===chip);
 const taskTabs=[{id:'task',label:p('Task','Nhiệm vụ')},{id:'theory',label:p('Theory','Lý thuyết')},{id:'hints',label:p('Hints','Gợi ý')},{id:'solution',label:p('Solution','Lời giải')}];
 return <div ref={telemetryRoot}><ProductionWorkspaceSource {...{snapshot,lesson,prompt,setPrompt,promptRef,insert,run,busy,attempt,scoreCard,unlock,onAction,navigate,collapsed,setCollapsed,mobileTab,setMobileTab,drawer,setDrawer,query,setQuery,results,search,searching,searchError,signals,draftStatus,resolveDraft,selectAttempt,actionError,executionPhase,judgeProgress,liveCriteria,judgeGraded,streamText}}/></div>;
}
